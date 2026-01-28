import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/server/session";

type RouteCtx = { params: { id: string } | Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { tenantId } = await requireSession();
    const { id } = await Promise.resolve(ctx.params);
    const pipelineId = Number(id);

    if (!Number.isFinite(pipelineId)) {
      return NextResponse.json({ ok: false, error: "Invalid pipeline id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null) as { stageIds?: number[] } | null;
    const stageIds = Array.isArray(body?.stageIds) ? body!.stageIds!.map(Number) : [];

    if (!stageIds.length || stageIds.some((sid) => !Number.isFinite(sid))) {
      return NextResponse.json({ ok: false, error: "stageIds must be a non-empty array of numbers" }, { status: 400 });
    }

    // Validate pipeline ownership and exclude universal templates (tenant_id IS NULL)
    const pipelineRes = await db.query<{ id: number; tenant_id: number | null }>(
      `SELECT id, tenant_id FROM pipelines WHERE id = $1 LIMIT 1`,
      [pipelineId]
    );
    if (pipelineRes.rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Pipeline not found" }, { status: 404 });
    }
    const pipelineRow = pipelineRes.rows[0];
    if (pipelineRow.tenant_id === null || pipelineRow.tenant_id !== tenantId) {
      return NextResponse.json({ ok: false, error: "Forbidden: cannot modify universal or other tenant pipeline" }, { status: 403 });
    }

    // Ensure all provided stage ids belong to this pipeline
    const validStages = await db.query<{ id: number }>(
      `SELECT id FROM pipeline_stages WHERE pipeline_id = $1`,
      [pipelineId]
    );
    const validIds = new Set(validStages.rows.map((r) => r.id));
    if (stageIds.some((sid) => !validIds.has(sid))) {
      return NextResponse.json({ ok: false, error: "One or more stageIds do not belong to this pipeline" }, { status: 400 });
    }

    // Guardar el nuevo orden en pipelines.stage_order
    await db.query(
      `UPDATE pipelines SET stage_order = $1, updated_at = NOW() WHERE id = $2`,
      [stageIds, pipelineId]
    );
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    await db.query("ROLLBACK").catch(() => undefined);
    if (String(error?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("🔥 Error en PATCH /api/pipelines/[id]/stages/order:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
