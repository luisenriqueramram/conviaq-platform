export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { tenantId, userId } = await requireSession();
    const p = await Promise.resolve(ctx.params);
    const leadId = Number(p.id);
    if (!Number.isFinite(leadId)) {
      return NextResponse.json({ ok: false, error: "Invalid lead id" }, { status: 400 });
    }
    const body = await req.json();
    const { name, dealValue, stageId, tagIds } = body;

    // Actualizar lead
    await db.query(
      `UPDATE leads SET name = $1, deal_value = $2, stage_id = $3, updated_at = NOW() WHERE id = $4 AND tenant_id = $5`,
      [name, dealValue, stageId, leadId, tenantId]
    );

    // Actualizar etiquetas (taggings)
    if (Array.isArray(tagIds)) {
      // Eliminar etiquetas actuales
      await db.query(`DELETE FROM taggings WHERE lead_id = $1`, [leadId]);
      // Insertar nuevas etiquetas
      for (const tagId of tagIds) {
        await db.query(
          `INSERT INTO taggings (lead_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [leadId, tagId]
        );
      }
    }

    // Registrar en bitácora (lead_activity_log)
    await db.query(
      `INSERT INTO lead_activity_log (lead_id, tenant_id, activity_type, description, performed_by_ai, metadata, created_at)
       VALUES ($1, $2, 'human_update', 'Actualización manual desde el panel', false, $3, NOW())`,
      [leadId, tenantId, JSON.stringify({ changes: 'Lead updated by user', userId })]
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (String(error?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("🔥 Error en PATCH /api/leads/[id]:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
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

    // Get lead with pipeline and stage info
    const leadResult = await db.query(
      `
      SELECT 
        l.id,
        l.tenant_id,
        l.pipeline_id,
        l.stage_id,
        l.contact_id,
        l.name,
        l.company,
        l.email,
        l.phone,
        l.deal_value,
        l.currency,
        l.summary_text,
        l.created_at,
        l.updated_at,
        ps.stage_key,
        ps.name AS stage_name,
        ps.color AS stage_color,
        p.name AS pipeline_name,
        c.name AS contact_name,
        c.wa_jid,
        c.phone_e164
      FROM leads l
      LEFT JOIN pipeline_stages ps ON ps.id = l.stage_id
      LEFT JOIN pipelines p ON p.id = l.pipeline_id
      LEFT JOIN contacts c ON c.id = l.contact_id
      WHERE l.id = $1 AND l.tenant_id = $2
      `,
      [leadId, tenantId]
    );

    if (leadResult.rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
    }

    const leadRow = leadResult.rows[0];

    // Get notes
    const notesResult = await db.query(
      `
      SELECT id, author_type, author_id, content, created_at
      FROM lead_notes
      WHERE lead_id = $1
      ORDER BY created_at DESC
      `,
      [leadId]
    );

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

    const dealValue = leadRow.deal_value as number | null;

    const payload = {
      id: String(leadRow.id),
      name: (leadRow.name as string) ?? "",
      company: leadRow.company ?? "",
      email: leadRow.email ?? "",
      phone: leadRow.phone ?? "",
      dealValue: dealValue ?? 0,
      currency: leadRow.currency ?? "MXN",
      contactId: leadRow.contact_id,
      contactName: leadRow.contact_name,
      waJid: leadRow.wa_jid,
      phone_e164: leadRow.phone_e164,
      pipelineId: leadRow.pipeline_id,
      pipelineName: leadRow.pipeline_name,
      stageId: leadRow.stage_id,
      stageName: leadRow.stage_name,
      stageColor: leadRow.stage_color,
      summaryText: leadRow.summary_text,
      createdAt: leadRow.created_at,
      updatedAt: leadRow.updated_at,
      notes: notesResult.rows.map((x: any) => ({
        id: String(x.id),
        content: x.content as string,
        authorType: x.author_type as string,
        authorId: x.author_id,
        createdAt: x.created_at as string,
      })),
      reminders: remindersResult.rows.map((x: any) => ({
        id: String(x.id),
        text: x.text as string,
        dueAt: x.due_at as string,
        active: Boolean(x.active),
        createdAt: x.created_at as string,
      })),
    };

    return NextResponse.json({ ok: true, data: payload });
  } catch (error: any) {
    if (String(error?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("🔥 Error en GET /api/leads/[id]:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
