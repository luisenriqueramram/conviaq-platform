import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  // 🔥 Aquí NO estás validando contra ningún usuario real
  // solo generas el token pase lo que pase
  const token = jwt.sign({ email }, process.env.JWT_SECRET!, {
    expiresIn: "1h",
  });

  const response = NextResponse.json({ ok: true });

  response.cookies.set("CONVIAQ_TOKEN", token, {
    httpOnly: true,
    secure: true,
    path: "/",
  });

  return response;
}
