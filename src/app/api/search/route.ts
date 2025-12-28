import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/server/session";

type SearchResult = {
  id: string;
  type: "lead" | "conversation" | "contact" | "section";
  title: string;
  subtitle?: string;
  href: string;
  metadata?: Record<string, any>;
};

export async function GET(req: Request) {
  try {
    const { tenantId } = await requireSession();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

    if (!q || q.length < 2) {
      return NextResponse.json({
        ok: true,
        data: [],
        message: "Query too short",
      });
    }

    const results: SearchResult[] = [];

    // Get tenant plan early to filter results
    const tenantPlanRes = await db.query(`SELECT plan_id FROM tenants WHERE id = $1 LIMIT 1`, [tenantId]);
    const tenantPlanId = tenantPlanRes.rows?.[0]?.plan_id ?? null;
    const planId = tenantPlanId ? Number(tenantPlanId) : 1;

    // 1. Search in Leads (by name, email, phone, company) - ONLY for plan 10
    if (planId === 10) {
      try {
        const leadsResult = await db.query(
          `
          SELECT id, name, email, phone, company
          FROM leads
          WHERE tenant_id = $1
            AND (
              LOWER(name) ILIKE $2
              OR LOWER(email) ILIKE $2
              OR LOWER(phone) ILIKE $2
              OR LOWER(company) ILIKE $2
            )
          LIMIT 15
          `,
          [tenantId, `%${q}%`]
        );

        leadsResult.rows.forEach((row: any) => {
          results.push({
            id: `lead-${row.id}`,
            type: "lead",
            title: row.name || `Lead ${row.id}`,
            subtitle: [row.phone, row.email, row.company]
              .filter(Boolean)
              .join(" • "),
            href: `/portal/leads/${encodeURIComponent(row.id)}`,
            metadata: {
              leadId: row.id,
              phone: row.phone,
              email: row.email,
            },
          });
        });
      } catch (err) {
        console.error("Error searching leads:", err);
      }
    }

    // 2. Search in Contacts (by phone, jid, name)
    try {
      const contactsResult = await db.query(
        `
        SELECT id, name, phone, wa_jid
        FROM contacts
        WHERE tenant_id = $1
          AND (
            LOWER(name) ILIKE $2
            OR phone ILIKE $2
            OR LOWER(wa_jid) ILIKE $2
          )
        LIMIT 10
        `,
        [tenantId, `%${q}%`]
      );

      contactsResult.rows.forEach((row: any) => {
        results.push({
          id: `contact-${row.id}`,
          type: "contact",
          title: row.name || row.phone || row.wa_jid,
          subtitle: [row.phone, row.wa_jid].filter(Boolean).join(" • "),
          href: `/portal/leads/${encodeURIComponent(row.id)}`,
          metadata: {
            contactId: row.id,
            phone: row.phone,
            waJid: row.wa_jid,
          },
        });
      });
    } catch (err) {
      console.error("Error searching contacts:", err);
    }

    // 3. Search in Conversations (by contact name/phone, channel identifier, last message)
    try {
      const convResult = await db.query(
        `
        SELECT 
          c.id,
          c.channel_identifier,
          ct.name AS contact_name,
          (
            SELECT content_text
            FROM messages m
            WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
            ORDER BY m.created_at DESC
            LIMIT 1
          ) AS last_message
        FROM conversations c
        JOIN contacts ct ON ct.id = c.contact_id
        WHERE c.tenant_id = $1
          AND (
            LOWER(ct.name) ILIKE $2
            OR LOWER(ct.phone_e164) ILIKE $2
            OR LOWER(c.channel_identifier) ILIKE $2
            OR LOWER(
              COALESCE(
                (
                  SELECT content_text FROM messages m
                  WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
                  ORDER BY m.created_at DESC
                  LIMIT 1
                ), ''
              )
            ) ILIKE $2
          )
        ORDER BY c.last_message_at DESC NULLS LAST, c.started_at DESC
        LIMIT 10
        `,
        [tenantId, `%${q}%`]
      );

      convResult.rows.forEach((row: any) => {
        results.push({
          id: `conv-${row.id}`,
          type: "conversation",
          title: row.contact_name || row.channel_identifier || `Conversación ${row.id}`,
          subtitle: row.last_message
            ? `"${row.last_message.substring(0, 50)}..."`
            : undefined,
          href: `/portal/conversations?cid=${encodeURIComponent(row.id)}`,
          metadata: {
            convId: row.id,
            channelIdentifier: row.channel_identifier,
          },
        });
      });
    } catch (err) {
      console.error("Error searching conversations:", err);
    }

    // 4. Hardcoded section suggestions based on keywords
    // Plan mapping:
    // plan 1: resumen, conversaciones, pantalla personalizada, configuracion, conectar cuenta
    // plan 2: same as 1 + bot-config
    // plan 3: same as 2 + calendario
    // plan 4: everything
    // Leads está bloqueado para todos excepto plan 10

    const allowedByPlan: Record<number, string[]> = {
      1: ['/portal', '/portal/conversations', '/portal/channels/whatsapp', '/portal/custom-screens', '/portal/settings'],
      2: ['/portal', '/portal/conversations', '/portal/channels/whatsapp', '/portal/custom-screens', '/portal/settings', '/portal/bot-config'],
      3: ['/portal', '/portal/conversations', '/portal/channels/whatsapp', '/portal/custom-screens', '/portal/settings', '/portal/bot-config', '/portal/calendar'],
      4: ['/portal', '/portal/conversations', '/portal/pipelines', '/portal/calendar', '/portal/reminders', '/portal/metrics', '/portal/settings', '/portal/channels/whatsapp', '/portal/custom-screens', '/portal/bot-config'],
      10: ['/portal', '/portal/leads', '/portal/conversations', '/portal/pipelines', '/portal/calendar', '/portal/reminders', '/portal/metrics', '/portal/settings', '/portal/channels/whatsapp', '/portal/custom-screens', '/portal/bot-config'],
    };

    const allowed = allowedByPlan[planId] || allowedByPlan[1];

    const sections: { label: string; href: string; icon: string }[] = [
      { label: "Resumen", href: "/portal", icon: "🏠" },
      { label: "Leads", href: "/portal/leads", icon: "👥" },
      { label: "Conversaciones", href: "/portal/conversations", icon: "💬" },
      { label: "Pipeline", href: "/portal/pipelines", icon: "🔗" },
      { label: "Calendario", href: "/portal/calendar", icon: "📅" },
      { label: "Recordatorios", href: "/portal/reminders", icon: "🔔" },
      { label: "Métricas", href: "/portal/metrics", icon: "📊" },
      { label: "Configuración", href: "/portal/settings", icon: "⚙️" },
      { label: "Pantallas Personalizadas", href: "/portal/custom-screens", icon: "✨" },
      { label: "Configuración de Bot", href: "/portal/bot-config", icon: "🤖" },
      { label: "Conectar Cuenta", href: "/portal/channels/whatsapp", icon: "📱" },
    ].filter((s) => allowed.includes(s.href));

    sections.forEach((section) => {
      if (section.label.toLowerCase().includes(q)) {
        results.push({
          id: `section-${section.label}`,
          type: "section",
          title: section.label,
          href: section.href,
          metadata: {
            icon: section.icon,
          },
        });
      }
    });

    // Sort results: exact matches first, then by type priority
    const typePriority: Record<string, number> = {
      lead: 1,
      contact: 1,
      conversation: 2,
      section: 3,
    };

    results.sort((a, b) => {
      const aExact = a.title.toLowerCase().startsWith(q) ? 0 : 1;
      const bExact = b.title.toLowerCase().startsWith(q) ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return typePriority[a.type] - typePriority[b.type];
    });

    return NextResponse.json({
      ok: true,
      data: results.slice(0, 20),
    });
  } catch (error: any) {
    if (String(error?.message) === "UNAUTHORIZED") {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    console.error("🔥 Error en GET /api/search:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
