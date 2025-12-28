import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSuperAdminOrPlan10 } from '@/lib/server/session';

async function getParamId(raw: any): Promise<number> {
  const p = raw && typeof raw.then === 'function' ? await raw : raw;
  const id = Number(p?.id);
  if (!Number.isFinite(id)) throw new Error('BAD_ID');
  return id;
}

// GET runtime state for a tenant
export async function GET(_req: Request, context: { params: any }) {
  try {
    const tenantId = await getParamId(context.params);
    const { session, isPlan10 } = await requireSuperAdminOrPlan10();
    if (isPlan10 && Number(session.tenantId) !== tenantId) {
      return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const { rows } = await db.query(
      `SELECT tenant_id,
              human_outbound_ai_behavior,
              human_outbound_cooldown_minutes,
              ai_force_off,
              welcome_enabled,
              welcome_message,
              reengagement_enabled,
              reengagement_after_days
       FROM tenant_runtime_state
       WHERE tenant_id = $1
       LIMIT 1`,
      [tenantId]
    );

    return NextResponse.json({ ok: true, data: rows[0] || null });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'FORBIDDEN' ? 403 : msg === 'BAD_ID' ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

// POST upsert runtime state
export async function POST(req: Request, context: { params: any }) {
  try {
    const tenantId = await getParamId(context.params);
    const { session, isPlan10 } = await requireSuperAdminOrPlan10();
    if (isPlan10 && Number(session.tenantId) !== tenantId) {
      return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
    }

    const body = await req.json();

    const human_outbound_ai_behavior = body?.human_outbound_ai_behavior ?? null;
    const human_outbound_cooldown_minutes = body?.human_outbound_cooldown_minutes ?? null;
    const ai_force_off = body?.ai_force_off ?? null;
    const welcome_enabled = body?.welcome_enabled ?? null;
    const welcome_message = body?.welcome_message ?? null;
    const reengagement_enabled = body?.reengagement_enabled ?? null;
    const reengagement_after_days = body?.reengagement_after_days ?? null;

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
        human_outbound_ai_behavior,
        human_outbound_cooldown_minutes,
        ai_force_off,
        welcome_enabled,
        welcome_message,
        reengagement_enabled,
        reengagement_after_days,
      ]
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const status = msg === 'UNAUTHORIZED' ? 401 : msg === 'FORBIDDEN' ? 403 : msg === 'BAD_ID' ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
