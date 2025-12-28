import { NextResponse } from "next/server"
import { db } from "@/lib/db"

type Params = { params: { id: string } }

export async function POST(req: Request, ctx: any) {
  const params = ctx?.params && typeof ctx.params?.then === 'function' ? await ctx.params : ctx?.params ?? {};
  try {
    const tenantId = 1 // luego: de la sesión
    const leadId = Number(params.id)
    if (!Number.isFinite(leadId)) {
      return NextResponse.json({ error: "Invalid lead id" }, { status: 400 })
    }

    const body = await req.json()
    const stageKey = (body.stage_key as string | undefined)?.trim()
    const reason = (body.reason as string | undefined)?.trim() || null
    const source = (body.source as string | undefined) || "manual"
    const changedByUser = null // luego user.id

    if (!stageKey) {
      return NextResponse.json(
        { error: "stage_key is required" },
        { status: 400 },
      )
    }

    // Traer lead + stage actual
    const leadResult = await db.query(
      `
      SELECT l.id, l.tenant_id, l.pipeline_id, l.stage_id, ps.stage_key AS current_stage_key
      FROM leads l
      JOIN pipeline_stages ps ON ps.id = l.stage_id
      WHERE l.id = $1
      `,
      [leadId],
    )

    if (leadResult.rows.length === 0) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    const lead = leadResult.rows[0]

    if (lead.tenant_id !== tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (lead.current_stage_key === stageKey) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    // Buscar el stage objetivo dentro del mismo pipeline
    const stageResult = await db.query(
      `
      SELECT id
      FROM pipeline_stages
      WHERE pipeline_id = $1
        AND stage_key = $2
      `,
      [lead.pipeline_id, stageKey],
    )

    if (stageResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid stage_key for this pipeline" },
        { status: 400 },
      )
    }

    const newStageId = stageResult.rows[0].id as number

    await db.query("BEGIN")

    // Actualizar lead
    await db.query(
      `
      UPDATE leads
      SET stage_id = $1,
          updated_at = NOW()
      WHERE id = $2
      `,
      [newStageId, leadId],
    )

    // Registrar historial
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
      [
        lead.id,
        lead.stage_id, // old
        newStageId, // new
        changedByUser,
        source,
        reason,
      ],
    )

    await db.query("COMMIT")

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("🔥 Error en POST /api/leads/[id]/stage:", error)
    await db.query("ROLLBACK").catch(() => {})
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
