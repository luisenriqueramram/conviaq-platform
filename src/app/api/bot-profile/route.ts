// src/app/api/bot-profile/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const TENANT_ID = 1;

async function getOrCreateActiveProfile(tenantId: number) {
  // 1) Busca el activo
  const found = await db.query(
    `
    select *
    from public.bot_profiles
    where tenant_id = $1 and is_active = true
    order by id desc
    limit 1
    `,
    [tenantId]
  );

  if (found.rows?.[0]) return found.rows[0];

  // 2) Si no existe, crea default
  const created = await db.query(
    `
    insert into public.bot_profiles
      (tenant_id, name, is_active, ai_enabled, language, config_version)
    values
      ($1, 'Default', true, true, 'es-MX', 1)
    returning *
    `,
    [tenantId]
  );

  return created.rows[0];
}

export async function GET() {
  try {
    const profile = await getOrCreateActiveProfile(TENANT_ID);
    return NextResponse.json({ ok: true, data: { profile } });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Failed to load bot profile", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    // Whitelist estricto de campos editables (MVP)
    const patch = {
      name: typeof body.name === "string" ? body.name : undefined,
      ai_enabled: typeof body.ai_enabled === "boolean" ? body.ai_enabled : undefined,

      tone: typeof body.tone === "string" ? body.tone : undefined,
      attitude: typeof body.attitude === "string" ? body.attitude : undefined,
      purpose: typeof body.purpose === "string" ? body.purpose : undefined,
      language: typeof body.language === "string" ? body.language : undefined,

      use_custom_prompt: typeof body.use_custom_prompt === "boolean" ? body.use_custom_prompt : undefined,
      custom_prompt: typeof body.custom_prompt === "string" ? body.custom_prompt : undefined,

      // JSONs
      policies: body.policies && typeof body.policies === "object" ? body.policies : undefined,
      tools: body.tools && typeof body.tools === "object" ? body.tools : undefined,
    };

    const profile = await getOrCreateActiveProfile(TENANT_ID);

    const updated = await db.query(
      `
      update public.bot_profiles
      set
        name = coalesce($2, name),
        ai_enabled = coalesce($3, ai_enabled),
        tone = coalesce($4, tone),
        attitude = coalesce($5, attitude),
        purpose = coalesce($6, purpose),
        language = coalesce($7, language),
        use_custom_prompt = coalesce($8, use_custom_prompt),
        custom_prompt = coalesce($9, custom_prompt),
        policies = coalesce($10::jsonb, policies),
        tools = coalesce($11::jsonb, tools),
        config_version = config_version + 1,
        updated_at = now()
      where id = $1
      returning *
      `,
      [
        profile.id,
        patch.name ?? null,
        patch.ai_enabled ?? null,
        patch.tone ?? null,
        patch.attitude ?? null,
        patch.purpose ?? null,
        patch.language ?? null,
        patch.use_custom_prompt ?? null,
        patch.custom_prompt ?? null,
        patch.policies ? JSON.stringify(patch.policies) : null,
        patch.tools ? JSON.stringify(patch.tools) : null,
      ]
    );

    return NextResponse.json({ ok: true, data: { profile: updated.rows[0] } });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Failed to update bot profile", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
