import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function PortalPage() {
  const user = await getSessionUser(); // 👈 ahora es async

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="max-w-xl w-full px-6">
        <h1 className="text-2xl font-semibold mb-2">
          Bienvenido, <span className="text-emerald-400">{user.email}</span>
        </h1>
        <p className="text-zinc-400">
          Aquí va el dashboard interno de CONVIAQ (beta).
        </p>
      </div>
    </main>
  );
}
