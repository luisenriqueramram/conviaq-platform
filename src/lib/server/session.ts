// src/lib/server/session.ts
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";

const COOKIE_NAME = "conviaq_session";

type SessionPayload = {
  userId: number;
  tenantId: number;
  email?: string;
  role?: string | null;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing AUTH_SECRET");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.SESSION_EXPIRES_IN ?? "7d")
    .sign(getSecret());

  return token;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  // Make cookie persistent and aligned with token expiration
  const maxAgeSec = Number(process.env.SESSION_MAX_AGE_SEC ?? 0) || 7 * 24 * 60 * 60; // default 7 days
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSec,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHORIZED");
  // Optional: refresh token if it's about to expire to keep session alive on activity
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value;
    if (token) {
      // decode to inspect exp (without verifying again)
      const { payload }: any = await jwtVerify(token, getSecret());
      const exp = Number(payload?.exp ?? 0);
      const now = Math.floor(Date.now() / 1000);
      const refreshThreshold = Number(process.env.SESSION_REFRESH_THRESHOLD_SEC ?? 24 * 60 * 60); // 1 day
      if (exp - now < refreshThreshold) {
        // re-issue token with same payload
        const newToken = await signSession({ userId: s.userId, tenantId: s.tenantId, email: s.email, role: s.role });
        await setSessionCookie(newToken);
      }
    }
  } catch {
    // ignore refresh errors
  }

  return s;
}

export async function requireSuperAdmin() {
  const ctx = await requireSuperAdminOrPlan10();
  return ctx.session;
}

/**
 * Returns session + flags. Allows superadmin (email/id) OR plan_id=10.
 * Callers can further restrict when isPlan10 is true (e.g., only operate on same tenant).
 */
export async function requireSuperAdminOrPlan10(): Promise<{ session: SessionPayload; isPlan10: boolean; isSuper: boolean }> {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHORIZED");

  const superEmail = process.env.SUPERADMIN_EMAIL;
  const superId = process.env.SUPERADMIN_USER_ID ? Number(process.env.SUPERADMIN_USER_ID) : null;

  const isSuperByEmail = superEmail && s.email && s.email.toLowerCase() === superEmail.toLowerCase();
  const isSuperById = superId != null && Number(s.userId) === superId;
  const isSuper = Boolean(isSuperByEmail || isSuperById);

  let isPlan10 = false;
  if (!isSuper) {
    try {
      const { rows } = await db.query<{ plan_id: any }>("SELECT plan_id FROM tenants WHERE id = $1", [Number(s.tenantId)]);
      const planIdRaw = rows[0]?.plan_id ?? null;
      const planIdNum = planIdRaw == null ? null : Number(planIdRaw);
      isPlan10 = planIdNum === 10;
    } catch (err) {
      console.warn("requireSuperAdmin plan check failed", err);
    }
  }

  if (!isSuper && !isPlan10) {
    throw new Error("UNAUTHORIZED");
  }

  return { session: s, isPlan10, isSuper };
}
