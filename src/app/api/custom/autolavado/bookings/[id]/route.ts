// src/app/api/custom/autolavado/bookings/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/server/session";
import { queryAutolavado } from "@/lib/db-autolavado";
import type { Booking } from "@/types/autolavado";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;
    const { id } = params;

    console.log("[GET booking] ID:", id, "tenantId:", tenantId);

    const query = `SELECT * FROM bookings WHERE id = $1 AND tenant_id = $2`;
    const { rows } = await queryAutolavado<Booking>(query, [id, tenantId]);

    console.log("[GET booking] Found rows:", rows.length);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: rows[0] });
  } catch (error: any) {
    console.error("[Autolavado API] Get booking error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;
    const { id } = params;
    const body = await req.json();

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Campos editables
    if (body.service_id !== undefined) {
      updates.push(`service_id = $${paramIndex++}`);
      values.push(body.service_id);
    }
    if (body.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(body.status);
    }
    if (body.start_at !== undefined) {
      updates.push(`start_at = $${paramIndex++}`);
      values.push(body.start_at);
    }
    if (body.end_at !== undefined) {
      updates.push(`end_at = $${paramIndex++}`);
      values.push(body.end_at);
    }
    if (body.customer_name !== undefined) {
      updates.push(`customer_name = $${paramIndex++}`);
      values.push(body.customer_name);
    }
    if (body.customer_phone !== undefined) {
      updates.push(`customer_phone = $${paramIndex++}`);
      values.push(body.customer_phone);
    }
    if (body.address_text !== undefined) {
      updates.push(`address_text = $${paramIndex++}`);
      values.push(body.address_text);
    }
    if (body.maps_link !== undefined) {
      updates.push(`maps_link = $${paramIndex++}`);
      values.push(body.maps_link);
    }
    if (body.lat !== undefined) {
      updates.push(`lat = $${paramIndex++}`);
      values.push(body.lat);
    }
    if (body.lng !== undefined) {
      updates.push(`lng = $${paramIndex++}`);
      values.push(body.lng);
    }
    if (body.zone_id !== undefined) {
      updates.push(`zone_id = $${paramIndex++}`);
      values.push(body.zone_id);
    }
    if (body.total_duration_min !== undefined) {
      updates.push(`total_duration_min = $${paramIndex++}`);
      values.push(body.total_duration_min);
    }
    if (body.total_price_mxn !== undefined) {
      updates.push(`total_price_mxn = $${paramIndex++}`);
      values.push(body.total_price_mxn);
    }
    if (body.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(body.notes);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);
    values.push(tenantId);

    const query = `
      UPDATE bookings 
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *
    `;

    const { rows } = await queryAutolavado<Booking>(query, values);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: rows[0] });
  } catch (error: any) {
    console.error("[Autolavado API] Update booking error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    const { id } = params;

    const query = `DELETE FROM bookings WHERE id = $1 RETURNING id`;
    const { rows } = await queryAutolavado(query, [id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[Autolavado API] Delete booking error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
