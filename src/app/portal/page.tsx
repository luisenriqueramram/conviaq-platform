// src/app/portal/page.tsx
import { cookies } from "next/headers";
import jwt, { JwtPayload } from "jsonwebtoken";

interface MyJwtPayload extends JwtPayload {
  email?: string;
}

export default function PortalPage() {
  const cookieStore = cookies();
  const token = cookieStore.get("conviaq_token")?.value;

  if (!token) {
    return <div>No hay sesión activa. Ve a /login.</div>;
  }

  const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET!
  ) as MyJwtPayload;

  if (typeof decoded === "string" || !decoded.email) {
    return <div>Token inválido</div>;
  }

  return (
    <div>
      <h1>Bienvenido {decoded.email}</h1>
    </div>
  );
}
