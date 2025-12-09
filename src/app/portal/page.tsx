import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt, { JwtPayload } from "jsonwebtoken";
import { COOKIE_NAME, JWT_SECRET } from "@/lib/auth";
// importa también jwt y tu tipo si lo estás usando

export default async function PortalPage() {
  // cookies() ahora es async, así que la esperamos
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const email = decoded.email as string | undefined;

    if (!email) {
      redirect("/login");
    }

    return (
      <main className="min-h-screen bg-black text-white flex flex-col">
        <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center font-bold">
              C
            </div>
            <div className="text-sm leading-tight">
              <div className="font-semibold">CONVIAQ Platform</div>
              <div className="text-xs text-zinc-400">
                Panel interno · Beta
              </div>
            </div>
          </div>
          <div className="text-xs text-zinc-400">
            Sesión: <span className="font-mono text-emerald-400">{email}</span>
          </div>
        </header>

        <section className="flex-1 px-6 py-8">
          <h1 className="text-2xl font-semibold mb-2">
            Bienvenido, {email}
          </h1>
          <p className="text-zinc-400 text-sm max-w-xl">
            Aquí vamos a montar todo el panel de la plataforma CONVIAQ
            (clientes, bots, flujos de n8n, métricas, etc.).  
            Por ahora solo es la pantalla de prueba de que el login con JWT + cookie está funcionando.
          </p>
        </section>
      </main>
    );
  } catch (err) {
    console.error("Error verificando JWT:", err);
    redirect("/login");
  }
}
