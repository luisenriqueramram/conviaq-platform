// src/app/api/custom/autolavado/dashboard/route.ts
import { NextResponse } from "next/server";
import { requireAutolavadoAdmin } from "@/lib/server/autolavado-guard";
import { queryAutolavado } from "@/lib/db-autolavado";
import type { DashboardSummary } from "@/types/autolavado";

export async function GET() {
  try {
    const { tenantId } = await requireAutolavadoAdmin();

    // Métricas de bookings
    const bookingsQuery = `
      SELECT 
        COUNT(*)::int as total_bookings,
        COUNT(*) FILTER (WHERE status::text = 'confirmed')::int as confirmed_bookings,
        COUNT(*) FILTER (WHERE status::text = 'pending')::int as pending_bookings,
        COUNT(*) FILTER (WHERE status::text = 'done')::int as completed_bookings,
        COUNT(*) FILTER (WHERE status::text = 'cancelled')::int as cancelled_bookings,
        COUNT(*) FILTER (WHERE DATE(start_at AT TIME ZONE 'America/Merida') = CURRENT_DATE)::int as today_bookings,
        COALESCE(SUM(total_price_mxn::numeric) FILTER (WHERE DATE(start_at AT TIME ZONE 'America/Merida') = CURRENT_DATE AND status::text = 'done'), 0)::text as total_revenue_today
      FROM bookings
      WHERE tenant_id = $1
    `;

    // Zonas activas
    const zonesQuery = `
      SELECT COUNT(*)::int as active_zones
      FROM zones
      WHERE tenant_id = $1 AND is_active = true
    `;

    // Trabajadores activos
    const workersQuery = `
      SELECT COUNT(*)::int as active_workers
      FROM workers
      WHERE tenant_id = $1 AND is_active = true
    `;

    // Próxima cita
    const nextBookingQuery = `
      SELECT id, customer_name, customer_phone, status, start_at, address_text
      FROM bookings
      WHERE tenant_id = $1 
        AND start_at > NOW()
        AND status::text IN ('confirmed', 'pending')
      ORDER BY start_at ASC
      LIMIT 1
    `;

    const [bookingsRes, zonesRes, workersRes, nextBookingRes] = await Promise.all([
      queryAutolavado(bookingsQuery, [tenantId]),
      queryAutolavado(zonesQuery, [tenantId]),
      queryAutolavado(workersQuery, [tenantId]),
      queryAutolavado(nextBookingQuery, [tenantId]),
    ]);

    const summary = {
      ...bookingsRes.rows[0],
      active_zones: zonesRes.rows[0]?.active_zones || 0,
      active_workers: workersRes.rows[0]?.active_workers || 0,
      next_booking: nextBookingRes.rows[0] || null,
    };

    return NextResponse.json(summary);
  } catch (error: any) {
    if (error.message === "AUTOLAVADO_ADMIN_REQUIRED" || error.message === "AUTOLAVADO_ACCESS_DENIED" || error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("[Autolavado API] Get dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
