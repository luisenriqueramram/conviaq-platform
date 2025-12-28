// src/app/api/custom/autolavado/zones/[id]/route.ts
import { NextResponse } from "next/server";
import { requireAutolavadoAdmin } from "@/lib/server/autolavado-guard";
import { queryAutolavado } from "@/lib/db-autolavado";
import type { Zone } from "@/types/autolavado";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await requireAutolavadoAdmin();
    const { id } = await params;
    const body = await req.json();

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(body.name);
    }
    if (body.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(body.is_active);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);
    values.push(tenantId);

    const query = `
      UPDATE zones 
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *
    `;

    const { rows } = await queryAutolavado<Zone>(query, values);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: rows[0] });
  } catch (error: any) {
    console.error("[Autolavado API] Update zone error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await requireAutolavadoAdmin();
    const { id } = await params;

    const query = `DELETE FROM zones WHERE id = $1 AND tenant_id = $2 RETURNING id`;
    const { rows } = await queryAutolavado(query, [id, tenantId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[Autolavado API] Delete zone error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
