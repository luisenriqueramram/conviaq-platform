// src/app/api/custom/autolavado/workers/route.ts
import { NextResponse } from "next/server";
import { requireAutolavadoAdmin } from "@/lib/server/autolavado-guard";
import { queryAutolavado } from "@/lib/db-autolavado";
import type { Worker } from "@/types/autolavado";

export async function GET() {
  try {
    const { tenantId } = await requireAutolavadoAdmin();

    const query = `
      SELECT * FROM workers 
      WHERE tenant_id = $1
      ORDER BY name ASC
    `;

    const { rows } = await queryAutolavado<Worker>(query, [tenantId]);

    return NextResponse.json(rows);
  } catch (error: any) {
    if (error.message === "AUTOLAVADO_ADMIN_REQUIRED" || error.message === "AUTOLAVADO_ACCESS_DENIED" || error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("[Autolavado API] Get workers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAutolavadoAdmin();
    const body = await req.json();

    const { name, is_active = true, meta = {} } = body;

    const query = `
      INSERT INTO workers (tenant_id, name, is_active, meta, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `;

    const { rows } = await queryAutolavado<Worker>(query, [24, name, is_active, JSON.stringify(meta)]);

    return NextResponse.json({ ok: true, data: rows[0] });
  } catch (error: any) {
    console.error("[Autolavado API] Create worker error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
