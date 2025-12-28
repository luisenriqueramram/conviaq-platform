import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/server/session";

export async function GET(req: Request) {
  try {
    console.log("HIT /api/conversations LIST route.ts");

    const { tenantId } = await requireSession();

    const url = new URL(req.url);

    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
    const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

    // ✅ NUEVO: search + filtros simples
    const search = (url.searchParams.get("search") ?? "").trim();
    const status = (url.searchParams.get("status") ?? "").trim(); // "open" | "closed" | ""
    const channel = (url.searchParams.get("channel") ?? "").trim(); // "whatsapp" | "webchat" | ""

    // Construimos WHERE dinámico (para count y para items)
    const where: string[] = ["c.tenant_id = $1"];
    const params: (string | number)[] = [tenantId];
    let i = 2;

    if (status) {
      where.push(`c.status = $${i++}`);
      params.push(status);
    }

    if (channel) {
      // en tu esquema es channel_type
      where.push(`c.channel_type = $${i++}`);
      params.push(channel);
    }

    if (search) {
      where.push(`
        (
          ct.name ILIKE $${i}
          OR ct.phone ILIKE $${i}
          OR c.channel_identifier ILIKE $${i}
        )
      `);
      params.push(`%${search}%`);
      i++;
    }

    const whereSql = where.join(" AND ");

    // COUNT con mismos filtros
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM conversations c
       JOIN contacts ct ON c.contact_id = ct.id
       WHERE ${whereSql}`,
      params
    );
    const count = countResult.rows?.[0]?.count ?? 0;

    // ITEMS con mismos filtros + pagination
    const itemsResult = await db.query(
      `
      SELECT
  c.id,
  c.channel_type,
  c.channel_identifier,
  c.status,
  c.started_at,
  c.last_message_at,
  ct.name AS contact_name,
  ct.phone_e164 AS contact_phone
FROM conversations c
JOIN contacts ct ON c.contact_id = ct.id
      WHERE ${whereSql}
      ORDER BY c.last_message_at DESC NULLS LAST, c.started_at DESC
      LIMIT $${i} OFFSET $${i + 1}
      `,
      [...params, limit, offset]
    );

    return NextResponse.json({
      ok: true,
      data: { count, items: itemsResult.rows, limit, offset },
    });
  } catch (err: any) {
    if (String(err?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("🔥 Error en /api/conversations:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
