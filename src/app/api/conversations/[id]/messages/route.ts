import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDefaultEvolutionWhatsAppAccount, evolutionTryFetch } from "@/lib/evolution";
import { requireSession } from '@/lib/server/session';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

function toAbsolute(url: string) {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  // Si no hay SUPABASE_URL, no intentamos “absolutizar”
  if (!SUPABASE_URL) return url;

  return `${SUPABASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function toParts(content_text: string | null, metadata: any) {
  const parts: any[] = [];
  const text = (content_text ?? "").trim();

  if (text && text !== "null") parts.push({ type: "text", text });

  const mediaArr = metadata?.media;
  if (Array.isArray(mediaArr)) {
    for (const m of mediaArr) {
      const kind = m?.kind ?? "unknown";
      const mime = m?.mime ?? null;
      const url = m?.url ? toAbsolute(m.url) : null;
      if (!url) continue;

      const media = {
        kind,
        mime,
        url,
        caption: m?.caption ?? null,
        storage_key: m?.storage_key ?? null,
      };

      if (kind === "image" || mime?.startsWith("image/")) parts.push({ type: "image", media });
      else if (kind === "audio" || mime?.startsWith("audio/")) parts.push({ type: "audio", media });
      else parts.push({ type: "file", media });
    }
  }

  if (parts.length === 0) parts.push({ type: "unknown", reason: "empty_message" });
  return parts;
}

function getIdFromUrl(req: Request) {
  const { pathname } = new URL(req.url);
  const parts = pathname.split("/").filter(Boolean);
  return parts[2]; // ["api","conversations",":id","messages"]
}

export async function GET(req: Request) {
  try {
    const idRaw = getIdFromUrl(req);
    const conversationId = Number(idRaw);

    if (!idRaw || !Number.isFinite(conversationId)) {
      return NextResponse.json({ error: "Invalid conversation id", idRaw }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? "50") || 50, 200);
    const offset = Number(searchParams.get("offset") ?? "0") || 0;

    const res = await db.query(
      `
      select id, tenant_id, conversation_id, provider, direction, sender_type,
             content_text, message_type, metadata, status, sent_at, created_at
      from public.messages
      where conversation_id = $1
      order by coalesce(sent_at, created_at) desc, id desc
      limit $2 offset $3;
      `,
      [conversationId, limit, offset]
    );

    const messages = res.rows.map((r: any) => {
      const ts = r.sent_at ?? r.created_at;
      const iso = ts ? new Date(ts).toISOString() : null;

      return {
        id: String(r.id),
        direction: r.direction,
        sender_type: r.sender_type ?? null,
        metadata: r.metadata ?? null,
        created_at: iso,
        parts: toParts(r.content_text, r.metadata),
      };
    });

    return NextResponse.json({ conversationId, count: messages.length, messages });
  } catch (err: any) {
    return NextResponse.json(
      { error: "messages_route_failed", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const idRaw = getIdFromUrl(req);
    const conversationId = Number(idRaw);

    if (!idRaw || !Number.isFinite(conversationId)) {
      return NextResponse.json({ error: 'Invalid conversation id', idRaw }, { status: 400 });
    }

    const body = await req.json();
    const text = (body.text as string | undefined) ?? '';
    if (!text.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    // Obtener tenant desde sesión
    let tenantId = 1;
    try {
      const s = await requireSession();
      tenantId = s.tenantId;
    } catch (e) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    // Verificar que la conversación existe y pertenece al tenant
    const convRes = await db.query(
      `select id, tenant_id, channel_type from conversations where id = $1 limit 1`,
      [conversationId]
    );
    if (convRes.rows.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    const conv = convRes.rows[0];
    if (conv.tenant_id !== tenantId) {
      // Log for debugging
      console.error('Forbidden: tenant mismatch', { sessionTenant: tenantId, convTenant: conv.tenant_id, conversationId: conversationId });
      // In development return diagnostic info to client to aid debugging
      const body: any = { error: 'Forbidden' };
      if (process.env.NODE_ENV !== 'production') {
        body.debug = { sessionTenant: tenantId, convTenant: conv.tenant_id };
      }
      return NextResponse.json(body, { status: 403 });
    }

    // Intentar determinar instancia evolution por defecto para el tenant
    let instanceName: string | null = null;
    try {
      const acc = await getDefaultEvolutionWhatsAppAccount(tenantId);
      instanceName = acc?.provider_account_id ?? null;
    } catch (e) {
      instanceName = null;
    }

    // Buscar contacto relacionado para obtener identificador de destino (wa_jid o phone_e164)
    const contactRes = await db.query(
      `
      SELECT ct.id AS contact_id, ct.wa_jid, ct.phone_e164, c.channel_identifier, c.channel_account_id
      FROM conversations c
      LEFT JOIN contacts ct ON c.contact_id = ct.id
      WHERE c.id = $1 AND c.tenant_id = $2
      LIMIT 1
      `,
      [conversationId, tenantId]
    );

    const contactRow: any = contactRes.rows[0] ?? null;
    const contactId = contactRow?.contact_id ?? null;
    const channelAccountId = contactRow?.channel_account_id ?? null;
    const toJid = contactRow?.wa_jid ?? null;
    const toE164 = contactRow?.phone_e164 ?? null;
    const channelIdentifier = contactRow?.channel_identifier ?? null;

    const metadata: any = {
      media: [],
      instance: instanceName,
      to_jid: toJid,
      to_e164: toE164,
      channel_identifier: channelIdentifier,
      source: 'portal',
    };

    if (!toJid && !toE164 && !channelIdentifier) {
      console.warn('No recipient identifier found for conversation', { conversationId, tenantId });
    }

    const insert = await db.query(
      `
      INSERT INTO messages (tenant_id, conversation_id, provider, direction, sender_type, content_text, message_type, metadata, status, contact_id, channel_account_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, created_at
      `,
      [tenantId, conversationId, 'evolution', 'outbound', 'human', text.trim(), 'text', metadata, 'queued', contactId, channelAccountId]
    );

    const row = insert.rows[0];

    // Intentar enviar inmediatamente a Evolution si tenemos instancia y destinatario
    let evolutionResult: any = null;
    if (instanceName && (toE164 || toJid || channelIdentifier)) {
      // Normalizar número: preferir phone_e164, fallback a channelIdentifier or wa_jid
      const normalizeNumber = (raw: any) => {
        if (!raw) return null;
        const s = String(raw);
        // extraer dígitos
        const digits = s.replace(/\D+/g, '');
        return digits || null;
      };

      const number = normalizeNumber(toE164) || normalizeNumber(channelIdentifier) || normalizeNumber(toJid);

      if (number) {
        const sendBody: any = { number, text: text.trim() };

        const instanceHeaders: Record<string, string> = {
          instance: instanceName,
          'Instance-Name': instanceName,
          'X-Instance-Name': instanceName,
          'Content-Type': 'application/json',
        };

        try {
          const paths = [`/message/sendText/${encodeURIComponent(instanceName)}`, `/message/sendText`];
          const r = await evolutionTryFetch(paths, { method: 'POST', headers: instanceHeaders, body: JSON.stringify(sendBody) });
          evolutionResult = { url: r?.url ?? null, status: r?.res?.status ?? null, raw: r?.json ?? null };

          if (r && r.res?.ok) {
            // Map evolution status to local message status
            const evoStatus = (r.json?.status ?? '').toString().toUpperCase();
            const localStatus = evoStatus === 'PENDING' ? 'pending' : evoStatus === 'SENT' || evoStatus === 'DELIVERED' ? 'sent' : 'queued';

            // Extract provider_message_id from Evolution response
            const providerMessageId = r.json?.data?.key?.id ?? r.json?.key?.id ?? null;
            
            const newMetadata = { ...metadata, evolution_response: r.json };
            const rawPayload = JSON.stringify(r.json);

            await db.query(
              `UPDATE messages SET status = $1, ${localStatus === 'sent' ? 'sent_at = now(),' : ''} metadata = $3, provider_message_id = $4, raw_payload = $5 WHERE id = $2`,
              [localStatus, row.id, newMetadata, providerMessageId, rawPayload]
            );
          }
        } catch (e) {
          console.error('Evolution send error', e);
        }
      }
    }

    const payload = {
      id: String(row.id),
      direction: 'outbound',
      sender_type: 'human',
      created_at: row.created_at,
      parts: [{ type: 'text', text: text.trim() }],
      metadata: { ...metadata, evolution_result: evolutionResult },
    };

    return NextResponse.json({ ok: true, message: payload }, { status: 201 });
  } catch (err: any) {
    console.error('POST messages route error', err);
    return NextResponse.json({ error: 'messages_post_failed', detail: err?.message ?? String(err) }, { status: 500 });
  }
}
