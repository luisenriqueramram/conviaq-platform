import { NextResponse } from 'next/server';
import { requireSuperAdminOrPlan10 } from '@/lib/server/session';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  let ctx;
  try {
    ctx = await requireSuperAdminOrPlan10();
  } catch (e: any) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';

  try {
    const q = ctx.isPlan10
      ? `SELECT id, name, slug, plan_id, status, created_at, updated_at FROM tenants WHERE id = $2 AND (name ILIKE $1 OR slug ILIKE $1) ORDER BY id DESC LIMIT 200`
      : `SELECT id, name, slug, plan_id, status, created_at, updated_at FROM tenants WHERE name ILIKE $1 OR slug ILIKE $1 ORDER BY id DESC LIMIT 200`;
    const params = ctx.isPlan10 ? [`%${search}%`, Number(ctx.session.tenantId)] : [`%${search}%`];
    const res = await db.query(q, params);
    return NextResponse.json({ tenants: res.rows });
  } catch (err: any) {
    console.error('Superadmin: list tenants error', err);
    return NextResponse.json({ error: err.message || 'error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireSuperAdminOrPlan10();
  } catch (e: any) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const name = body?.tenant?.name || body?.name;
    const slug = body?.tenant?.slug || (name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : null);
    const plan_id = body?.tenant?.plan_id ?? null;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Missing tenant name or slug' }, { status: 400 });
    }

    // Create tenant + default pipeline + default stage in a transaction
    await db.query('BEGIN');
    const insert = await db.query(
      `INSERT INTO tenants (name, slug, plan_id, status, created_at, updated_at) VALUES ($1, $2, $3, 'active', NOW(), NOW()) RETURNING id, name, slug, plan_id, status`,
      [name, slug, plan_id]
    );
    const tenant = insert.rows[0];

    // Create a default pipeline and stage
    const pip = await db.query(
      `INSERT INTO pipelines (tenant_id, name, is_default, created_at) VALUES ($1, $2, true, NOW()) RETURNING id, name`,
      [tenant.id, 'Default']
    );
    const pipeline = pip.rows[0];

    await db.query(
      `INSERT INTO pipeline_stages (pipeline_id, name, stage_key, position, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
      [pipeline.id, 'New', 'new', 1]
    );

    await db.query('COMMIT');

    // Non-fatal: log event to `events` table if present (best-effort)
    (async () => {
      try {
        await db.query(`INSERT INTO events (tenant_id, event_type, payload, created_at) VALUES ($1, $2, $3, NOW())`, [tenant.id, 'superadmin_create_tenant', JSON.stringify({ tenant: { id: tenant.id, name: tenant.name } })]);
      } catch (e: any) {
        console.warn('Could not write event after tenant create (ignored):', e?.message || e);
      }
    })();

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (err: any) {
    try { await db.query('ROLLBACK'); } catch (_) {}
    console.error('Superadmin: create tenant error', err);
    return NextResponse.json({ error: err.message || 'error' }, { status: 500 });
  }
}
