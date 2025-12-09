export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decodeToken } from "@/lib/auth";

export default async function PortalPage() {
  // 👇 aquí va el await porque cookies() es una Promise
  const cookieStore = await cookies();
  const token = cookieStore.get("CONVIAQ_TOKEN")?.value;

  if (!token) {
    return redirect("/login");
  }

  const decoded = decodeToken(token);

  if (!decoded || !decoded.email) {
    return redirect("/login");
  }

  return (
    <div>
      <h1>Bienvenido {decoded.email}</h1>
    </div>
  );
}
