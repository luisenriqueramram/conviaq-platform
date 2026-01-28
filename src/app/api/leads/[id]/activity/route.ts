import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/server/session";

type Ctx = { params: { id: string } | Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { tenantId } = await requireSession();
    const p = await Promise.resolve(ctx.params as any);
    const leadId = Number(p.id);
    if (!Number.isFinite(leadId)) {
      return NextResponse.json({ ok: false, error: "Invalid lead id" }, { status: 400 });
    }

    const q = `
      SELECT id, activity_type, description, performed_by_ai, metadata, created_at
      FROM lead_activity_log
      WHERE lead_id = $1
      ORDER BY created_at DESC
      LIMIT 200
    `;
    const { rows } = await db.query(q, [leadId]);

    return NextResponse.json({ ok: true, data: rows });
  } catch (err: any) {
    if (String(err?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error in GET /api/leads/[id]/activity:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
// src/app/api/leads/[id]/activity/route.ts
import { NextResponse } from 'next/server';
import { getLeadActivityLog } from '@/lib/db-autolavado';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const data = await getLeadActivityLog(id);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
