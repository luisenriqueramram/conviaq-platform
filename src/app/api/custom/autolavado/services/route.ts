// src/app/api/custom/autolavado/services/route.ts
import { NextResponse } from "next/server";
import { requireAutolavadoAccess } from "@/lib/server/autolavado-guard";
import { queryAutolavado } from "@/lib/db-autolavado";
import type { Service } from "@/types/autolavado";

export async function GET() {
  try {
    const { tenantId } = await requireAutolavadoAccess();

    const query = `
      SELECT * FROM services 
      WHERE tenant_id = $1
      ORDER BY name ASC
    `;

    const { rows } = await queryAutolavado<Service>(query, [tenantId]);

    return NextResponse.json(rows);
  } catch (error: any) {
    if (error.message === "AUTOLAVADO_ACCESS_DENIED" || error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("[Autolavado API] Get services error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId } = await requireAutolavadoAccess();
    const body = await req.json();

    const {
      service_type = "pack",
      name,
      is_active = true,
      includes = [],
      base_duration_min,
      min_workers = 1,
      max_workers = 1,
      vehicle_modifiers = [], // Array de { size, absolute_price_mxn }
    } = body;

    // Validar que tenga al menos un modificador
    if (!vehicle_modifiers || vehicle_modifiers.length === 0) {
      return NextResponse.json({ error: "Debe agregar al menos un tipo de vehículo" }, { status: 400 });
    }

    // Generar código automáticamente basado en el tipo
    const prefix = service_type === "pack" ? "GO_PACK_" : "GO_EXTRA_";
    
    // Buscar el último número usado
    const countQuery = `
      SELECT code FROM services 
      WHERE tenant_id = $1 AND code LIKE $2
      ORDER BY code DESC
      LIMIT 1
    `;
    
    const { rows: existingServices } = await queryAutolavado(countQuery, [tenantId, `${prefix}%`]);
    
    let nextNumber = 1;
    if (existingServices.length > 0) {
      const lastCode = existingServices[0].code;
      const lastNumber = parseInt(lastCode.replace(prefix, "")) || 0;
      nextNumber = lastNumber + 1;
    }
    
    const code = prefix + nextNumber;

    // Insertar servicio
    const serviceQuery = `
      INSERT INTO services (
        tenant_id, code, name, is_active, description, includes,
        base_duration_min, base_price_mxn, min_workers, max_workers,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      )
      RETURNING *
    `;

    const { rows } = await queryAutolavado<Service>(serviceQuery, [
      tenantId, code, name, is_active, null, JSON.stringify(includes),
      base_duration_min, null, min_workers, max_workers,
    ]);

    const newService = rows[0];

    // Insertar modificadores de vehículo
    for (const modifier of vehicle_modifiers) {
      const modifierQuery = `
        INSERT INTO service_vehicle_modifiers (
          tenant_id, service_id, size, duration_delta_min, 
          price_delta_mxn, absolute_price_mxn, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 0, '0.00', $4, NOW(), NOW()
        )
      `;
      
      await queryAutolavado(modifierQuery, [
        tenantId, 
        newService.id, 
        modifier.size, 
        modifier.absolute_price_mxn
      ]);
    }

    return NextResponse.json({ ok: true, data: newService });
  } catch (error: any) {
    console.error("[Autolavado API] Create service error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
