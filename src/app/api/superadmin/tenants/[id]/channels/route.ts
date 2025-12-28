import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdminOrPlan10 } from "@/lib/server/session";

type Ctx = { params: { id: string } } | { params: Promise<{ id: string }> };

async function getParamId(ctx: Ctx): Promise<number> {
  const p: any = (ctx as any)?.params;
  const resolved = p && typeof p.then === "function" ? await p : p;
  const id = Number(resolved?.id);
  if (!Number.isFinite(id)) throw new Error("BAD_ID");
  return id;
}

export async function GET(_: Request, ctx: Ctx) {
  try {
    const { session, isPlan10 } = await requireSuperAdminOrPlan10();
    const tenantId = await getParamId(ctx);
    if (isPlan10 && Number(session.tenantId) !== tenantId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { rows } = await db.query(
      `SELECT id, channel_type, provider, account_label, account_type, phone_e164,
              wa_business_account_id, wa_phone_number_id, provider_account_id,
              integration_id, is_default, is_active
       FROM channel_accounts WHERE tenant_id = $1 ORDER BY id`,
      [tenantId]
    );
    return NextResponse.json({ ok: true, data: rows });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "BAD_ID" ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { session, isPlan10 } = await requireSuperAdminOrPlan10();
    const tenantId = await getParamId(ctx);
    if (isPlan10 && Number(session.tenantId) !== tenantId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json();
    const {
      channel_type,
      provider,
      account_label,
      account_type,
      phone_e164,
      wa_business_account_id,
      wa_phone_number_id,
      provider_account_id,
      integration_id,
      is_default,
      is_active,
    } = body;

    if (!channel_type || !provider) {
      return NextResponse.json({ error: "channel_type and provider required" }, { status: 400 });
    }

    const { rows } = await db.query(
      `INSERT INTO channel_accounts (
         tenant_id, channel_type, provider, account_label, account_type, phone_e164,
         wa_business_account_id, wa_phone_number_id, provider_account_id,
         integration_id, is_default, is_active, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING *`,
      [
        tenantId,
        channel_type,
        provider,
        account_label || null,
        account_type || null,
        phone_e164 || null,
        wa_business_account_id || null,
        wa_phone_number_id || null,
        provider_account_id || null,
        integration_id || null,
        Boolean(is_default),
        Boolean(is_active),
      ]
    );

    return NextResponse.json({ ok: true, data: rows[0] }, { status: 201 });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "BAD_ID" ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
