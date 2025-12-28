// src/app/api/conversations/statuses/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/server/session";


type StatusRow = { status: string | null };

export async function GET() {
  try {
    const { tenantId } = await requireSession();

    const r = await db.query<StatusRow>(
      `
      SELECT DISTINCT c.status
      FROM conversations c
      WHERE c.tenant_id = $1
        AND c.status IS NOT NULL
        AND c.status <> ''
      ORDER BY c.status ASC
      `,
      [tenantId]
    );

    const statuses = r.rows
      .map((row) => row.status)
      .filter((s): s is string => typeof s === "string" && s.length > 0);

    return NextResponse.json({ ok: true, data: { statuses } });
  } catch (err: any) {
    if (String(err?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/conversations/statuses error", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
