import { NextResponse } from "next/server";
import { queryAutolavado } from "@/lib/db-autolavado";
import { requireSession } from "@/lib/server/session";

// GET /api/custom/autolavado/worker-assignments?worker_id=...&start_at=...&end_at=...
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;
    const { searchParams } = new URL(req.url);
    const worker_id = searchParams.get("worker_id");
    const start_at = searchParams.get("start_at");
    const end_at = searchParams.get("end_at");
    if (!worker_id || !start_at || !end_at) {
      return NextResponse.json({ error: "worker_id, start_at y end_at son requeridos" }, { status: 400 });
    }
    // Buscar asignaciones que se crucen con el horario
    const query = `
      SELECT * FROM booking_worker_assignments
      WHERE worker_id = $1
        AND NOT (end_at <= $2 OR start_at >= $3)
      ORDER BY start_at
    `;
    const { rows } = await queryAutolavado(query, [worker_id, start_at, end_at]);
    return NextResponse.json({ ok: true, conflicts: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
