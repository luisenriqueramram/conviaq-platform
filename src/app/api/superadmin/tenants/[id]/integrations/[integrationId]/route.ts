import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdminOrPlan10 } from "@/lib/server/session";

type Ctx = { params: { id: string; integrationId: string } } | { params: Promise<{ id: string; integrationId: string }> };

async function getParamIds(ctx: Ctx): Promise<{ tenantId: number; integrationId: number }> {
  const p: any = (ctx as any)?.params;
  const resolved = p && typeof p.then === "function" ? await p : p;
  const tenantId = Number(resolved?.id);
  const integrationId = Number(resolved?.integrationId);
  if (!Number.isFinite(tenantId) || !Number.isFinite(integrationId)) throw new Error("BAD_ID");
  return { tenantId, integrationId };
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { session, isPlan10 } = await requireSuperAdminOrPlan10();
    const { tenantId, integrationId } = await getParamIds(ctx);
    if (isPlan10 && Number(session.tenantId) !== tenantId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json();
    const { type, name, is_active, config } = body;

    const { rows } = await db.query(
      `UPDATE integrations
       SET type = COALESCE($3, type),
           name = COALESCE($4, name),
           is_active = COALESCE($5, is_active),
           config = COALESCE($6::jsonb, config),
           updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [integrationId, tenantId, type, name, is_active, config ? JSON.stringify(config) : null]
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
    const { tenantId, integrationId } = await getParamIds(ctx);
    if (isPlan10 && Number(session.tenantId) !== tenantId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    await db.query(
      `DELETE FROM integrations WHERE id = $1 AND tenant_id = $2`,
      [integrationId, tenantId]
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "BAD_ID" ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
