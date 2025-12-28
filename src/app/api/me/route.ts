import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/server/session";

type UserRow = {
  user_id: number;
  user_name: string;
  email: string;
  role: string | null;
  tenant_id: number;
  tenant_name: string;
  tenant_slug: string;
  plan_id: number | null;
  plan_name: string | null;
};

export async function GET() {
  try {
    const session = await requireSession();

    const { rows } = await db.query<UserRow>(
      `
      SELECT 
        u.id AS user_id,
        u.name AS user_name,
        u.email,
        u.role,
        t.id AS tenant_id,
        t.name AS tenant_name,
        t.slug AS tenant_slug,
        p.id AS plan_id,
        p.name AS plan_name
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN plans p ON t.plan_id = p.id
      WHERE u.id = $1 AND u.tenant_id = $2
      LIMIT 1
      `,
      [session.userId, session.tenantId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = rows[0];

    // Determine superadmin (matches logic of requireSuperAdminOrPlan10)
    const superEmail = process.env.SUPERADMIN_EMAIL;
    const superId = process.env.SUPERADMIN_USER_ID ? Number(process.env.SUPERADMIN_USER_ID) : null;
    const isSuperByEmail = superEmail && user.email && user.email.toLowerCase() === superEmail.toLowerCase();
    const isSuperById = superId != null && Number(user.user_id) === superId;
    const isSuperAdmin = Boolean(isSuperByEmail || isSuperById);

    let features: string[] = [];
    if (user.plan_id) {
      const featuresResult = await db.query(
        `SELECT feature_key FROM plan_features WHERE plan_id = $1`,
        [user.plan_id]
      );
      features = featuresResult.rows.map((r: { feature_key: string }) => r.feature_key);
    }

    return NextResponse.json({
      user: {
        id: user.user_id,
        name: user.user_name,
        email: user.email,
        role: user.role,
      },
      tenant: {
        id: user.tenant_id,
        name: user.tenant_name,
        slug: user.tenant_slug,
      },
      plan: {
        id: user.plan_id ?? null,
        name: user.plan_name ?? null,
        features,
      },
      is_superadmin: isSuperAdmin,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("🔥 Error en /api/me:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();

    // Validaciones
    if (body.name && body.name.trim().length < 5) {
      return NextResponse.json({ error: "El nombre debe tener mínimo 5 caracteres" }, { status: 400 });
    }
    if (body.email && body.email.trim().length < 10) {
      return NextResponse.json({ error: "El usuario debe tener mínimo 10 caracteres" }, { status: 400 });
    }
    if (body.password && body.password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener mínimo 8 caracteres" }, { status: 400 });
    }

    // Actualizar usuario
    const updates: string[] = [];
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (body.name !== undefined) {
      updates.push(`name = $${paramIdx++}`);
      params.push(body.name.trim());
    }

    if (body.email !== undefined) {
      updates.push(`email = $${paramIdx++}`);
      params.push(body.email.trim());
    }

    if (body.password !== undefined && body.password.length > 0) {
      updates.push(`password_hash = $${paramIdx++}`);
      params.push(body.password); // Plain text as per your current implementation
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No hay cambios para aplicar" }, { status: 400 });
    }

    params.push(session.userId);
    params.push(session.tenantId);

    await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIdx} AND tenant_id = $${paramIdx + 1}`,
      params
    );

    return NextResponse.json({ ok: true, message: "Usuario actualizado correctamente" });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("🔥 Error en PATCH /api/me:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
