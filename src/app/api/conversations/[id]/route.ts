import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/server/session";

export async function GET(
  req: Request,
  ctx: { params?: { id?: string } | Promise<{ id?: string }> }
) {
  try {
    const { tenantId } = await requireSession();

    // ✅ Next 15/16: params puede venir como Promise
    const p: any = await Promise.resolve(ctx?.params as any);
    const idRaw = p?.id;

    const conversationId = Number(idRaw);
    if (!Number.isFinite(conversationId)) {
      return NextResponse.json(
        { ok: false, error: `Invalid conversation id: "${idRaw}"` },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
    const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

    const countResult = await db.query(
      `
      SELECT COUNT(*)::int AS count
      FROM messages
      WHERE tenant_id = $1 AND conversation_id = $2
      `,
      [tenantId, conversationId]
    );
    const count = countResult.rows?.[0]?.count ?? 0;

    // newest first so offset works for "load older"
    const itemsResult = await db.query(
      `
      SELECT
        id,
        sender_type,
        direction,
        content_text,
        message_type,
        metadata,
        sent_at
      FROM messages
      WHERE tenant_id = $1
        AND conversation_id = $2
      ORDER BY sent_at DESC, id DESC
      LIMIT $3 OFFSET $4
      `,
      [tenantId, conversationId, limit, offset]
    );

    return NextResponse.json({
      ok: true,
      data: {
        conversationId: String(conversationId),
        count,
        items: itemsResult.rows,
        limit,
        offset,
      },
    });
  } catch (err: any) {
    if (String(err?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("🔥 Error en /api/conversations/[id]:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
