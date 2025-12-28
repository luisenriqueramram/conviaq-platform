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
      `SELECT id, key, name, engine, trigger_type, trigger_filter, integration_id, is_active
       FROM workflows WHERE tenant_id = $1 ORDER BY id`,
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
    const { key, name, engine, trigger_type, trigger_filter, integration_id, is_active } = body;

    if (!key || !name) {
      return NextResponse.json({ error: "key and name required" }, { status: 400 });
    }

    const { rows } = await db.query(
      `INSERT INTO workflows (tenant_id, key, name, engine, trigger_type, trigger_filter, integration_id, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [
        tenantId,
        key,
        name,
        engine || null,
        trigger_type || null,
        trigger_filter ? JSON.stringify(trigger_filter) : null,
        integration_id || null,
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
