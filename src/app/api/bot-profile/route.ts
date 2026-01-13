// src/app/api/bot-profile/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/server/session";

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
    const { tenantId } = await requireSession();
    const profile = await getOrCreateActiveProfile(tenantId);
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
    const { tenantId } = await requireSession();
    const body = await req.json();
    const patch = {
      ai_enabled: typeof body.ai_enabled === "boolean" ? body.ai_enabled : undefined,
    };
    const profile = await getOrCreateActiveProfile(tenantId);
    const updated = await db.query(
      `
      update public.bot_profiles
      set
        ai_enabled = coalesce($2, ai_enabled),
        config_version = config_version + 1,
        updated_at = now()
      where id = $1
      returning *
      `,
      [profile.id, patch.ai_enabled ?? null]
    );
    return NextResponse.json({ ok: true, data: { profile: updated.rows[0] } });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Failed to update bot profile", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
