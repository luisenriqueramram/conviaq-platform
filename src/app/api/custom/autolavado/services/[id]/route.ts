// src/app/api/custom/autolavado/services/[id]/route.ts
import { NextResponse } from "next/server";
import { requireAutolavadoAdmin } from "@/lib/server/autolavado-guard";
import { queryAutolavado } from "@/lib/db-autolavado";
import type { Service } from "@/types/autolavado";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await requireAutolavadoAdmin();
    const { id } = await params;

    // Obtener servicio
    const serviceQuery = `SELECT * FROM services WHERE id = $1 AND tenant_id = $2`;
    const { rows: serviceRows } = await queryAutolavado<Service>(serviceQuery, [id, tenantId]);

    if (serviceRows.length === 0) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const service = serviceRows[0];

    // Obtener modifiers
    const modifiersQuery = `
      SELECT size, absolute_price_mxn, duration_delta_min, price_delta_mxn
      FROM service_vehicle_modifiers
      WHERE service_id = $1 AND tenant_id = $2
      ORDER BY size
    `;

    const { rows: modifiers } = await queryAutolavado(modifiersQuery, [id, tenantId]);

    return NextResponse.json({
      ok: true,
      data: {
        ...service,
        vehicle_modifiers: modifiers,
      }
    });
  } catch (error: any) {
    console.error("[Autolavado API] Get service error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await requireAutolavadoAdmin();
    const { id } = await params;
    const body = await req.json();

    const {
      name,
      is_active,
      includes,
      base_duration_min,
      min_workers,
      max_workers,
      vehicle_modifiers,
    } = body;

    // Si solo se está actualizando is_active (toggle)
    if (Object.keys(body).length === 1 && 'is_active' in body) {
      const updateQuery = `
        UPDATE services 
        SET is_active = $1, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
        RETURNING *
      `;
      
      const { rows } = await queryAutolavado<Service>(updateQuery, [is_active, id, tenantId]);
      
      if (rows.length === 0) {
        return NextResponse.json({ error: "Service not found" }, { status: 404 });
      }

      return NextResponse.json({ ok: true, data: rows[0] });
    }

    // Actualización completa del servicio
    if (vehicle_modifiers && vehicle_modifiers.length === 0) {
      return NextResponse.json({ error: "Debe agregar al menos un tipo de vehículo" }, { status: 400 });
    }

    // Actualizar servicio
    const updateServiceQuery = `
      UPDATE services 
      SET 
        name = $1,
        is_active = $2,
        includes = $3,
        base_duration_min = $4,
        min_workers = $5,
        max_workers = $6,
        updated_at = NOW()
      WHERE id = $7 AND tenant_id = $8
      RETURNING *
    `;

    const { rows: updatedRows } = await queryAutolavado<Service>(updateServiceQuery, [
      name,
      is_active,
      JSON.stringify(includes),
      base_duration_min,
      min_workers,
      max_workers,
      id,
      tenantId,
    ]);

    if (updatedRows.length === 0) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Eliminar modifiers viejos
    const deleteModifiersQuery = `
      DELETE FROM service_vehicle_modifiers
      WHERE service_id = $1 AND tenant_id = $2
    `;
    await queryAutolavado(deleteModifiersQuery, [id, tenantId]);

    // Insertar nuevos modifiers
    if (vehicle_modifiers && vehicle_modifiers.length > 0) {
      for (const modifier of vehicle_modifiers) {
        const insertModifierQuery = `
          INSERT INTO service_vehicle_modifiers (
            tenant_id, service_id, size, duration_delta_min, 
            price_delta_mxn, absolute_price_mxn, created_at, updated_at
          ) VALUES (
            $1, $2, $3, 0, '0.00', $4, NOW(), NOW()
          )
        `;
        await queryAutolavado(insertModifierQuery, [
          tenantId,
          id,
          modifier.size,
          modifier.absolute_price_mxn,
        ]);
      }
    }

    return NextResponse.json({ ok: true, data: updatedRows[0] });
  } catch (error: any) {
    console.error("[Autolavado API] Update service error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await requireAutolavadoAdmin();
    const { id } = await params;

    // Eliminar modifiers primero
    const deleteModifiersQuery = `
      DELETE FROM service_vehicle_modifiers
      WHERE service_id = $1 AND tenant_id = $2
    `;
    await queryAutolavado(deleteModifiersQuery, [id, tenantId]);

    // Eliminar servicio
    const deleteServiceQuery = `
      DELETE FROM services
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `;

    const { rows } = await queryAutolavado(deleteServiceQuery, [id, tenantId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[Autolavado API] Delete service error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
