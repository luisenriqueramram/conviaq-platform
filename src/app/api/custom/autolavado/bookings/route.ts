// src/app/api/custom/autolavado/bookings/route.ts
import { NextResponse } from "next/server";
import { requireAutolavadoAccess } from "@/lib/server/autolavado-guard";
import { queryAutolavado } from "@/lib/db-autolavado";
import type { Booking } from "@/types/autolavado";

export async function GET(req: Request) {
  try {
    const { tenantId, isAdmin, userId } = await requireAutolavadoAccess();
    const { searchParams } = new URL(req.url);
    
    const limit = searchParams.get("limit");
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const future = searchParams.get("future");

    let query = `
      SELECT * FROM bookings 
      WHERE tenant_id = $1
    `;
    const params: any[] = [tenantId];
    let paramIndex = 2;

    // Si es worker, solo ver sus servicios asignados
    if (!isAdmin) {
      query += ` AND $${paramIndex} = ANY(workers_assigned_ids)`;
      params.push(userId);
      paramIndex++;
    }

    if (status) {
      const statuses = status.split(',');
      query += ` AND status::text = ANY($${paramIndex}::text[])`;
      params.push(statuses);
      paramIndex++;
    }

    if (date) {
      query += ` AND DATE(start_at) = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }

    if (future === "true") {
      query += ` AND start_at > NOW()`;
    }

    query += ` ORDER BY start_at ${future === "true" ? "ASC" : "DESC"}`;

    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
    }

    const { rows } = await queryAutolavado<Booking>(query, params);

    return NextResponse.json(rows);
  } catch (error: any) {
    if (error.message === "AUTOLAVADO_ACCESS_DENIED" || error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("[Autolavado API] Get bookings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId } = await requireAutolavadoAccess();
    const body = await req.json();

    const {
      service_id,
      status = "confirmed",
      start_at,
      end_at,
      timezone = "America/Mexico_City",
      workers_assigned = 1,
      customer_name,
      customer_phone,
      location_type = null,
      address_text,
      maps_link = null,
      lat = 0,
      lng = 0,
      zone_id,
      total_duration_min,
      total_price_mxn,
      travel_time_min = 0,
      travel_included = false,
      notes = null,
    } = body;

    const query = `
      INSERT INTO bookings (
        tenant_id, service_id, status, start_at, end_at, timezone,
        workers_assigned, customer_name, customer_phone, location_type,
        address_text, maps_link, lat, lng, zone_id,
        total_duration_min, total_price_mxn, travel_time_min, travel_included,
        notes, crm_ref, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, '{}', NOW(), NOW()
      )
      RETURNING *
    `;

    const { rows } = await queryAutolavado<Booking>(query, [
      tenantId,
      service_id,
      status,
      start_at,
      end_at,
      timezone,
      workers_assigned,
      customer_name,
      customer_phone,
      location_type,
      address_text,
      maps_link,
      lat,
      lng,
      zone_id,
      total_duration_min,
      total_price_mxn,
      travel_time_min,
      travel_included,
      notes,
    ]);

    return NextResponse.json({ ok: true, data: rows[0] });
  } catch (error: any) {
    console.error("[Autolavado API] Create booking error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
