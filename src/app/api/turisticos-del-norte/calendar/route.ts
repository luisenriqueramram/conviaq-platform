import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/session";
import { db } from "@/lib/db";

const TENANT_ID = 26;

// GET: Listar salidas programadas
export async function GET() {
  try {
    const { tenantId } = await requireSession();
    if (tenantId !== TENANT_ID) {
      return NextResponse.json({ error: "ACCESS_DENIED" }, { status: 403 });
    }
    const res = await db.query(
      `SELECT id, route_key, trip_date, departure_time, price, status FROM tours_calendar WHERE tenant_id = $1 ORDER BY trip_date DESC, departure_time DESC`,
      [TENANT_ID]
    );
    return NextResponse.json({ ok: true, calendar: res.rows });
  } catch (error) {
    console.error("[API] GET turisticos-del-norte/calendar", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// POST: Crear nueva salida
export async function POST(req: Request) {
  try {
    const { tenantId } = await requireSession();
    if (tenantId !== TENANT_ID) {
      return NextResponse.json({ error: "ACCESS_DENIED" }, { status: 403 });
    }
    const body = await req.json();
    const { route_key, trip_date, departure_time, price, status } = body;
    if (!route_key || !trip_date || !departure_time || !price || !status) {
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }
    const res = await db.query(
      `INSERT INTO tours_calendar (tenant_id, route_key, trip_date, departure_time, price, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, route_key, trip_date, departure_time, price, status`,
      [TENANT_ID, route_key, trip_date, departure_time, price, status]
    );
    return NextResponse.json({ ok: true, salida: res.rows[0] });
  } catch (error) {
    console.error("[API] POST turisticos-del-norte/calendar", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
