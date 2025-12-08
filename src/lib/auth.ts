// src/lib/auth.ts
import { cookies } from "next/headers";

export async function setAuthToken(token: string) {
  // cookies() ahora devuelve una Promise, así que lo esperamos
  const cookieStore = await cookies();

  // casteamos a any porque el tipo es ReadonlyRequestCookies,
  // pero en runtime sí tiene .set()
  (cookieStore as any).set("auth_token", token, {
    httpOnly: true,
    secure: true,
    path: "/",
  });
}
