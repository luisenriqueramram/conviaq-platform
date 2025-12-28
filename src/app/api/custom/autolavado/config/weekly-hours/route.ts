// src/app/api/custom/autolavado/config/weekly-hours/route.ts
import { NextResponse } from "next/server";
import { requireAutolavadoAdmin } from "@/lib/server/autolavado-guard";
import { queryAutolavado } from "@/lib/db-autolavado";
import type { WeeklyHours } from "@/types/autolavado";

export async function GET() {
  try {
    const { tenantId } = await requireAutolavadoAdmin();

    const query = `
      SELECT day_of_week, start_local, end_local, is_enabled
      FROM weekly_hours
      WHERE tenant_id = $1
      ORDER BY day_of_week ASC
    `;

    const { rows } = await queryAutolavado<WeeklyHours>(query, [tenantId]);

    return NextResponse.json(rows);
  } catch (error: any) {
    if (error.message === "AUTOLAVADO_ADMIN_REQUIRED" || error.message === "AUTOLAVADO_ACCESS_DENIED" || error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("[Autolavado API] Get weekly hours error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await requireAutolavadoAdmin();
    const body = await request.json();

    const { day_of_week, start_local, end_local, is_enabled } = body;

    // Upsert: insertar o actualizar
    const query = `
      INSERT INTO weekly_hours (tenant_id, day_of_week, start_local, end_local, is_enabled)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (tenant_id, day_of_week)
      DO UPDATE SET 
        start_local = EXCLUDED.start_local,
        end_local = EXCLUDED.end_local,
        is_enabled = EXCLUDED.is_enabled,
        updated_at = NOW()
      RETURNING *
    `;

    const { rows } = await queryAutolavado<WeeklyHours>(query, [
      tenantId,
      day_of_week,
      start_local,
      end_local,
      is_enabled ?? true,
    ]);

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    if (error.message === "AUTOLAVADO_ADMIN_REQUIRED" || error.message === "AUTOLAVADO_ACCESS_DENIED" || error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("[Autolavado API] Upsert weekly hours error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
