// app/page.tsx
import { headers } from "next/headers";
import Link from "next/link";

export default function Home() {
  const host = headers().get("host") || "";
  const isAccess = host.startsWith("access.");
  const isPortal = host.startsWith("portal.");

  if (isAccess) {
    // Pantalla de entrada / bienvenida para access.conviaq.com.mx
    return (
      <section className="flex h-full flex-col items-center justify-center text-center">
        <h1 className="mb-4 text-3xl font-semibold text-slate-50">
          Bienvenido a tu plataforma CONVIAQ
        </h1>
        <p className="max-w-md text-sm text-slate-400">
          Centraliza tus leads, conversaciones y automatizaciones en un solo
          lugar. Inicia sesión o crea tu cuenta para comenzar.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-emerald-400 px-6 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-300 transition"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/registro"
            className="rounded-xl border border-slate-700 px-6 py-2 text-sm font-semibold text-slate-100 hover:border-emerald-400 hover:text-emerald-300 transition"
          >
            Crear cuenta
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          ¿Eres invitado de un despacho o negocio? Usa los datos que te
          compartió CONVIAQ.
        </p>
      </section>
    );
  }

  if (isPortal) {
    // Portal: mandamos directo al dashboard
    return (
      <section className="flex h-full flex-col items-center justify-center text-center">
        <h1 className="mb-3 text-2xl font-semibold text-slate-50">
          Panel de control CONVIAQ
        </h1>
        <p className="max-w-md text-sm text-slate-400 mb-6">
          Administra tus bots, embudos y clientes desde un solo lugar.
        </p>

        <Link
          href="/dashboard"
          className="rounded-xl bg-emerald-400 px-6 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-300 transition"
        >
          Ir al dashboard
        </Link>

        <p className="mt-5 text-xs text-slate-500">
          * Más adelante aquí podemos validar sesión y redirigir al login si no
          hay token.
        </p>
      </section>
    );
  }

  // Fallback: si alguien entra por IP o dominio raro
  return (
    <section className="flex h-full flex-col items-center justify-center text-center">
      <h1 className="mb-4 text-3xl font-semibold text-slate-50">
        CONVIAQ Platform
      </h1>
      <p className="max-w-md text-sm text-slate-400">
        Esta es la plataforma de acceso para clientes de CONVIAQ. Usa
        <span className="font-semibold text-emerald-300">
          {" "}
          access.conviaq.com.mx{" "}
        </span>
        para entrar o
        <span className="font-semibold text-emerald-300">
          {" "}
          portal.conviaq.com.mx{" "}
        </span>
        para ir al panel.
      </p>
    </section>
  );
}
