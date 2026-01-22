import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/server/session";

type RouteCtx = { params: { id: string } | Promise<{ id: string }> };

type RawLeadRow = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  stage_id: number | null;
  created_at: Date | null;
  contact_name: string | null;
  contact_email: string | null;
  phone_e164: string | null;
  tags: Array<{ id: number; name: string; color: string | null; is_system: boolean }> | null;
};

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { tenantId } = await requireSession();
    const { id } = await Promise.resolve(ctx.params);
    const pipelineId = Number(id);

    if (!Number.isFinite(pipelineId)) {
      return NextResponse.json({ ok: false, error: "Invalid pipeline id" }, { status: 400 });
    }

    const pipelineResult = await db.query<{ id: number; name: string }>(
      `SELECT id, name FROM pipelines WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [pipelineId, tenantId]
    );

    if (pipelineResult.rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Pipeline not found" }, { status: 404 });
    }

    const leadsResult = await db.query<RawLeadRow>(
      `
      SELECT
        l.id,
        l.name,
        l.email,
        l.phone,
        l.stage_id,
        l.created_at,
        c.name AS contact_name,
        c.email AS contact_email,
        c.phone_e164,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', t.id,
                'name', t.name,
                'color', t.color,
                'is_system', CASE WHEN t.tenant_id IS NULL THEN true ELSE false END
              )
            ORDER BY t.name)
            FROM taggings tg
            JOIN tags t ON t.id = tg.tag_id
            WHERE tg.lead_id = l.id
          ),
          '[]'::json
        ) AS tags
      FROM leads l
      LEFT JOIN contacts c ON c.id = l.contact_id
      WHERE l.pipeline_id = $1 AND l.tenant_id = $2
      ORDER BY l.updated_at DESC
      `,
      [pipelineId, tenantId]
    );

    const leads = leadsResult.rows.map((row) => ({
      id: row.id,
      name: row.name ?? row.contact_name ?? "Sin nombre",
      email: row.email ?? row.contact_email ?? "",
      phone: row.phone ?? row.phone_e164 ?? "",
      stage: row.stage_id,
      date: row.created_at ? row.created_at.toISOString() : null,
      tags: row.tags ?? [],
    }));

    return NextResponse.json({
      ok: true,
      data: {
        pipelineId,
        pipelineName: pipelineResult.rows[0].name,
        leads,
      },
    });
  } catch (error: any) {
    if (String(error?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("🔥 Error en GET /api/pipelines/[id]/leads:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
