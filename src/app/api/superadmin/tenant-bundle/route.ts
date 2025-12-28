import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSuperAdminOrPlan10 } from '@/lib/server/session';

// Helper to slugify tenant names when slug not provided
function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// Types for incoming payload (best-effort, not exhaustive)
type TenantInput = {
  name: string;
  slug?: string;
  plan_id?: number | null;
  status?: string;
};

type FeatureInput = { feature_key: string; enabled?: boolean };

type RuntimeInput = {
  human_outbound_ai_behavior?: string | null;
  human_outbound_cooldown_minutes?: number | null;
  ai_force_off?: boolean | null;
  welcome_enabled?: boolean | null;
  welcome_message?: string | null;
  reengagement_enabled?: boolean | null;
  reengagement_after_days?: number | null;
};

type IntegrationInput = {
  key?: string; // alias to reference from channels/workflows
  type: string;
  name: string;
  config?: any;
  is_active?: boolean;
};

type ChannelInput = {
  channel_type: string;
  provider: string;
  account_label?: string | null;
  phone_e164?: string | null;
  wa_business_account_id?: string | null;
  wa_phone_number_id?: string | null;
  provider_account_id?: string | null;
  is_default?: boolean;
  is_active?: boolean;
  integration_key?: string; // link to IntegrationInput.key
};

type StageInput = {
  name: string;
  stage_key?: string | null;
  position?: number;
  color?: string | null;
  is_final?: boolean;
  description?: string | null;
  ai_criteria?: any;
};

type PipelineInput = {
  name: string;
  kind?: string | null;
  is_default?: boolean;
  stages?: StageInput[];
};

type TagInput = {
  name: string;
  color?: string | null;
  description?: string | null;
  rules_json?: any;
  is_system?: boolean;
};

type BotProfileInput = {
  ai_enabled?: boolean;
  tone?: string | null;
  attitude?: string | null;
  purpose?: string | null;
  language?: string | null;
  use_custom_prompt?: boolean;
  custom_prompt?: string | null;
  tools?: any;
  policies?: any;
};

type UserInput = {
  name: string;
  email: string;
  role: string;
  is_active?: boolean;
  password_hash?: string | null;
};

type WorkflowInput = {
  key: string;
  name: string;
  engine?: string | null;
  trigger_type?: string | null;
  trigger_filter?: any;
  integration_key?: string | null; // link to IntegrationInput.key
  is_active?: boolean;
};

type WorkflowAssignmentInput = {
  workflow_key: string; // link to WorkflowInput.key
  target_type?: string | null;
  target_filter?: any;
  is_active?: boolean;
};

