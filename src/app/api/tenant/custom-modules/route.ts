// src/app/api/tenant/custom-modules/route.ts
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/session";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { tenantId } = await requireSession();

    // Obtener módulos personalizados del campo custom_modules
    const query = `
      SELECT custom_modules 
      FROM tenants 
      WHERE id = $1
    `;
    const { rows } = await db.query(query, [tenantId]);
    let modules = rows[0]?.custom_modules || [];

    // Buscar si existe un registro de paneles solares en industry_configs
    const solarRes = await db.query(
      `SELECT id FROM industry_configs WHERE tenant_id = $1 AND industry = 'solar_logic' LIMIT 1`,
      [tenantId]
    );
    if (solarRes.rows[0]) {
      modules = [
        ...modules,
        {
          slug: "solar-panels",
          name: "Paneles Solares",
          icon: "Zap",
          route: `/portal/custom/solar-panels/${solarRes.rows[0].id}`,
        },
      ];
    }

    return NextResponse.json({ ok: true, modules });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[API] Get custom modules error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
