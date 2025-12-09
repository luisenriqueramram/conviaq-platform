"use client";
import jwt, { JwtPayload } from "jsonwebtoken";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al iniciar sesión");
        setLoading(false);
        return;
      }

      // ✅ Login OK -> nos vamos al portal
      window.location.href = "https://portal.conviaq.com.mx";
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error inesperado");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-md border border-zinc-800 rounded-2xl p-8 bg-zinc-950/80">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center font-bold">
              C
            </div>
            <div className="text-sm leading-tight">
              <div className="font-semibold">CONVIAQ</div>
              <div className="text-xs text-zinc-400">
                Automatización & CRM con IA
              </div>
            </div>
          </div>
          <h1 className="text-xl font-semibold mt-4">Iniciar sesión</h1>
          <p className="text-sm text-zinc-400">
            Acceso beta · uso interno
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-zinc-300 block mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder="tu@correo.com"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-300 block mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm py-2.5 transition disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-4 text-[11px] text-zinc-500 text-center">
          Versión beta interna · CONVIAQ © {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}
