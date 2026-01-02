import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/session";
import { queryAutolavado } from "@/lib/db-autolavado";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;
    const { id: booking_id } = await params;
    const body = await req.json();
    const { worker_id, start_at, end_at } = body;

    if (!worker_id || !start_at || !end_at) {
      return NextResponse.json({ error: "worker_id, start_at y end_at son requeridos" }, { status: 400 });
    }

    // Insertar asignación (incluyendo tenant_id)
    const insertQuery = `
      INSERT INTO booking_worker_assignments (booking_id, worker_id, start_at, end_at, tenant_id, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;
    const { rows } = await queryAutolavado(insertQuery, [booking_id, worker_id, start_at, end_at, tenantId]);

    return NextResponse.json({ ok: true, data: rows[0] });
  } catch (error: any) {
    console.error("[Assign Worker] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
