import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signSession, setSessionCookie } from "@/lib/server/session";

type UserAuthRow = {
  user_id: number;
  tenant_id: number;
  email: string;
  role: string | null;
  password_hash: string | null;
  is_active: boolean;
};

type LoginRequest = {
  email?: unknown;
  password?: unknown;
};

async function readJsonBody(req: Request): Promise<LoginRequest> {
  try {
    const json = await req.json();
    return json as LoginRequest;
  } catch {
    try {
      const text = await req.text();
      if (!text) return {} as LoginRequest;
      const json = JSON.parse(text);
      return json as LoginRequest;
    } catch {
      return {} as LoginRequest;
    }
  }
}

export async function POST(req: Request) {
  try {
    // Simple rate limiting per email + IP: 5 attempts per 15 minutes
    const MAX_ATTEMPTS = 5;
    const WINDOW_MS = 15 * 60 * 1000;
    const now = Date.now();

    function getClientIp(r: Request): string {
      const xf = r.headers.get("x-forwarded-for") || r.headers.get("x-real-ip") || "";
      const ip = xf?.split(",")[0]?.trim();
      return ip || "local";
    }

    function getKey(email: string, r: Request): string {
      return `${email}|${getClientIp(r)}`;
    }

    // In-memory tracker (process lifetime)
    // Note: adequate for immediate protection; for production, use Redis.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalAny = global as any;
    globalAny.__loginAttempts = globalAny.__loginAttempts || new Map<string, number[]>();
    const attemptsMap: Map<string, number[]> = globalAny.__loginAttempts;

    const body = await readJsonBody(req);
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "").trim();

    if (!email || email.length === 0) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }
    if (!password || password.length === 0) {
      return NextResponse.json({ error: "Contraseña requerida" }, { status: 400 });
    }

    // Throttle before hitting DB
    {
      const key = getKey(email, req);
      const arr = (attemptsMap.get(key) || []).filter((t) => now - t < WINDOW_MS);
      if (arr.length >= MAX_ATTEMPTS) {
        return NextResponse.json({ error: "Demasiados intentos. Intenta más tarde." }, { status: 429 });
      }
      attemptsMap.set(key, arr);
    }

    const { rows } = await db.query<UserAuthRow>(
      `
      SELECT 
        u.id as user_id,
        u.tenant_id,
        u.email,
        u.role,
        u.password_hash,
        u.is_active
      FROM users u
      WHERE LOWER(u.email) = $1
      LIMIT 1
      `,
      [email]
    );

    if (rows.length === 0) {
      const key = getKey(email, req);
      attemptsMap.set(key, [...(attemptsMap.get(key) || []), now]);
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const user = rows[0];
    
    // Validar cuenta activa
    if (!user.is_active) {
      return NextResponse.json({ error: "Cuenta desactivada" }, { status: 403 });
    }
    
    // Validar contraseña (comparación directa con hash almacenado)
    if (!user.password_hash || user.password_hash !== password) {
      const key = getKey(email, req);
      attemptsMap.set(key, [...(attemptsMap.get(key) || []), now]);
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const token = await signSession({
      userId: user.user_id,
      tenantId: user.tenant_id,
      email: user.email,
      role: user.role,
    });

    await setSessionCookie(token);

    // On success, clear attempts for this key
    {
      const key = getKey(email, req);
      attemptsMap.delete(key);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("🔥 Error en /api/login:", errorMessage);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}