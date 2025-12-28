import { NextRequest, NextResponse } from "next/server";
import { queryAutolavado } from "@/lib/db-autolavado";
import { requireSession } from "@/lib/server/session";

type ServiceExtra = {
  id: number;
  tenant_id: number;
  name: string;
  code: string;
  is_active: boolean;
  duration_min: number;
  price_mxn: string;
  description: string | null;
};

export async function GET(req: NextRequest) {
  try {
    console.log("[service-extras] Starting request...");
    const session = await requireSession();
    const tenantId = session.tenantId;
    console.log("[service-extras] Session OK, tenantId:", tenantId);

    const query = `
      SELECT * FROM service_extras 
      WHERE tenant_id = $1 AND is_active = true 
      ORDER BY name
    `;

    console.log("[service-extras] Executing query with tenantId:", tenantId);
    const { rows } = await queryAutolavado<ServiceExtra>(query, [tenantId]);
    console.log("[service-extras] Query successful, rows:", rows.length);

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("[service-extras] Error:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      { error: "Error al obtener extras de servicio", details: error.message },
      { status: 500 }
    );
  }
}
