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

    // Get reminders
    const remindersResult = await db.query(
      `
      SELECT id, text, due_at, active, created_at
      FROM lead_reminders
      WHERE lead_id = $1 AND active = true
      ORDER BY due_at ASC
      `,
      [leadId]
    );

    return NextResponse.json({
      ok: true,
      data: remindersResult.rows.map((r: any) => ({
        id: r.id,
        text: r.text,
        dueAt: r.due_at,
        active: r.active,
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
    console.error("🔥 Error en GET /api/leads/[id]/reminders:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { tenantId } = await requireSession();

    const p = await Promise.resolve(ctx.params);
    const leadId = Number(p.id);

    if (!Number.isFinite(leadId)) {
      return NextResponse.json({ ok: false, error: "Invalid lead id" }, { status: 400 });
    }

    const body = await req.json();
    const { text, dueAt } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "Text is required" },
        { status: 400 }
      );
    }

    if (!dueAt) {
      return NextResponse.json(
        { ok: false, error: "dueAt timestamp is required" },
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

    // Insert reminder
    const result = await db.query(
      `
      INSERT INTO lead_reminders (lead_id, text, due_at, active, created_at)
      VALUES ($1, $2, $3, true, NOW())
      RETURNING id, text, due_at, active, created_at
      `,
      [leadId, text.trim(), dueAt]
    );

    const reminder = result.rows[0];

    return NextResponse.json(
      {
        ok: true,
        data: {
          id: reminder.id,
          text: reminder.text,
          dueAt: reminder.due_at,
          active: reminder.active,
          createdAt: reminder.created_at,
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
    console.error("🔥 Error en POST /api/leads/[id]/reminders:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