type BundleRequest = {
  tenant: TenantInput;
  features?: FeatureInput[];
  runtime_state?: RuntimeInput;
  integrations?: IntegrationInput[];
  channels?: ChannelInput[];
  pipelines?: PipelineInput[];
  tags?: TagInput[];
  bot_profile?: BotProfileInput;
  users?: UserInput[];
  workflows?: WorkflowInput[];
  workflow_assignments?: WorkflowAssignmentInput[];
};

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireSuperAdminOrPlan10();
    if (ctx.isPlan10) {
      return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: BundleRequest;
  try {
    body = await request.json();
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body?.tenant?.name) {
    return NextResponse.json({ ok: false, error: 'tenant.name is required' }, { status: 400 });
  }

  const tenantPayload = body.tenant;
  const slug = tenantPayload.slug || slugify(tenantPayload.name);
  const planId = tenantPayload.plan_id ?? null;
  const status = tenantPayload.status || 'active';

  // Default seeds
  const defaultRuntime: RuntimeInput = {
    human_outbound_ai_behavior: null,
    human_outbound_cooldown_minutes: 10,
    ai_force_off: false,
    welcome_enabled: false,
    welcome_message: null,
    reengagement_enabled: false,
    reengagement_after_days: null,
  };

  const defaultPipeline: PipelineInput = {
    name: 'Default',
    kind: 'sales',
    is_default: true,
    stages: [
      { name: 'New', stage_key: 'new', position: 1, color: null, is_final: false, description: null, ai_criteria: null },
      { name: 'Contacted', stage_key: 'contacted', position: 2, color: null, is_final: false, description: null, ai_criteria: null },
      { name: 'Quoted', stage_key: 'quoted', position: 3, color: null, is_final: false, description: null, ai_criteria: null },
      { name: 'Scheduled', stage_key: 'scheduled', position: 4, color: null, is_final: false, description: null, ai_criteria: null },
      { name: 'Won', stage_key: 'won', position: 5, color: null, is_final: true, description: null, ai_criteria: null },
      { name: 'Lost', stage_key: 'lost', position: 6, color: null, is_final: true, description: null, ai_criteria: null },
    ],
  };

  const features = body.features || [];
  const runtime = { ...defaultRuntime, ...(body.runtime_state || {}) };
  const integrations = body.integrations || [];
  const channels = body.channels || [];
  const pipelines = body.pipelines && body.pipelines.length > 0 ? body.pipelines : [defaultPipeline];
  const tags = body.tags || [];
  const botProfile = body.bot_profile || { ai_enabled: true, tone: null, attitude: null, purpose: null, language: 'es', use_custom_prompt: false, custom_prompt: null, tools: null, policies: null };
  const users = body.users || [];
  const workflows = body.workflows || [];
  const workflowAssignments = body.workflow_assignments || [];

  const created: any = {
    tenant: null,
    features: [],
    runtime_state: null,
    integrations: [],
    channels: [],
    pipelines: [],
    stages: [],
    tags: [],
    bot_profile: null,
    users: [],
    workflows: [],
    workflow_assignments: [],
  };

  try {
    await db.query('BEGIN');

    // Tenant
    const tenantRes = await db.query(
      `INSERT INTO tenants (name, slug, plan_id, status, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, name, slug, plan_id, status`,
      [tenantPayload.name, slug, planId, status]
    );
    const tenant = tenantRes.rows[0];
    created.tenant = tenant;
    const tenantId = tenant.id;

    // Runtime state (upsert on tenant_id)
    await db.query(
      `INSERT INTO tenant_runtime_state (
        tenant_id,
        human_outbound_ai_behavior,
        human_outbound_cooldown_minutes,
        ai_force_off,
        welcome_enabled,
        welcome_message,
        reengagement_enabled,
        reengagement_after_days,
        created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        human_outbound_ai_behavior = EXCLUDED.human_outbound_ai_behavior,
        human_outbound_cooldown_minutes = EXCLUDED.human_outbound_cooldown_minutes,
        ai_force_off = EXCLUDED.ai_force_off,
        welcome_enabled = EXCLUDED.welcome_enabled,
        welcome_message = EXCLUDED.welcome_message,
        reengagement_enabled = EXCLUDED.reengagement_enabled,
        reengagement_after_days = EXCLUDED.reengagement_after_days`,
      [
        tenantId,
        runtime.human_outbound_ai_behavior ?? null,
        runtime.human_outbound_cooldown_minutes ?? null,
        runtime.ai_force_off ?? null,
        runtime.welcome_enabled ?? null,
        runtime.welcome_message ?? null,
        runtime.reengagement_enabled ?? null,
        runtime.reengagement_after_days ?? null,
      ]
    );
    created.runtime_state = { tenant_id: tenantId };

    // Features
    for (const f of features) {
      if (!f.feature_key) continue;
      const feat = await db.query(
        `INSERT INTO tenant_features (tenant_id, feature_key, enabled, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (tenant_id, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled
         RETURNING tenant_id, feature_key, enabled`,
        [tenantId, f.feature_key, f.enabled ?? true]
      );
      created.features.push(feat.rows[0]);
    }

    // Integrations
    const integrationMap = new Map<string, number>();
    for (const integ of integrations) {
      const resInteg = await db.query(
        `INSERT INTO integrations (tenant_id, type, name, config, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, name, type`,
        [tenantId, integ.type, integ.name, integ.config ?? {}, integ.is_active ?? true]
      );
      const row = resInteg.rows[0];
      created.integrations.push(row);
      const key = integ.key || integ.name;
      if (key) integrationMap.set(key, row.id);
    }

    // Channels (link to integration_id via integration_key if provided)
    for (const ch of channels) {
      const integrationId = ch.integration_key ? integrationMap.get(ch.integration_key) ?? null : null;
      const resCh = await db.query(
        `INSERT INTO channel_accounts (
          tenant_id,
          channel_type,
          provider,
          account_label,
          phone_e164,
          wa_business_account_id,
          wa_phone_number_id,
          provider_account_id,
          integration_id,
          is_default,
          is_active,
          created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
        RETURNING id, channel_type, provider, integration_id`,
        [
          tenantId,
          ch.channel_type,
          ch.provider,
          ch.account_label ?? null,
          ch.phone_e164 ?? null,
          ch.wa_business_account_id ?? null,
          ch.wa_phone_number_id ?? null,
          ch.provider_account_id ?? null,
          integrationId,
          ch.is_default ?? false,
          ch.is_active ?? true,
        ]
      );
      created.channels.push(resCh.rows[0]);
    }

    // Pipelines + stages
    for (const p of pipelines) {
      const pipRes = await db.query(
        `INSERT INTO pipelines (tenant_id, name, kind, is_default, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id, name, kind, is_default`,
        [tenantId, p.name, p.kind ?? 'sales', p.is_default ?? false]
      );
      const pipelineRow = pipRes.rows[0];
      created.pipelines.push(pipelineRow);
      const pipelineId = pipelineRow.id;
      const stages = (p.stages && p.stages.length > 0 ? p.stages : defaultPipeline.stages) as StageInput[];
      for (let idx = 0; idx < stages.length; idx++) {
        const s = stages[idx];
        if (!s || !s.name) continue; // Skip if no name
        const stageKey = s.stage_key || slugify(s.name || `stage-${idx + 1}`);
        const position = s.position ?? (idx + 1);
        const resStage = await db.query(
          `INSERT INTO pipeline_stages (
            pipeline_id,
            name,
            stage_key,
            position,
            color,
            is_final,
            description,
            ai_criteria,
            created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
          RETURNING id, pipeline_id, name, stage_key, position`,
          [
            pipelineId,
            s.name,
            stageKey || `stage-${idx + 1}`,
            position,
            s.color ?? null,
            s.is_final ?? false,
            s.description ?? null,
            s.ai_criteria ?? null,
          ]
        );
        created.stages.push(resStage.rows[0]);
      }
    }

    // Tags
    for (const t of tags) {
      const resTag = await db.query(
        `INSERT INTO tags (tenant_id, name, color, description, rules_json, is_system, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())
         RETURNING id, name`,
        [tenantId, t.name, t.color ?? null, t.description ?? null, t.rules_json ?? null, t.is_system ?? false]
      );
      created.tags.push(resTag.rows[0]);
    }

    // Bot profile (upsert by tenant)
    const botRes = await db.query(
      `INSERT INTO bot_profiles (
        tenant_id,
        ai_enabled,
        name,
        tone,
        attitude,
        purpose,
        language,
        use_custom_prompt,
        custom_prompt,
        tools,
        policies,
        created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        ai_enabled = EXCLUDED.ai_enabled,
        name = EXCLUDED.name,
        tone = EXCLUDED.tone,
        attitude = EXCLUDED.attitude,
        purpose = EXCLUDED.purpose,
        language = EXCLUDED.language,
        use_custom_prompt = EXCLUDED.use_custom_prompt,
        custom_prompt = EXCLUDED.custom_prompt,
        tools = EXCLUDED.tools,
        policies = EXCLUDED.policies
      RETURNING id, tenant_id` ,
      [
        tenantId,
        botProfile.ai_enabled ?? true,
        (botProfile as any).name ?? 'Default',
        botProfile.tone ?? null,
        botProfile.attitude ?? null,
        botProfile.purpose ?? null,
        botProfile.language ?? 'es',
        botProfile.use_custom_prompt ?? false,
        botProfile.custom_prompt ?? null,
        botProfile.tools ?? null,
        botProfile.policies ?? null,
      ]
    );
    created.bot_profile = botRes.rows[0];

    // Users
    for (const u of users) {
      if (!u.email) continue;
      const resUser = await db.query(
        `INSERT INTO users (tenant_id, name, email, role, is_active, password_hash, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())
         RETURNING id, email, role`,
        [tenantId, u.name, u.email, u.role, u.is_active ?? true, u.password_hash ?? null]
      );
      created.users.push(resUser.rows[0]);
    }

    // Workflows
    const workflowMap = new Map<string, number>();
    for (const w of workflows) {
      const integrationId = w.integration_key ? integrationMap.get(w.integration_key) ?? null : null;
      const resWf = await db.query(
        `INSERT INTO workflows (
          tenant_id,
          key,
          name,
          engine,
          trigger_type,
          trigger_filter,
          integration_id,
          is_active,
          created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
        RETURNING id, key, name`,
        [
          tenantId,
          w.key,
          w.name,
          w.engine ?? 'n8n',
          w.trigger_type ?? null,
          w.trigger_filter ?? null,
          integrationId,
          w.is_active ?? true,
        ]
      );
      const row = resWf.rows[0];
      created.workflows.push(row);
      workflowMap.set(w.key, row.id);
    }

    // Workflow assignments
    for (const wa of workflowAssignments) {
      const workflowId = workflowMap.get(wa.workflow_key);
      if (!workflowId) continue;
      const resWa = await db.query(
        `INSERT INTO workflow_assignments (
          workflow_id,
          tenant_id,
          target_type,
          target_filter,
          is_active,
          created_at
        ) VALUES ($1,$2,$3,$4,$5,NOW())
        RETURNING id, workflow_id, target_type`,
        [workflowId, tenantId, wa.target_type ?? null, wa.target_filter ?? null, wa.is_active ?? true]
      );
      created.workflow_assignments.push(resWa.rows[0]);
    }

    await db.query('COMMIT');

    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (err: any) {
    try {
      await db.query('ROLLBACK');
    } catch (_) {}
    console.error('Error creating tenant bundle', err);
    return NextResponse.json({ ok: false, error: err?.message || 'error' }, { status: 500 });
  }
}
