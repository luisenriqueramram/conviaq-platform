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
      `SELECT id, type, name, is_active, config FROM integrations WHERE tenant_id = $1 ORDER BY id`,
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
    const { type, name, is_active, config } = body;

    if (!type || !name) {
      return NextResponse.json({ error: "type and name required" }, { status: 400 });
    }

    const { rows } = await db.query(
      `INSERT INTO integrations (tenant_id, type, name, is_active, config, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [tenantId, type, name, Boolean(is_active), config ? JSON.stringify(config) : null]
    );

    return NextResponse.json({ ok: true, data: rows[0] }, { status: 201 });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "BAD_ID" ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
