import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdminOrPlan10 } from "@/lib/server/session";

type Ctx = { params: { id: string; workflowId: string } } | { params: Promise<{ id: string; workflowId: string }> };

async function getParamIds(ctx: Ctx): Promise<{ tenantId: number; workflowId: number }> {
  const p: any = (ctx as any)?.params;
  const resolved = p && typeof p.then === "function" ? await p : p;
  const tenantId = Number(resolved?.id);
  const workflowId = Number(resolved?.workflowId);
  if (!Number.isFinite(tenantId) || !Number.isFinite(workflowId)) throw new Error("BAD_ID");
  return { tenantId, workflowId };
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { session, isPlan10 } = await requireSuperAdminOrPlan10();
    const { tenantId, workflowId } = await getParamIds(ctx);
    if (isPlan10 && Number(session.tenantId) !== tenantId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json();
    const { key, name, engine, trigger_type, trigger_filter, integration_id, is_active } = body;

    const { rows } = await db.query(
      `UPDATE workflows
       SET key = COALESCE($3, key),
           name = COALESCE($4, name),
           engine = COALESCE($5, engine),
           trigger_type = COALESCE($6, trigger_type),
           trigger_filter = COALESCE($7::jsonb, trigger_filter),
           integration_id = COALESCE($8, integration_id),
           is_active = COALESCE($9, is_active),
           updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [
        workflowId,
        tenantId,
        key,
        name,
        engine,
        trigger_type,
        trigger_filter ? JSON.stringify(trigger_filter) : null,
        integration_id,
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
    const { tenantId, workflowId } = await getParamIds(ctx);
    if (isPlan10 && Number(session.tenantId) !== tenantId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    await db.query(
      `DELETE FROM workflows WHERE id = $1 AND tenant_id = $2`,
      [workflowId, tenantId]
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "BAD_ID" ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
