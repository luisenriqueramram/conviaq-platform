import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSuperAdminOrPlan10 } from '@/lib/server/session';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdminOrPlan10();
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { id } = await params;
  const tenantId = parseInt(id, 10);

  try {
    const { rows } = await db.query(
      `SELECT id, name, is_default, kind, created_at
       FROM pipelines
       WHERE tenant_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [tenantId]
    );

    return NextResponse.json({ ok: true, data: rows });
  } catch (err: any) {
    console.error('GET pipelines error:', err);
    return NextResponse.json(
      { ok: false, error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}
