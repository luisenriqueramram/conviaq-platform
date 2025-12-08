import jwt, { JwtPayload } from "jsonwebtoken";

interface MyJwtPayload extends JwtPayload {
  email?: string;
}

export default function PortalPage() {
  const token = /* token de cookies */;
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as string | MyJwtPayload;

  if (typeof decoded === "string" || !decoded.email) {
    return <div>Token inválido</div>;
  }

  return (
    <div>
      <h1>Bienvenido {decoded.email}</h1>
    </div>
  );
}
