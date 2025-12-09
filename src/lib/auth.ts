// src/lib/auth.ts
import { cookies } from "next/headers";
import jwt, { JwtPayload } from "jsonwebtoken";

export const TOKEN_NAME = "CONVIAQ_TOKEN";
const JWT_SECRET = process.env.JWT_SECRET || "DEV_SECRET_CAMBIA_ESTO";

export type SessionUser = {
  email: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  // 👇 aquí ahora sí usamos await
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload | string;

    if (typeof decoded === "string") {
      return null;
    }

    const email = decoded.email as string | undefined;
    if (!email) return null;

    return { email };
  } catch (err) {
    console.error("Error leyendo JWT:", err);
    return null;
  }
}
