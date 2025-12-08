// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CONVIAQ Platform",
  description: "Acceso y panel de control para clientes CONVIAQ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-screen bg-slate-950 text-slate-50">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6">
          <header className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400 text-slate-950 font-black text-xl tracking-tight">
                C
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-emerald-300">
                  CONVIAQ
                </span>
                <span className="text-xs text-slate-400">
                  Automatización & CRM con IA
                </span>
              </div>
            </div>

            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
              Beta • Uso interno
            </span>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="mt-8 border-t border-slate-800 pt-4 text-xs text-slate-500">
            © {new Date().getFullYear()} CONVIAQ. Todos los derechos
            reservados.
          </footer>
        </div>
      </body>
    </html>
  );
}
