import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdminOrPlan10 } from "@/lib/server/session";

type Ctx = { params: { id: string; appId: string } } | { params: Promise<{ id: string; appId: string }> };

async function getParamIds(ctx: Ctx): Promise<{ tenantId: number; appId: number }> {
  const p: any = (ctx as any)?.params;
  const resolved = p && typeof p.then === "function" ? await p : p;
  const tenantId = Number(resolved?.id);
  const appId = Number(resolved?.appId);
  if (!Number.isFinite(tenantId) || !Number.isFinite(appId)) throw new Error("BAD_ID");
  return { tenantId, appId };
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { session, isPlan10 } = await requireSuperAdminOrPlan10();
    const { tenantId, appId } = await getParamIds(ctx);
    if (isPlan10 && Number(session.tenantId) !== tenantId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json();
    const { key, name, ui_url, api_webhook_url, config, is_active } = body;

    const { rows } = await db.query(
      `UPDATE tenant_apps
       SET key = COALESCE($3, key),
           name = COALESCE($4, name),
           ui_url = COALESCE($5, ui_url),
           api_webhook_url = COALESCE($6, api_webhook_url),
           config = COALESCE($7::jsonb, config),
           is_active = COALESCE($8, is_active),
           updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [
        appId,
        tenantId,
        key,
        name,
        ui_url,
        api_webhook_url,
        config ? JSON.stringify(config) : null,
        is_active,
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
    const { tenantId, appId } = await getParamIds(ctx);
    if (isPlan10 && Number(session.tenantId) !== tenantId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    await db.query(
      `DELETE FROM tenant_apps WHERE id = $1 AND tenant_id = $2`,
      [appId, tenantId]
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "BAD_ID" ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
