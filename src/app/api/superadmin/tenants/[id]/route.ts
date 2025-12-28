import { NextResponse } from 'next/server';
import { requireSuperAdminOrPlan10 } from '@/lib/server/session';
import { db } from '@/lib/db';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await context.params;
  const id = Number(idStr);
  if (!id) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  try {
    const ctx = await requireSuperAdminOrPlan10();
    if (ctx.isPlan10 && Number(ctx.session.tenantId) !== id) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const tenantRes = await db.query('SELECT id, name, slug, plan_id, status, created_at, updated_at FROM tenants WHERE id = $1', [id]);
    const tenant = tenantRes.rows[0] || null;
    if (!tenant) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // Basic bundle: tenant + pipelines + users counts (expand later)
    const pipelines = (await db.query('SELECT id, name, is_default FROM pipelines WHERE tenant_id = $1', [id])).rows;
    const users = (await db.query('SELECT id, name, email, role, is_active FROM users WHERE tenant_id = $1', [id])).rows;

    return NextResponse.json({ tenant, pipelines, users });
  } catch (err: any) {
    console.error('Superadmin: get tenant error', err);
    return NextResponse.json({ error: err.message || 'error' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await context.params;
  const id = Number(idStr);
  if (!id) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  try {
    const ctx = await requireSuperAdminOrPlan10();
    if (ctx.isPlan10 && Number(ctx.session.tenantId) !== id) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = body?.tenant?.name || body?.name;
    const slug = body?.tenant?.slug || body?.slug;
    const plan_id = body?.tenant?.plan_id ?? null;
    const status = body?.tenant?.status ?? null;

    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    let idx = 1;
    if (name) { fields.push(`name = \$${idx++}`); values.push(name); }
    if (slug) { fields.push(`slug = \$${idx++}`); values.push(slug); }
    if (plan_id !== undefined) { fields.push(`plan_id = \$${idx++}`); values.push(plan_id); }
    if (status) { fields.push(`status = \$${idx++}`); values.push(status); }

    if (fields.length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 });

    const q = `UPDATE tenants SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id, name, slug, plan_id, status`;
    values.push(id);

    const res = await db.query(q, values);
    const tenant = res.rows[0] || null;
    if (!tenant) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // Best-effort: write event to `events` table (non-fatal)
    (async () => {
      try {
        await db.query(`INSERT INTO events (tenant_id, event_type, payload, created_at) VALUES ($1, $2, $3, NOW())`, [tenant.id, 'superadmin_update_tenant', JSON.stringify({ tenant })]);
      } catch (e: any) {
        console.warn('Could not write event after tenant update (ignored):', e?.message || e);
      }
    })();

    return NextResponse.json({ tenant });
  } catch (err: any) {
    console.error('Superadmin: update tenant error', err);
    return NextResponse.json({ error: err.message || 'error' }, { status: 500 });
  }
}
