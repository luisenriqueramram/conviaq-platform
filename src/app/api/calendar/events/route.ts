import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/session";
import { db } from "@/lib/db";
import type { CalendarEvent } from "@/types/calendar";

const MAX_RANGE_DAYS = 93; // ~3 months
const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

type AppointmentRow = {
  id: number;
  tenant_id: number;
  contact_id: number | null;
  title: string | null;
  start_time: string;
  end_time: string | null;
  channel: string | null;
  status: string;
  notes: string | null;
  service_type: string | null;
  metadata: Record<string, any> | null;
};

type BookingRow = {
  id: string;
  tenant_id: number;
  status: string;
  customer_name: string;
  phone: string;
  zone: string | null;
  address_text: string | null;
  maps_url: string | null;
  total_price: number | null;
  price_breakdown: Record<string, any> | null;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  service_id: string;
  cars_count: number;
  cars_sizes: any;
};

const parseDateBoundary = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const formatPrice = (value: number | null | undefined) => {
  if (value == null) return null;
  try {
    return currencyFormatter.format(value);
  } catch {
    return `${value}`;
  }
};

export async function GET(req: Request) {
  try {
    const { tenantId } = await requireSession();
    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    const startDate = parseDateBoundary(startParam);
    const endDate = parseDateBoundary(endParam);

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "INVALID_RANGE", message: "start y end deben ser fechas ISO válidas" },
        { status: 400 }
      );
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "INVALID_RANGE", message: "end debe ser mayor que start" },
        { status: 400 }
      );
    }

    const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > MAX_RANGE_DAYS) {
      return NextResponse.json(
        { error: "RANGE_TOO_LARGE", message: "Solicita rangos menores a 3 meses" },
        { status: 400 }
      );
    }

    const params = [tenantId, startDate.toISOString(), endDate.toISOString()];

    const appointmentsPromise = db.query<AppointmentRow>(
      `SELECT id, tenant_id, contact_id, title, start_time, end_time, channel, status, notes, service_type, metadata
       FROM appointments
       WHERE tenant_id = $1 AND start_time >= $2 AND start_time < $3
       ORDER BY start_time ASC`,
      params
    );

    const bookingsPromise = db.query<BookingRow>(
      `SELECT id::text as id, tenant_id, status, customer_name, phone, zone, address_text, maps_url, total_price,
              price_breakdown, starts_at, ends_at, notes_internal as notes, service_id, cars_count, cars_sizes
       FROM bookings
       WHERE tenant_id = $1 AND starts_at >= $2 AND starts_at < $3
       ORDER BY starts_at ASC`,
      params
    );

    const [appointmentsRes, bookingsRes] = await Promise.all([appointmentsPromise, bookingsPromise]);

    const appointmentEvents: CalendarEvent[] = appointmentsRes.rows.map((row) => ({
      id: String(row.id),
      tenant_id: row.tenant_id,
      source: "appointment",
      modality: "virtual",
      status: row.status,
      title: row.title ?? row.service_type ?? "Asesoría",
      start_at: row.start_time,
      end_at: row.end_time,
      channel: row.channel,
      service_type: row.service_type,
      customer_name: row.metadata?.customer_name ?? null,
      phone: row.metadata?.phone ?? null,
      location: row.metadata?.meeting_url ?? null,
      notes: row.notes,
      metadata: row.metadata ?? null,
      price_label: null,
    }));

    const bookingEvents: CalendarEvent[] = bookingsRes.rows.map((row) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      source: "booking",
      modality: "presential",
      status: row.status,
      title: row.customer_name,
      start_at: row.starts_at,
      end_at: row.ends_at,
      customer_name: row.customer_name,
      phone: row.phone,
      service_type: row.service_id,
      location: row.address_text ?? row.zone ?? null,
      notes: row.notes,
      metadata: {
        zone: row.zone,
        maps_url: row.maps_url,
        cars_count: row.cars_count,
        cars_sizes: row.cars_sizes,
        price_breakdown: row.price_breakdown,
      },
      price_label: formatPrice(row.total_price),
    }));

    const events = [...appointmentEvents, ...bookingEvents].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );

    return NextResponse.json({
      ok: true,
      events,
      range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    console.error("[Calendar API] Failed to load events", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
