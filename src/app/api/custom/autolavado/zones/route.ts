// src/app/api/custom/autolavado/zones/route.ts
import { NextResponse } from "next/server";
import { requireAutolavadoAccess } from "@/lib/server/autolavado-guard";
import { queryAutolavado } from "@/lib/db-autolavado";
import type { Zone } from "@/types/autolavado";

export async function GET() {
  try {
    const { tenantId } = await requireAutolavadoAccess();

    const query = `
      SELECT * FROM zones 
      WHERE tenant_id = $1
      ORDER BY name ASC
    `;

    const { rows } = await queryAutolavado<Zone>(query, [tenantId]);

    return NextResponse.json(rows);
  } catch (error: any) {
    if (error.message === "AUTOLAVADO_ACCESS_DENIED" || error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("[Autolavado API] Get zones error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAutolavadoAccess();
    const body = await req.json();

    const {
      name,
      is_active = true,
      mode = "NAME_ONLY",
      center_lat,
      center_lng,
      radius_km,
      polygon,
      synonyms = [],
    } = body;

    const query = `
      INSERT INTO zones (
        tenant_id, name, is_active, mode, center_lat, center_lng,
        radius_km, polygon, synonyms, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
      )
      RETURNING *
    `;

    const { rows } = await queryAutolavado<Zone>(query, [
      24, name, is_active, mode, center_lat, center_lng,
      radius_km, polygon, JSON.stringify(synonyms),
    ]);

    return NextResponse.json({ ok: true, data: rows[0] });
  } catch (error: any) {
    console.error("[Autolavado API] Create zone error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
