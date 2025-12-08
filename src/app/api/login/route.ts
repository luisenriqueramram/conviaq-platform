import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "super-secret-key";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  // Aquí puedes poner tu propia lógica
  if (email !== "admin@conviaq.com" || password !== "123456") {
    return NextResponse.json(
      { ok: false, message: "Credenciales incorrectas" },
      { status: 401 }
    );
  }

  // Crear token
  const token = jwt.sign(
    {
      email,
      role: "admin",
    },
    SECRET,
    { expiresIn: "7d" }
  );

  return NextResponse.json({ ok: true, token });
}
