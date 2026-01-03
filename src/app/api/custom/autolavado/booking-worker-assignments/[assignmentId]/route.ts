import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/server/session";
import { queryAutolavado } from "@/lib/db-autolavado";

// DELETE /api/custom/autolavado/booking-worker-assignments/[assignmentId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    await requireSession();
    const { assignmentId } = await params;

    if (!assignmentId) {
      return NextResponse.json(
        { error: "assignmentId es requerido" },
        { status: 400 }
      );
    }

    const deleteQuery = `
      DELETE FROM booking_worker_assignments
      WHERE id = $1
      RETURNING id
    `;
    const { rows } = await queryAutolavado(deleteQuery, [assignmentId]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Asignación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[Delete Worker Assignment] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
