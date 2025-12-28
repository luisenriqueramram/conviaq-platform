import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdminOrPlan10 } from "@/lib/server/session";

type Ctx = { params: { id: string; channelId: string } } | { params: Promise<{ id: string; channelId: string }> };

async function getParamIds(ctx: Ctx): Promise<{ tenantId: number; channelId: number }> {
  const p: any = (ctx as any)?.params;
  const resolved = p && typeof p.then === "function" ? await p : p;
  const tenantId = Number(resolved?.id);
  const channelId = Number(resolved?.channelId);
  if (!Number.isFinite(tenantId) || !Number.isFinite(channelId)) throw new Error("BAD_ID");
  return { tenantId, channelId };
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { session, isPlan10 } = await requireSuperAdminOrPlan10();
    const { tenantId, channelId } = await getParamIds(ctx);
    if (isPlan10 && Number(session.tenantId) !== tenantId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json();
    const fields = {
      channel_type: body.channel_type,
      provider: body.provider,
      account_label: body.account_label,
      account_type: body.account_type,
      phone_e164: body.phone_e164,
      wa_business_account_id: body.wa_business_account_id,
      wa_phone_number_id: body.wa_phone_number_id,
      provider_account_id: body.provider_account_id,
      integration_id: body.integration_id,
      is_default: body.is_default,
      is_active: body.is_active,
    };

    const { rows } = await db.query(
      `UPDATE channel_accounts
       SET channel_type = COALESCE($3, channel_type),
           provider = COALESCE($4, provider),
           account_label = COALESCE($5, account_label),
           account_type = COALESCE($6, account_type),
           phone_e164 = COALESCE($7, phone_e164),
           wa_business_account_id = COALESCE($8, wa_business_account_id),
           wa_phone_number_id = COALESCE($9, wa_phone_number_id),
           provider_account_id = COALESCE($10, provider_account_id),
           integration_id = COALESCE($11, integration_id),
           is_default = COALESCE($12, is_default),
           is_active = COALESCE($13, is_active),
           updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [
        channelId,
        tenantId,
        fields.channel_type,
        fields.provider,
        fields.account_label,
        fields.account_type,
        fields.phone_e164,
        fields.wa_business_account_id,
        fields.wa_phone_number_id,
        fields.provider_account_id,
        fields.integration_id,
        fields.is_default,
        fields.is_active,
      ]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: rows[0] });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "BAD_ID" ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
  try {
    const { session, isPlan10 } = await requireSuperAdminOrPlan10();
    const { tenantId, channelId } = await getParamIds(ctx);
    if (isPlan10 && Number(session.tenantId) !== tenantId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    await db.query(
      `DELETE FROM channel_accounts WHERE id = $1 AND tenant_id = $2`,
      [channelId, tenantId]
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "BAD_ID" ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
