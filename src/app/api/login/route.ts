// src/app/api/login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const TOKEN_NAME = "CONVIAQ_TOKEN";
const JWT_SECRET = process.env.JWT_SECRET!;

// 👇 Aquí podrías validar contra BD, n8n, etc.
// Por ahora acepta cualquier combinación solo para pruebas.
function validateUser(email: string, password: string) {
  if (!email || !password) return false;
  return true;
}

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!validateUser(email, password)) {
    return NextResponse.json(
      { ok: false, error: "Credenciales inválidas" },
      { status: 401 }
    );
  }

  const token = jwt.sign({ email }, JWT_SECRET, {
    expiresIn: "1h",
  });

  const res = NextResponse.json({ ok: true });

  res.cookies.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/", // disponible en todo el portal
  });

  return res;
}
