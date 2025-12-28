import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdminOrPlan10 } from "@/lib/server/session";

type Ctx = { params: { id: string; userId: string } } | { params: Promise<{ id: string; userId: string }> };

async function getParamIds(ctx: Ctx): Promise<{ tenantId: number; userId: number }> {
  const p: any = (ctx as any)?.params;
  const resolved = p && typeof p.then === "function" ? await p : p;
  const tenantId = Number(resolved?.id);
  const userId = Number(resolved?.userId);
  if (!Number.isFinite(tenantId) || !Number.isFinite(userId)) throw new Error("BAD_ID");
  return { tenantId, userId };
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { session, isPlan10 } = await requireSuperAdminOrPlan10();
    const { tenantId, userId } = await getParamIds(ctx);
    if (isPlan10 && Number(session.tenantId) !== tenantId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, role, is_active } = body;

    // If email is being changed, check for conflicts
    if (email) {
      const existing = await db.query(`SELECT id FROM users WHERE email = $1 AND id != $2`, [email, userId]);
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: "Email already exists" }, { status: 400 });
      }
    }

    const { rows } = await db.query(
      `UPDATE users
       SET name = COALESCE($3, name),
           email = COALESCE($4, email),
           role = COALESCE($5, role),
           is_active = COALESCE($6, is_active),
           updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, name, email, role, is_active`,
      [userId, tenantId, name, email, role, is_active]
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
    const { tenantId, userId } = await getParamIds(ctx);
    if (isPlan10 && Number(session.tenantId) !== tenantId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    await db.query(
      `DELETE FROM users WHERE id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "BAD_ID" ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
