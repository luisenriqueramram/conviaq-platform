import { cookies } from "next/headers";

// src/lib/auth.ts
export const COOKIE_NAME = "conviaq_token";

export const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET no está definido en las variables de entorno");
}


export async function setAuthToken(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    path: "/",
  });
}

export async function clearAuthToken() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    path: "/",
    expires: new Date(0), // expira inmediatamente
  });
}

export async function getAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}
