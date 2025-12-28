import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/server/session";

type Ctx = { params: { id: string } | Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { tenantId } = await requireSession();

    const p = await Promise.resolve(ctx.params);
    const leadId = Number(p.id);

    if (!Number.isFinite(leadId)) {
      return NextResponse.json({ ok: false, error: "Invalid lead id" }, { status: 400 });
    }

    // Verify lead exists
    const leadCheck = await db.query(
      `SELECT id FROM leads WHERE id = $1 AND tenant_id = $2`,
      [leadId, tenantId]
    );

    if (leadCheck.rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
    }

    // Get notes
    const notesResult = await db.query(
      `
      SELECT id, content, author_type, author_id, created_at
      FROM lead_notes
      WHERE lead_id = $1
      ORDER BY created_at DESC
      `,
      [leadId]
    );

    return NextResponse.json({
      ok: true,
      data: notesResult.rows.map((r: any) => ({
        id: r.id,
        content: r.content,
        authorType: r.author_type,
        authorId: r.author_id,
        createdAt: r.created_at,
      })),
    });
  } catch (error: any) {
    if (String(error?.message) === "UNAUTHORIZED") {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    console.error("🔥 Error en GET /api/leads/[id]/notes:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { tenantId, userId } = await requireSession();

    const p = await Promise.resolve(ctx.params);
    const leadId = Number(p.id);

    if (!Number.isFinite(leadId)) {
      return NextResponse.json({ ok: false, error: "Invalid lead id" }, { status: 400 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "Content is required" },
        { status: 400 }
      );
    }

    // Verify lead exists
    const leadCheck = await db.query(
      `SELECT id FROM leads WHERE id = $1 AND tenant_id = $2`,
      [leadId, tenantId]
    );

    if (leadCheck.rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
    }

    // Insert note
    const result = await db.query(
      `
      INSERT INTO lead_notes (lead_id, content, author_type, author_id, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, content, author_type, author_id, created_at
      `,
      [leadId, content.trim(), "user", userId]
    );

    const note = result.rows[0];

    return NextResponse.json(
      {
        ok: true,
        data: {
          id: note.id,
          content: note.content,
          authorType: note.author_type,
          authorId: note.author_id,
          createdAt: note.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (String(error?.message) === "UNAUTHORIZED") {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    console.error("🔥 Error en POST /api/leads/[id]/notes:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
