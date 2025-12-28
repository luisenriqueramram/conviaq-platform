// src/app/api/conversations/[id]/runtime/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/server/session";

function getIdFromUrl(req: Request) {
  const url = new URL(req.url);
  // /api/conversations/4/runtime  -> ["api","conversations","4","runtime"]
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("conversations");
  const raw = idx >= 0 ? parts[idx + 1] : null;

  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isInteger(n) ? n : null;
}

export async function GET(req: Request) {
  try {
    const { tenantId } = await requireSession();

    const conversationId = getIdFromUrl(req);
    if (!conversationId) {
      return NextResponse.json(
        { ok: false, error: "Invalid conversation id", debug: { url: req.url } },
        { status: 400 }
      );
    }

    const q = `
      select ai_force_off, ai_disabled_until, ai_disabled_reason, updated_at
      from public.conversation_runtime_state
      where tenant_id = $1 and conversation_id = $2
      limit 1
    `;
    const { rows } = await db.query(q, [tenantId, conversationId]);
    const row = rows[0];

    return NextResponse.json({
      ok: true,
      conversationId,
      ai: {
        force_off: row?.ai_force_off ?? false,
        disabled_until: row?.ai_disabled_until ?? null,
        reason: row?.ai_disabled_reason ?? null,
        updated_at: row?.updated_at ?? null,
      },
    });
  } catch (err: any) {
    if (String(err?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET runtime error", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { tenantId } = await requireSession();

    const conversationId = getIdFromUrl(req);
    if (!conversationId) {
      return NextResponse.json(
        { ok: false, error: "Invalid conversation id", debug: { url: req.url } },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const clear = body?.clear === true;
    const forceOff = clear ? false : (typeof body?.force_off === "boolean" ? body.force_off : null);
    const disableMinutes = clear
      ? null
      : (Number.isFinite(Number(body?.disable_minutes)) ? Number(body.disable_minutes) : null);
    const reason = clear ? null : (typeof body?.reason === "string" ? body.reason : null);

    const upsert = `
      insert into public.conversation_runtime_state
        (tenant_id, conversation_id, ai_force_off, ai_disabled_until, ai_disabled_reason, updated_at)
      values
        (
          $1,
          $2,
          coalesce($3::boolean, false),
          case
            when $4::int is null then null
            else now() + make_interval(mins => $4::int)
          end,
          $5::text,
          now()
        )
      on conflict (tenant_id, conversation_id)
      do update set
        ai_force_off = coalesce($3::boolean, public.conversation_runtime_state.ai_force_off),
        ai_disabled_until = case
          when $4::int is null then public.conversation_runtime_state.ai_disabled_until
          else now() + make_interval(mins => $4::int)
        end,
        ai_disabled_reason = coalesce($5::text, public.conversation_runtime_state.ai_disabled_reason),
        updated_at = now()
      returning ai_force_off, ai_disabled_until, ai_disabled_reason, updated_at
    `;

    const { rows } = await db.query(upsert, [tenantId, conversationId, forceOff, disableMinutes, reason]);
    const row = rows[0];

    return NextResponse.json({
      ok: true,
      conversationId,
      ai: {
        force_off: row?.ai_force_off ?? false,
        disabled_until: row?.ai_disabled_until ?? null,
        reason: row?.ai_disabled_reason ?? null,
        updated_at: row?.updated_at ?? null,
      },
    });
  } catch (err: any) {
    if (String(err?.message) === "UNAUTHORIZED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH runtime error", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
