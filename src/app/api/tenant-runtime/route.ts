// src/app/api/tenant-runtime/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/server/session";

export const runtime = "nodejs";

// OFF real = behavior 'none' y minutes 0
const normalizeBehavior = (v: any) => {
  const s = String(v ?? "").toLowerCase().trim();
  if (s === "cooldown") return "cooldown";
  if (s === "none" || s === "off" || s === "") return "none";
  return "none";
};

const normalizeMinutes = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
};

async function getOrCreateRuntime(tenantId: number) {
  const found = await db.query(
    `select * from public.tenant_runtime_state where tenant_id = $1 limit 1`,
    [tenantId]
  );
  if (found.rows?.[0]) return found.rows[0];

  // IMPORTANTE: al crear, dejamos defaults seguros (cooldown OFF por default)
  const created = await db.query(
    `
    insert into public.tenant_runtime_state (
      tenant_id,
      human_outbound_ai_behavior,
      human_outbound_cooldown_minutes
    )
    values ($1, 'none', 0)
    returning *
    `,
    [tenantId]
  );
  return created.rows[0];
}

export async function GET() {
  try {
    const { tenantId } = await requireSession();
    const rt = await getOrCreateRuntime(tenantId);

    const behavior = normalizeBehavior(rt.human_outbound_ai_behavior);
    const minutes = normalizeMinutes(rt.human_outbound_cooldown_minutes);

    return NextResponse.json({
      ok: true,
      data: {
        tenant_id: tenantId,

        // Global kill switch (tenant)
        ai_force_off: !!rt.ai_force_off,
        ai_disabled_until: rt.ai_disabled_until ? rt.ai_disabled_until.toISOString() : null,
        ai_disabled_reason: rt.ai_disabled_reason ?? null,

        // Cooldown config (tenant)
        human_outbound_ai_behavior: behavior,
        human_outbound_cooldown_minutes: minutes,

        // Engagement features
        reengagement_enabled: !!rt.reengagement_enabled,
        welcome_enabled: !!rt.welcome_enabled,
      },
    });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json(
      { ok: false, error: "Failed to load tenant runtime", detail: msg },
      { status }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { tenantId } = await requireSession();
    await getOrCreateRuntime(tenantId);

    // switches
    const ai_force_off =
      typeof body.ai_force_off === "boolean" ? body.ai_force_off : undefined;

    const ai_disabled_until =
      typeof body.ai_disabled_until === "string" ? body.ai_disabled_until : undefined;

    const ai_disabled_reason =
      typeof body.ai_disabled_reason === "string" ? body.ai_disabled_reason : undefined;

    // cooldown config
    const human_behavior_in =
      typeof body.human_outbound_ai_behavior === "string"
        ? normalizeBehavior(body.human_outbound_ai_behavior)
        : undefined;

    const human_minutes_in =
      body.human_outbound_cooldown_minutes !== undefined
        ? normalizeMinutes(body.human_outbound_cooldown_minutes)
        : undefined;

    // UX: si apagan cooldown, opcional limpiar estados activos
    const clear_conversation_cooldowns =
      typeof body.clear_conversation_cooldowns === "boolean"
        ? body.clear_conversation_cooldowns
        : false;

    // Si behavior viene como none, forzamos minutes=0 (consistencia)
    const finalBehavior =
      human_behavior_in !== undefined ? human_behavior_in : undefined;

    const finalMinutes =
      finalBehavior === "none"
        ? 0
        : human_minutes_in !== undefined
          ? human_minutes_in
          : undefined;

    // Update tenant runtime
    const updated = await db.query(
      `
      update public.tenant_runtime_state
      set
        ai_force_off = coalesce($2, ai_force_off),
        ai_disabled_until = CASE
          WHEN $3::timestamptz IS NULL THEN ai_disabled_until
          ELSE $3::timestamptz
        END,
        ai_disabled_reason = coalesce($4, ai_disabled_reason),

        human_outbound_ai_behavior = coalesce($5, human_outbound_ai_behavior),
        human_outbound_cooldown_minutes = coalesce($6, human_outbound_cooldown_minutes),

        updated_at = now()
      where tenant_id = $1
      returning *
      `,
      [
        tenantId,
        ai_force_off ?? null,
        ai_disabled_until ?? null,
        ai_disabled_reason ?? null,
        finalBehavior ?? null,
        finalMinutes ?? null,
      ]
    );

    // Si apagaron cooldown y pidieron limpiar, limpiamos ai_disabled_until por conversaciones
    // (solo las que fueron causadas por outbound humano, para no matar otras razones)
    if (finalBehavior === "none" && clear_conversation_cooldowns) {
      await db.query(
        `
        update public.conversation_runtime_state
        set
          ai_disabled_until = null,
          ai_disabled_reason = null,
          updated_at = now()
        where tenant_id = $1
          and ai_disabled_reason = 'human_outbound'
        `,
        [tenantId]
      );
    }

    const row = updated.rows[0];
    const behavior = normalizeBehavior(row.human_outbound_ai_behavior);
    const minutes = normalizeMinutes(row.human_outbound_cooldown_minutes);

    return NextResponse.json({
      ok: true,
      data: {
        tenant_id: tenantId,

        ai_force_off: !!row.ai_force_off,
        ai_disabled_until: row.ai_disabled_until ? row.ai_disabled_until.toISOString() : null,
        ai_disabled_reason: row.ai_disabled_reason ?? null,

        human_outbound_ai_behavior: behavior,
        human_outbound_cooldown_minutes: minutes,
      },
    });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json(
      { ok: false, error: "Failed to update tenant runtime", detail: msg },
      { status }
    );
  }
}
