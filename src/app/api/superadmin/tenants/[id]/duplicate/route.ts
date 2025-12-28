import { NextResponse } from 'next/server';
import { requireSuperAdminOrPlan10 } from '@/lib/server/session';
import { db } from '@/lib/db';

export async function POST(request: Request, context: { params: any }) {
  const raw = (context as any)?.params;
  const p = raw && typeof raw.then === 'function' ? await raw : raw;
  const id = Number(p?.id);
  if (!id) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  try {
    const ctx = await requireSuperAdminOrPlan10();
    if (ctx.isPlan10 && Number(ctx.session.tenantId) !== id) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    // Begin transaction
    await db.query('BEGIN');

    const tRes = await db.query('SELECT * FROM tenants WHERE id = $1', [id]);
    const tenant = tRes.rows[0];
    if (!tenant) {
      await db.query('ROLLBACK');
      return NextResponse.json({ error: 'tenant not found' }, { status: 404 });
    }

    const timestamp = Date.now();
    const newName = `${tenant.name} (copy)`;
    const newSlug = `${tenant.slug || ('tenant-' + tenant.id)}-copy-${timestamp}`;

    const ins = await db.query(
      `INSERT INTO tenants (name, slug, plan_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, name, slug, plan_id, status`,
      [newName, newSlug, tenant.plan_id ?? null, tenant.status || 'active']
    );
    const newTenant = ins.rows[0];

    // Copy pipelines and stages
    const pipelines = (await db.query('SELECT * FROM pipelines WHERE tenant_id = $1', [id])).rows;
    for (const p of pipelines) {
      const pIns = await db.query(
        `INSERT INTO pipelines (tenant_id, name, is_default, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id`,
        [newTenant.id, p.name, p.is_default]
      );
      const newPipelineId = pIns.rows[0].id;

      const stages = (await db.query('SELECT * FROM pipeline_stages WHERE pipeline_id = $1 ORDER BY position ASC', [p.id])).rows;
      for (const s of stages) {
        await db.query(
          `INSERT INTO pipeline_stages (pipeline_id, name, position, created_at) VALUES ($1, $2, $3, NOW())`,
          [newPipelineId, s.name, s.position]
        );
      }
    }

    await db.query('COMMIT');

    // log event (best-effort)
    (async () => {
      try {
        await db.query(`INSERT INTO events (tenant_id, event_type, payload, created_at) VALUES ($1, $2, $3, NOW())`, [newTenant.id, 'superadmin_duplicate_tenant', JSON.stringify({ from: id, to: newTenant.id })]);
      } catch (e: any) {
        console.warn('Could not write event after duplicate (ignored):', e?.message || e);
      }
    })();

    return NextResponse.json({ tenant: newTenant }, { status: 201 });
  } catch (err: any) {
    try { await db.query('ROLLBACK'); } catch (_) {}
    console.error('Superadmin: duplicate tenant error', err);
    return NextResponse.json({ error: err.message || 'error' }, { status: 500 });
  }
}
