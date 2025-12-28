import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/server/session";

export async function GET(req: Request) {
  try {
    const { tenantId } = await requireSession();

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
    const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS count FROM leads WHERE tenant_id = $1`,
      [tenantId]
    );
    const count = countResult.rows?.[0]?.count ?? 0;

    // Get leads with contact and pipeline info
    const leadsResult = await db.query(
      `
      SELECT 
        l.id,
        l.name,
        l.company,
        l.email,
        l.phone,
        l.deal_value,
        l.currency,
        l.created_at,
        l.updated_at,
        l.stage_id,
        l.pipeline_id,
        l.contact_id,
        c.name as contact_name,
        c.wa_jid,
        c.phone_e164,
        ps.name as stage_name,
        p.name as pipeline_name
      FROM leads l
      LEFT JOIN contacts c ON c.id = l.contact_id
      LEFT JOIN pipeline_stages ps ON ps.id = l.stage_id
      LEFT JOIN pipelines p ON p.id = l.pipeline_id
      WHERE l.tenant_id = $1
      ORDER BY l.updated_at DESC
      LIMIT $2 OFFSET $3
      `,
      [tenantId, limit, offset]
    );

    const leads = leadsResult.rows.map((r: any) => ({
      id: r.id,
      name: r.name ?? r.contact_name ?? "Sin nombre",
      company: r.company,
      email: r.email,
      phone: r.phone,
      dealValue: r.deal_value,
      currency: r.currency,
      contactId: r.contact_id,
      contactName: r.contact_name,
      waJid: r.wa_jid,
      stageId: r.stage_id,
      stageName: r.stage_name,
      pipelineId: r.pipeline_id,
      pipelineName: r.pipeline_name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    // Additionally fetch contacts that have conversations but are not yet leads
    const contactsResult = await db.query(
      `
      SELECT ct.id, ct.name, ct.wa_jid, ct.phone_e164, ct.email
      FROM contacts ct
      WHERE ct.tenant_id = $1
        AND ct.id IN (
          SELECT DISTINCT contact_id FROM conversations WHERE tenant_id = $1 AND contact_id IS NOT NULL
        )
        AND ct.id NOT IN (
          SELECT DISTINCT contact_id FROM leads WHERE tenant_id = $1 AND contact_id IS NOT NULL
        )
      `,
      [tenantId]
    );

    const contactRows = contactsResult.rows.map((c: any) => ({
      id: -Number(c.id), // negative id to avoid collision with real leads
      name: c.name ?? 'Sin nombre',
      company: null,
      email: c.email || null,
      phone: c.phone_e164 || null,
      dealValue: null,
      currency: null,
      contactId: c.id,
      contactName: c.name,
      waJid: c.wa_jid,
      stageId: null,
      stageName: null,
      pipelineId: null,
      pipelineName: null,
      createdAt: null,
      updatedAt: null,
      isContact: true,
    }));

    const merged = [...leads, ...contactRows];

    return NextResponse.json({
      ok: true,
      data: {
        count: Number(count) + contactRows.length,
        leads: merged,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    if (String(error?.message) === "UNAUTHORIZED") {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    console.error("🔥 Error en GET /api/leads:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId } = await requireSession();
    const body = await req.json();

    const { name, company, email, phone, dealValue, pipelineId, stageId, contactId } = body;

    if (!name || !pipelineId || !stageId) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: name, pipelineId, stageId" },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
      INSERT INTO leads (tenant_id, name, company, email, phone, deal_value, pipeline_id, stage_id, contact_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id, name, company, email, phone, deal_value, created_at
      `,
      [tenantId, name, company || null, email || null, phone || null, dealValue || null, pipelineId, stageId, contactId || null]
    );

    const lead = result.rows[0];

    return NextResponse.json({
      ok: true,
      data: lead,
    });
  } catch (error: any) {
    if (String(error?.message) === "UNAUTHORIZED") {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    console.error("🔥 Error en POST /api/leads:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
