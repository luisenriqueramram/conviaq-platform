import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSuperAdminOrPlan10 } from '@/lib/server/session';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function ensureUniqueSlug(baseSlug: string, tenantId?: number): Promise<string> {
  let slug = baseSlug;
  let suffix = 1;
  while (true) {
    const { rows } = await db.query(
      tenantId
        ? `SELECT 1 FROM tenants WHERE slug = $1 AND id != $2 LIMIT 1`
        : `SELECT 1 FROM tenants WHERE slug = $1 LIMIT 1`,
      tenantId ? [slug, tenantId] : [slug]
    );
    if (rows.length === 0) return slug;
    suffix++;
    slug = `${baseSlug}-${suffix}`;
  }
}

function normalizePhone(phone: string): string {
  let p = phone.trim();
  if (!p.startsWith('+')) p = '+' + p;
  // Si solo tiene +52 y 10 dígitos (México), forzar +521
  if (p.match(/^\+52\d{10}$/)) p = p.replace(/^\+52/, '+521');
  return p;
}

type ProvisionInput = {
  // tenants
  tenant_name: string;
  plan_id: number;
  // channel_accounts
  account_type: 'business' | 'personal';
  phone_e164: string;
  wa_business_account_id: string; // instance_name
  // users
  user_name: string;
  user_email: string;
  user_password?: string;
  // bot_profiles
  bot_name: string;
  bot_tone: string;
  bot_attitude: string;
  bot_purpose: string;
  // workflows (array)
  workflows?: Array<{
    key: string;
    name: string;
    description?: string;
    is_active?: boolean;
  }>;
  // edit mode
  tenant_id?: number;
};

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireSuperAdminOrPlan10();
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: ProvisionInput;
  try {
    body = await request.json();
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.tenant_name) {
    return NextResponse.json({ ok: false, error: 'tenant_name is required' }, { status: 400 });
  }
  if (!body.plan_id) {
    return NextResponse.json({ ok: false, error: 'plan_id is required' }, { status: 400 });
  }
  if (!body.wa_business_account_id) {
    return NextResponse.json({ ok: false, error: 'wa_business_account_id is required' }, { status: 400 });
  }
  if (!body.user_email) {
    return NextResponse.json({ ok: false, error: 'user_email is required' }, { status: 400 });
  }

  const isEdit = Boolean(body.tenant_id);
  const tenantId = body.tenant_id;

  if (isEdit && ctx.isPlan10 && Number(ctx.session.tenantId) !== tenantId) {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  // DEBUG: Log password info
  console.log('[PROVISION] Mode:', isEdit ? 'EDIT' : 'CREATE');
  console.log('[PROVISION] user_password received:', body.user_password ? `YES (${body.user_password.length} chars)` : 'NO');
  console.log('[PROVISION] user_password value:', body.user_password);

  const phoneNorm = normalizePhone(body.phone_e164);

  try {
    await db.query('BEGIN');

    let tid: number;
    let channelAccountId: number | null = null;
    let pipelineId: number | null = null;

    if (isEdit) {
      // EDIT MODE
      tid = tenantId!;

      // Update tenants (name, plan_id)
      await db.query(
        `UPDATE tenants SET name = $1, plan_id = $2, updated_at = NOW() WHERE id = $3`,
        [body.tenant_name, body.plan_id, tid]
      );

      // Update channel_accounts (phone, account_type, wa_business_account_id)
      const chRes = await db.query(
        `UPDATE channel_accounts
         SET phone_e164 = $1, account_type = $2, wa_business_account_id = $3, provider_account_id = $3
         WHERE tenant_id = $4 AND channel_type = 'whatsapp' AND is_default = true
         RETURNING id`,
        [phoneNorm, body.account_type, body.wa_business_account_id, tid]
      );
      if (chRes.rows.length > 0) channelAccountId = chRes.rows[0].id;

      // Update users (name, email, password_hash)
      // Build update query conditionally
      if (body.user_password && body.user_password.trim().length > 0) {
        // Update with password
        console.log('[PROVISION] Updating user WITH password:', body.user_password);
        const updateRes = await db.query(
          `UPDATE users SET name = $1, email = $2, password_hash = $3, updated_at = NOW()
           WHERE tenant_id = $4 AND (role = 'tenant' OR role IS NULL)
           RETURNING id, email, password_hash`,
          [body.user_name, body.user_email, body.user_password, tid]
        );
        console.log('[PROVISION] Updated rows:', updateRes.rowCount);
        console.log('[PROVISION] Updated user:', updateRes.rows[0]);
      } else {
        // Update without password
        console.log('[PROVISION] Updating user WITHOUT password');
        const updateRes = await db.query(
          `UPDATE users SET name = $1, email = $2, updated_at = NOW()
           WHERE tenant_id = $3 AND (role = 'tenant' OR role IS NULL)
           RETURNING id, email`,
          [body.user_name, body.user_email, tid]
        );
        console.log('[PROVISION] Updated rows:', updateRes.rowCount);
      }

      // Update bot_profiles (name, tone, attitude, purpose)
      await db.query(
        `UPDATE bot_profiles
         SET name = $1, tone = $2, attitude = $3, purpose = $4, updated_at = NOW()
         WHERE tenant_id = $5`,
        [body.bot_name, body.bot_tone, body.bot_attitude, body.bot_purpose, tid]
      );

      // Update workflows if provided
      if (body.workflows && body.workflows.length > 0) {
        for (const wf of body.workflows) {
          await db.query(
            `INSERT INTO workflows (tenant_id, key, name, description, is_active, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (tenant_id, key) DO UPDATE SET
               name = EXCLUDED.name,
               description = EXCLUDED.description,
               is_active = EXCLUDED.is_active`,
            [tid, wf.key, wf.name, wf.description || '', wf.is_active ?? true]
          );
        }
      }

      // Get pipeline_id
      const pipRes = await db.query(`SELECT id FROM pipelines WHERE tenant_id = $1 AND is_default = true LIMIT 1`, [tid]);
      if (pipRes.rows.length > 0) pipelineId = pipRes.rows[0].id;
    } else {
      // CREATE MODE
      const baseSlug = slugify(body.tenant_name);
      const slug = await ensureUniqueSlug(baseSlug);

      // Insert tenants
      const tRes = await db.query(
        `INSERT INTO tenants (name, slug, plan_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'active', NOW(), NOW())
         RETURNING id`,
        [body.tenant_name, slug, body.plan_id]
      );
      tid = tRes.rows[0].id;

      // Insert tenant_runtime_state (check first, then insert or update)
      const runtimeRes = await db.query(
        `SELECT 1 FROM tenant_runtime_state WHERE tenant_id = $1 LIMIT 1`,
        [tid]
      );
      
      if (runtimeRes.rows.length === 0) {
        // Insert new record
        await db.query(
          `INSERT INTO tenant_runtime_state (
            tenant_id,
            human_outbound_ai_behavior,
            human_outbound_cooldown_minutes,
            ai_force_off,
            ai_disabled_until,
            ai_disabled_reason,
            welcome_enabled,
            welcome_message,
            reengagement_enabled,
            reengagement_after_days,
            updated_at
          ) VALUES ($1, 'none', 0, false, null, 'manual', false, null, false, null, NOW())`,
          [tid]
        );
      }

      // Insert channel_accounts
      const chRes = await db.query(
        `INSERT INTO channel_accounts (
          tenant_id,
          channel_type,
          provider,
          account_type,
          account_label,
          phone_e164,
          wa_business_account_id,
          wa_phone_number_id,
          provider_account_id,
          integration_id,
          is_default,
          is_active,
          created_at
        ) VALUES ($1, 'whatsapp', 'evolution', $2, null, $3, $4, null, $4, null, true, true, NOW())
        RETURNING id`,
        [tid, body.account_type, phoneNorm, body.wa_business_account_id]
      );
      channelAccountId = chRes.rows[0].id;

      // Insert users
      const userPassword = body.user_password && body.user_password.trim().length > 0 
        ? body.user_password 
        : body.user_name;
      await db.query(
        `INSERT INTO users (tenant_id, name, email, role, password_hash, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, 'tenant', $4, true, NOW(), NOW())`,
        [tid, body.user_name, body.user_email, userPassword]
      );

      // Insert bot_profiles
      const tools = { kb: false, email: false, media: false, calendar: false };
      const policies = {
        vibes: {
          tone: body.bot_tone,
          style_rules: { avoid_phrases: [], preferred_phrases: [] },
        },
        config: { mode: 'guided' },
        guided: {
          can_do: 'puede pedir datos',
          cannot_do: 'no puede dar información sensible',
          escalation: 'cuando no sepa que responder',
          procedures: 'saluda y pide nombre. sé amable',
          limitations: 'nada',
        },
        behavior: { never_do: [], always_do: [] },
        knowledge: { source: 'external_or_manual', raw_text: '' },
      };

      await db.query(
        `INSERT INTO bot_profiles (
          tenant_id,
          name,
          tone,
          attitude,
          purpose,
          is_active,
          ai_enabled,
          language,
          use_custom_prompt,
          custom_prompt,
          tools,
          policies,
          config_version,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, true, true, 'es-MX', false, '', $6, $7, 0, NOW(), NOW())`,
        [tid, body.bot_name, body.bot_tone, body.bot_attitude, body.bot_purpose, JSON.stringify(tools), JSON.stringify(policies)]
      );

      // Insert pipelines (upsert by tenant + name)
      const pipRes = await db.query(
        `SELECT id FROM pipelines WHERE tenant_id = $1 AND name = 'Flujo general' LIMIT 1`,
        [tid]
      );
      
      if (pipRes.rows.length === 0) {
        // Insert if doesn't exist
        const newPipRes = await db.query(
          `INSERT INTO pipelines (tenant_id, name, is_default, kind, created_at)
           VALUES ($1, 'Flujo general', true, 'sales', NOW())
           RETURNING id`,
          [tid]
        );
        pipelineId = newPipRes.rows[0]?.id || null;
      } else {
        pipelineId = pipRes.rows[0].id;
      }

      // Insert workflows (if provided)
      if (body.workflows && body.workflows.length > 0) {
        for (const wf of body.workflows) {
          await db.query(
            `INSERT INTO workflows (tenant_id, key, name, description, is_active, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [tid, wf.key, wf.name, wf.description || '', wf.is_active ?? true]
          );
        }
      }
    }

    await db.query('COMMIT');

    return NextResponse.json({
      ok: true,
      data: {
        tenant_id: tid,
        channel_account_id: channelAccountId,
        pipeline_id: pipelineId,
      },
    });
  } catch (err: any) {
    try {
      await db.query('ROLLBACK');
    } catch (_) {}
    const errorMsg = err?.message || String(err);
    const errorDetail = err?.detail || err?.hint || '';
    console.error('Error provisioning tenant:', errorMsg);
    console.error('Error detail:', errorDetail);
    console.error('Full error:', err);
    return NextResponse.json({ 
      ok: false, 
      error: errorMsg,
      detail: errorDetail,
      code: err?.code
    }, { status: 500 });
  }
}
