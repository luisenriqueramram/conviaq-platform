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
    // Buscar asignaciones de trabajadores para esta cita, incluyendo nombre y PIN
    const query = `
      SELECT bwa.*, w.name as worker_name, w.pin as worker_pin
      FROM booking_worker_assignments bwa
      JOIN workers w ON bwa.worker_id = w.id
      WHERE bwa.booking_id = $1
      ORDER BY bwa.start_at
    `;
    const { rows } = await queryAutolavado(query, [booking_id]);
    return NextResponse.json({ ok: true, assignments: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
