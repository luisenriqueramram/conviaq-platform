import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/session";
import { queryAutolavado } from "@/lib/db-autolavado";

export async function GET() {
  try {
    await requireSession();

    // Obtener todos los valores del enum vehicle_size
    const query = `
      SELECT enumlabel as size
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'vehicle_size')
      ORDER BY enumsortorder
    `;

    const { rows } = await queryAutolavado(query, []);

    return NextResponse.json(rows.map(r => r.size));
  } catch (error: any) {
    console.error("[Autolavado API] Get vehicle types error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const { vehicleType } = body;

    if (!vehicleType || !vehicleType.trim()) {
      return NextResponse.json({ error: "Vehicle type is required" }, { status: 400 });
    }

    // Verificar si el valor ya existe en el enum
    const checkQuery = `
      SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = $1 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'vehicle_size')
      ) as exists
    `;

    const { rows: checkRows } = await queryAutolavado(checkQuery, [vehicleType.trim()]);

    if (checkRows[0].exists) {
      return NextResponse.json({ ok: true, message: "Vehicle type already exists" });
    }

    // Agregar el nuevo valor al enum
    // Nota: No se puede usar parámetros en ALTER TYPE, así que sanitizamos manualmente
    const sanitized = vehicleType.trim().replace(/'/g, "''");
    const alterQuery = `ALTER TYPE vehicle_size ADD VALUE '${sanitized}'`;

    await queryAutolavado(alterQuery, []);

    return NextResponse.json({ ok: true, message: "Vehicle type created successfully" });
  } catch (error: any) {
    console.error("[Autolavado API] Create vehicle type error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
