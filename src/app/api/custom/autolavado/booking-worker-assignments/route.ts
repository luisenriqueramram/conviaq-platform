import { NextResponse } from "next/server";
import { queryAutolavado } from "@/lib/db-autolavado";
import { requireSession } from "@/lib/server/session";

// GET /api/custom/autolavado/booking-worker-assignments?booking_id=...
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;
    const { searchParams } = new URL(req.url);
    const booking_id = searchParams.get("booking_id");
    if (!booking_id) {
      return NextResponse.json({ error: "booking_id es requerido" }, { status: 400 });
    }
    // Buscar asignaciones de trabajadores para esta cita
    const query = `
      SELECT * FROM booking_worker_assignments
      WHERE booking_id = $1 AND tenant_id = $2
      ORDER BY start_at
    `;
    const { rows } = await queryAutolavado(query, [booking_id, tenantId]);
    return NextResponse.json({ ok: true, assignments: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
