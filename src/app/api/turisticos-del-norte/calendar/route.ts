import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/session";
import { db } from "@/lib/db";

const TENANT_ID = 26;

const FIELDS = "id, route_key, trip_date, departure_time, price, status, origin_area, destination_area, metadata";

// GET: Listar salidas programadas
export async function GET() {
  try {
    const { tenantId } = await requireSession();
    if (Number(tenantId) !== TENANT_ID) {
      return NextResponse.json({ error: "ACCESS_DENIED", tenantId }, { status: 403 });
    }
    const res = await db.query(
      `SELECT ${FIELDS} FROM tours_calendar WHERE tenant_id = $1 ORDER BY trip_date DESC, departure_time DESC`,
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
    if (Number(tenantId) !== TENANT_ID) {
      return NextResponse.json({ error: "ACCESS_DENIED", tenantId }, { status: 403 });
    }
    const body = await req.json();
    if (Array.isArray(body?.entries)) {
      const { entries, replace } = body as {
        entries: Array<{
          route_key: string;
          trip_date: string;
          departure_time: string;
          price: number | string;
          status: string;
          origin_area?: string | null;
          destination_area?: string | null;
          metadata?: any;
        }>;
        replace?: { route_key?: string; start?: string; end?: string };
      };
      if (!entries.length) {
        return NextResponse.json({ error: "EMPTY_ENTRIES" }, { status: 400 });
      }
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        if (replace?.route_key && replace?.start && replace?.end) {
          await client.query(
            "DELETE FROM tours_calendar WHERE tenant_id = $1 AND route_key = $2 AND trip_date BETWEEN $3 AND $4",
            [TENANT_ID, replace.route_key, replace.start, replace.end]
          );
        }
        for (const entry of entries) {
          const { route_key, trip_date, departure_time, price, status, origin_area, destination_area, metadata } = entry;
          if (!route_key || !trip_date || !departure_time || !price || !status) {
            throw new Error("MISSING_FIELDS");
          }
          const numericPrice = Number(price);
          if (Number.isNaN(numericPrice)) {
            throw new Error("INVALID_PRICE");
          }
          await client.query(
            `INSERT INTO tours_calendar (tenant_id, route_key, trip_date, departure_time, price, status, origin_area, destination_area, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [TENANT_ID, route_key, trip_date, departure_time, numericPrice, status, origin_area || null, destination_area || null, metadata || null]
          );
        }
        await client.query("COMMIT");
        return NextResponse.json({ ok: true, inserted: entries.length });
      } catch (error: any) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: error?.message || "BULK_ERROR" }, { status: 400 });
      } finally {
        client.release();
      }
    }
    const { route_key, trip_date, departure_time, price, status, origin_area, destination_area, metadata } = body;
    if (!route_key || !trip_date || !departure_time || !price || !status) {
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }
    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice)) {
      return NextResponse.json({ error: "INVALID_PRICE" }, { status: 400 });
    }
    const res = await db.query(
      `INSERT INTO tours_calendar (tenant_id, route_key, trip_date, departure_time, price, status, origin_area, destination_area, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${FIELDS}`,
      [TENANT_ID, route_key, trip_date, departure_time, numericPrice, status, origin_area || null, destination_area || null, metadata || null]
    );
    return NextResponse.json({ ok: true, salida: res.rows[0] });
  } catch (error) {
    console.error("[API] POST turisticos-del-norte/calendar", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// DELETE: eliminar salidas por ruta
export async function DELETE(req: Request) {
  try {
    const { tenantId } = await requireSession();
    if (Number(tenantId) !== TENANT_ID) {
      return NextResponse.json({ error: "ACCESS_DENIED", tenantId }, { status: 403 });
    }
    const body = await req.json();
    const { route_key } = body || {};
    if (!route_key) {
      return NextResponse.json({ error: "MISSING_ROUTE_KEY" }, { status: 400 });
    }
    await db.query(
      "DELETE FROM tours_calendar WHERE tenant_id = $1 AND route_key = $2",
      [TENANT_ID, route_key]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API] DELETE turisticos-del-norte/calendar", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
