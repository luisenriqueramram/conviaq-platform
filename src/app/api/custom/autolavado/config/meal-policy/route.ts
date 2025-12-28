import { NextRequest, NextResponse } from 'next/server';
import { requireAutolavadoAdmin } from '@/lib/server/autolavado-guard';
import { queryAutolavado } from '@/lib/db-autolavado';

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireAutolavadoAdmin();

    const result = await queryAutolavado(
      `SELECT 
        id,
        base_start_local,
        base_end_local,
        duration_min,
        flex_before_min,
        flex_after_min,
        applies_to_all_workers,
        is_enabled
       FROM meal_policy 
       WHERE tenant_id = $1 
       LIMIT 1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(null);
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching meal policy:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { tenantId } = await requireAutolavadoAdmin();
    const body = await req.json();
    const {
      base_start_local,
      base_end_local,
      duration_min,
      flex_before_min,
      flex_after_min,
      is_enabled,
    } = body;

    // Solo UPDATE
    const result = await queryAutolavado(
      `UPDATE meal_policy 
       SET base_start_local = $2,
           base_end_local = $3,
           duration_min = $4,
           flex_before_min = $5,
           flex_after_min = $6,
           is_enabled = $7,
           updated_at = NOW()
       WHERE tenant_id = $1
       RETURNING *`,
      [
        tenantId,
        base_start_local,
        base_end_local,
        duration_min ?? 60,
        flex_before_min ?? 15,
        flex_after_min ?? 15,
        is_enabled ?? true,
      ]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating meal policy:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
