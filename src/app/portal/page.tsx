import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";

export default function PortalPage() {
  const user = getAuthUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div>
      <h1>Bienvenido {user.email}</h1>
    </div>
  );
}
