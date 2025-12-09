import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!; // viene de JWT_SECRET en Easypanel
const COOKIE_NAME = "conviaq_token";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  // TODO: aquí luego conectamos con tu base de datos / n8n / lo que sea.
  const validEmail = "admin@conviaq.com";
  const validPassword = "123456";

  if (email !== validEmail || password !== validPassword) {
    return NextResponse.json(
      { error: "Credenciales inválidas" },
      { status: 401 }
    );
  }

  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "7d" });

  const res = NextResponse.json({ ok: true });

  const cookieOptions: any = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  };

  // Para producción, que aplique a todos los subdominios de conviaq.com.mx
  if (process.env.NODE_ENV === "production") {
    cookieOptions.domain = ".conviaq.com.mx";
  }

  res.cookies.set(COOKIE_NAME, token, cookieOptions);

  return res;
}
