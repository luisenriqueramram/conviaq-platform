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
  contact_id: number | null;
  contact_name: string | null;
  contact_email: string | null;
  phone_e164: string | null;
  description: string | null;
  summary_text: string | null;
  last_contact_at: Date | null;
};

type StageRow = {
  id: number;
  name: string;
  color: string | null;
  position: number;
};

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { tenantId } = await requireSession();
    const { id } = await Promise.resolve(ctx.params);
    const pipelineId = Number(id);

    if (!Number.isFinite(pipelineId)) {
      return NextResponse.json({ ok: false, error: "Invalid pipeline id" }, { status: 400 });
    }


    // Leer pipeline y stage_order

    // Permitir pipelines universales (tenant_id IS NULL) y del tenant
    const pipelineResult = await db.query<{ id: number; name: string; stage_order: number[] | null }>(
      `SELECT id, name, stage_order FROM pipelines WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL) LIMIT 1`,
      [pipelineId, tenantId]
    );

    if (pipelineResult.rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Pipeline not found" }, { status: 404 });
    }
    const stageOrder: number[] | null = pipelineResult.rows[0].stage_order;

    // Siempre filtrar por tenant_id, incluso en pipelines universales
    const leadsResult = await db.query<RawLeadRow>(
      `
      SELECT
        l.id,
        l.name,
        l.email,
        l.phone,
        l.stage_id,
        l.created_at,
        l.contact_id,
        l.description,
        l.summary_text,
        c.name AS contact_name,
        c.email AS contact_email,
        c.phone_e164,
        c.last_contact_at
      FROM leads l
      LEFT JOIN contacts c ON c.id = l.contact_id
      WHERE l.pipeline_id = $1 AND l.tenant_id = $2
      ORDER BY l.updated_at DESC
      `,
      [pipelineId, tenantId]
    );



    // Leer todos los stages del pipeline y las etapas de pipelines universales
    // (cualquier pipeline cuyo tenant_id IS NULL se considera "universal")
    const allStagesResult = await db.query<StageRow>(
      `
      SELECT ps.id, ps.pipeline_id, ps.name, ps.stage_key, ps.position, ps.color, ps.is_final
      FROM pipeline_stages ps
      JOIN pipelines p ON p.id = ps.pipeline_id
      WHERE ps.pipeline_id = $1 OR p.tenant_id IS NULL
      `,
      [pipelineId]
    );
    let stages: StageRow[] = allStagesResult.rows;
    // Si hay stage_order, filtrar y ordenar según ese arreglo
    if (stageOrder && Array.isArray(stageOrder) && stageOrder.length > 0) {
      const stageMap = new Map(stages.map(s => [Number(s.id), s]));
      stages = stageOrder.map((id, idx) => {
        const s = stageMap.get(Number(id));
        return s ? { ...s, stage_order: idx } : null;
      }).filter(Boolean) as (StageRow & { stage_order: number })[];
    } else {
      // Si no hay stage_order, usar el orden por position asc
      stages = stages.sort((a, b) => a.position - b.position).map((s, idx) => ({ ...s, stage_order: idx }));
    }


    // Obtener el confidence más reciente de cada lead
    const leadIds = leadsResult.rows.map(row => row.id);
    let confidenceMap: Record<number, number> = {};
    if (leadIds.length) {
      const confidenceResult = await db.query<{
        lead_id: number;
        confidence: number | null;
      }>(
        `
        SELECT DISTINCT ON (lead_id) lead_id,
          (metadata->>'confidence')::int AS confidence
        FROM lead_activity_log
        WHERE lead_id = ANY($1)
          AND activity_type = 'ai_audit_update'
        ORDER BY lead_id, created_at DESC
        `,
        [leadIds]
      );
      confidenceMap = Object.fromEntries(confidenceResult.rows.map(r => [r.lead_id, r.confidence ?? 0]));
    }

    const leads: any[] = [];
    for (const row of leadsResult.rows) {
      const leadId = row.id;
      // find conversation for this contact (if any)
      let conversation = null;
      if (row.contact_id) {
        const convRes = await db.query(
          `SELECT id, status, last_message_at FROM conversations WHERE tenant_id = $1 AND contact_id = $2 ORDER BY last_message_at DESC LIMIT 1`,
          [tenantId, row.contact_id]
        );
        if (convRes.rows.length) conversation = convRes.rows[0];
      }

      let lastContactMessageAt: string | null = null;
      let replied = false;
      let aiForceOff = false;
      if (conversation) {
        // Si el último mensaje no es del contacto, consideramos respondido
        const lastMsgRes = await db.query(
          `SELECT sender_type, sent_at FROM messages WHERE tenant_id = $1 AND conversation_id = $2 ORDER BY sent_at DESC LIMIT 1`,
          [tenantId, conversation.id]
        );
        if (lastMsgRes.rows.length) {
          const lastSender = String(lastMsgRes.rows[0].sender_type || "").toLowerCase();
          if (lastSender !== "contact") {
            replied = true;
          }
        }

        const lastContactRes = await db.query(
          `SELECT sent_at FROM messages WHERE tenant_id = $1 AND conversation_id = $2 AND sender_type = 'contact' ORDER BY sent_at DESC LIMIT 1`,
          [tenantId, conversation.id]
        );
        lastContactMessageAt = lastContactRes.rows.length ? lastContactRes.rows[0].sent_at?.toISOString() ?? null : null;

        if (lastContactMessageAt && !replied) {
          const agentAfter = await db.query(
            `SELECT 1 FROM messages WHERE tenant_id = $1 AND conversation_id = $2 AND sender_type IN ('agent','system','ai','assistant','human') AND sent_at > $3 LIMIT 1`,
            [tenantId, conversation.id, lastContactMessageAt]
          );
          replied = agentAfter.rows.length > 0;
        }

        // Fallback: si no vimos mensaje del agente después del último del contacto,
        // consideramos respondido si el estado de la conversación no está "open"/"pending".
        if (!replied && conversation.status) {
          const status = String(conversation.status).toLowerCase();
          if (status !== "open" && status !== "pending") {
            replied = true;
          }
        }

        const runtime = await db.query(`SELECT ai_force_off FROM conversation_runtime_state WHERE tenant_id = $1 AND conversation_id = $2 LIMIT 1`, [tenantId, conversation.id]);
        aiForceOff = runtime.rows.length ? Boolean(runtime.rows[0].ai_force_off) : false;
      }

      // last AI audit note
      const aiNoteRes = await db.query(
        `SELECT description FROM lead_activity_log WHERE lead_id = $1 AND activity_type = 'ai_audit_update' ORDER BY created_at DESC LIMIT 1`,
        [leadId]
      );
      const lastAiAuditNote = aiNoteRes.rows.length ? aiNoteRes.rows[0].description : null;

      leads.push({
        id: row.id,
        name: row.name ?? row.contact_name ?? "Sin nombre",
        email: row.email ?? row.contact_email ?? "",
        phone: row.phone ?? row.phone_e164 ?? "",
        stage: row.stage_id,
        date: row.created_at ? row.created_at.toISOString() : null,
        tags: [],
        confidence: confidenceMap[row.id] ?? null,
        description: row.description,
        summary: row.summary_text,
        conversationId: conversation?.id ?? null,
        conversationStatus: conversation?.status ?? null,
        lastContactMessageAt: row.last_contact_at ? row.last_contact_at.toISOString() : lastContactMessageAt,
        replied,
        aiForceOff,
        lastAiAuditNote,
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        pipelineId,
        pipelineName: pipelineResult.rows[0].name,
        stages,
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
