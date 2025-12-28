import { NextRequest, NextResponse } from "next/server";
import { queryAutolavado } from "@/lib/db-autolavado";
import { requireSession } from "@/lib/server/session";

type VehicleModifier = {
  id: number;
  tenant_id: number;
  service_id: number;
  size: string;
  duration_delta_min: number;
  price_delta_mxn: string;
  absolute_price_mxn: string | null;
};

export async function GET(req: NextRequest) {
  try {
    console.log("[vehicle-modifiers] Starting request...");
    const session = await requireSession();
    const tenantId = session.tenantId;
    console.log("[vehicle-modifiers] Session OK, tenantId:", tenantId);

    const query = `
      SELECT * FROM service_vehicle_modifiers 
      WHERE tenant_id = $1
      ORDER BY service_id, size
    `;

    console.log("[vehicle-modifiers] Executing query with tenantId:", tenantId);
    const { rows } = await queryAutolavado<VehicleModifier>(query, [tenantId]);
    console.log("[vehicle-modifiers] Query successful, rows:", rows.length);

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("[vehicle-modifiers] Error:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      { error: "Error al obtener modificadores de vehículo", details: error.message },
      { status: 500 }
    );
  }
}
