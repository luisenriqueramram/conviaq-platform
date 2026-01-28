import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/server/session";

type RouteCtx = { params: { id: string } | Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  const params = await Promise.resolve(ctx.params);

  try {
    const { tenantId, userId } = await requireSession();
    const leadId = Number(params.id);

    if (!Number.isFinite(leadId)) {
      return NextResponse.json({ ok: false, error: "Invalid lead id" }, { status: 400 });
    }

    const body = await req.json();
    const stageId = Number(body?.stageId);
    const reason = (body?.reason as string | undefined)?.trim() ?? null;
    const source = (body?.source as string | undefined)?.trim() || "pipeline_board";

    if (!Number.isFinite(stageId)) {
      return NextResponse.json({ ok: false, error: "Invalid stage id" }, { status: 400 });
    }

    const leadResult = await db.query(
      `
        SELECT id, tenant_id, pipeline_id, stage_id
        FROM leads
        WHERE id = $1 AND tenant_id = $2
      `,
      [leadId, tenantId]
    );

    if (leadResult.rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
    }

    const lead = leadResult.rows[0];

    // Ensure the requested stage belongs to the lead's pipeline. If not,
    // attempt server-side mapping: look up the requested stage's stage_key/name
    // and try to find a local stage in the lead.pipeline_id with the same
    // stage_key or a matching name. This allows moving to "universal" stages
    // by mapping them to tenant-local equivalents when available.
    let useStageId = stageId;

    const stageResult = await db.query(
      `SELECT id, pipeline_id, stage_key, name FROM pipeline_stages WHERE id = $1`,
      [stageId]
    );

    if (stageResult.rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Invalid stage" }, { status: 400 });
    }

    const requestedStage = stageResult.rows[0];
    if (Number(requestedStage.pipeline_id) !== Number(lead.pipeline_id)) {
      console.log('[PATCH /api/leads/[id]/stage] requested stage belongs to different pipeline', { requestedStage, leadPipeline: lead.pipeline_id });

      // If the requested stage belongs to a universal pipeline (tenant_id IS NULL),
      // allow using its id directly (the product wants to reuse universal stage ids).
      const pipelineInfo = await db.query(`SELECT tenant_id FROM pipelines WHERE id = $1 LIMIT 1`, [requestedStage.pipeline_id]);
      const isUniversal = pipelineInfo.rows.length > 0 && pipelineInfo.rows[0].tenant_id == null;
      if (isUniversal) {
        console.log('[PATCH] requested stage is from a universal pipeline; allowing direct use of stage id', requestedStage.id);
        useStageId = requestedStage.id;
      } else {
        // try to find local equivalent by stage_key first, then by name
        let localResult = null;
        if (requestedStage.stage_key) {
          console.log('[PATCH] trying to map by stage_key', requestedStage.stage_key);
          localResult = await db.query(
            `SELECT id FROM pipeline_stages WHERE pipeline_id = $1 AND stage_key = $2 LIMIT 1`,
            [lead.pipeline_id, requestedStage.stage_key]
          );
        }
        if ((!localResult || localResult.rows.length === 0) && requestedStage.name) {
          console.log('[PATCH] trying to map by name', requestedStage.name);
          localResult = await db.query(
            `SELECT id FROM pipeline_stages WHERE pipeline_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
            [lead.pipeline_id, requestedStage.name]
          );
        }

        if (localResult && localResult.rows.length > 0) {
          useStageId = localResult.rows[0].id;
        } else {
          // No local equivalent found — create a local copy of the stage for this pipeline
          // Determine next position
          const posRes = await db.query(`SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM pipeline_stages WHERE pipeline_id = $1`, [lead.pipeline_id]);
          const nextPos = posRes.rows[0]?.next_pos ?? 0;

          console.log('[PATCH] creating local stage copy for pipeline', lead.pipeline_id);
          const ins = await db.query(
            `INSERT INTO pipeline_stages (pipeline_id, name, stage_key, position, color, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
            [lead.pipeline_id, requestedStage.name || 'Sin nombre', requestedStage.stage_key || null, nextPos, null]
          );
          if (ins.rows.length === 0) {
            return NextResponse.json({ ok: false, error: "Could not create local stage" }, { status: 500 });
          }
          console.log('[PATCH] created local stage id', ins.rows[0].id);
          useStageId = ins.rows[0].id;
        }
      }
    }

    await db.query("BEGIN");

    await db.query(
      `
        UPDATE leads
        SET stage_id = $1, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
      `,
      [useStageId, leadId, tenantId]
    );

    await db.query(
      `
        INSERT INTO lead_stage_history (
          lead_id,
          from_stage_id,
          to_stage_id,
          changed_by_user,
          source,
          reason
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [leadId, lead.stage_id, useStageId, userId, source, reason]
    );

    await db.query(
      `
        INSERT INTO lead_activity_log (
          lead_id,
          tenant_id,
          activity_type,
          description,
          performed_by_ai,
          metadata,
          created_at
        )
        VALUES ($1, $2, 'stage_change', 'Movimiento manual desde pipeline', false, $3, NOW())
      `,
      [leadId, tenantId, JSON.stringify({ userId, stageId: useStageId, source })]
    );

    await db.query("COMMIT");

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    await db.query("ROLLBACK").catch(() => undefined);
    if (String(error?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("🔥 Error en PATCH /api/leads/[id]/stage:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
