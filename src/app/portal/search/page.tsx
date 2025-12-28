import Link from "next/link";
import { headers } from "next/headers";
import { EmptyState } from "@/components/portal/EmptyState";
import {
  Users,
  MessagesSquare,
  Phone,
  Settings,
} from "lucide-react";

type SearchResult = {
  id: string;
  type: "lead" | "conversation" | "contact" | "section";
  title: string;
  subtitle?: string;
  href: string;
  metadata?: Record<string, any>;
};

type ApiResponse = { ok: true; data: SearchResult[] } | { ok: false; error: string };

function norm(v: unknown) {
  return String(v ?? "").toLowerCase();
}

async function safeJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";

  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

function getIconForType(type: string) {
  switch (type) {
    case "lead":
      return <Users className="h-4 w-4" />;
    case "contact":
      return <Phone className="h-4 w-4" />;
    case "conversation":
      return <MessagesSquare className="h-4 w-4" />;
    case "section":
      return <Settings className="h-4 w-4" />;
    default:
      return null;
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case "lead":
      return "Lead";
    case "contact":
      return "Contacto";
    case "conversation":
      return "Conversación";
    case "section":
      return "Sección";
    default:
      return type;
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }> | { q?: string };
}) {
  const sp = await Promise.resolve(searchParams);
  const q = (sp?.q ?? "").trim();

  if (!q) {
    return (
      <div className="pt-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">
          Búsqueda
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Escribe algo en la barra superior y presiona Enter.
        </p>

        <div className="mt-6">
          <EmptyState
            title="Sin búsqueda"
            description="Usa la barra para buscar leads, conversaciones, contactos, números telefónicos o secciones."
            actionHref="/portal"
            actionLabel="Volver al resumen"
          />
        </div>
      </div>
    );
  }

  const baseUrl = await getBaseUrl();

  const searchRes = await safeJson<ApiResponse>(
    `${baseUrl}/api/search?q=${encodeURIComponent(q)}`
  );

  const results: SearchResult[] =
    searchRes && "ok" in searchRes && searchRes.ok ? searchRes.data ?? [] : [];

  // Group results by type
  const grouped = results.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>
  );

  const typeOrder = ["lead", "contact", "conversation", "section"];

  return (
    <div className="pt-8 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Resultados
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Búsqueda: <span className="text-zinc-300 font-medium">"{q}"</span>
          </p>
        </div>

        <Link
          href="/portal"
          className="text-sm text-zinc-400 hover:text-white transition"
        >
          Volver
        </Link>
      </div>

      {results.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Sin resultados"
            description={`No se encontró nada para "${q}". Intenta con otro término de búsqueda.`}
            actionHref="/portal"
            actionLabel="Volver al resumen"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {typeOrder.map((type) => {
            const items = grouped[type];
            if (!items || items.length === 0) return null;

            return (
              <div key={type}>
                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                    {type === "lead"
                      ? "👥 Leads"
                      : type === "contact"
                        ? "☎️ Contactos"
                        : type === "conversation"
                          ? "💬 Conversaciones"
                          : "🔗 Secciones"}
                  </h2>
                  <div className="mt-1 w-12 h-0.5 bg-accent/40 rounded-full" />
                </div>

                <div className="grid gap-2">
                  {items.map((result) => (
                    <Link
                      key={result.id}
                      href={result.href}
                      className="group flex items-start gap-3 rounded-xl border border-white/5 bg-white/0 p-4 hover:bg-white/5 hover:border-accent/30 transition-all"
                    >
                      <div className="mt-0.5 text-zinc-500 group-hover:text-accent transition">
                        {getIconForType(result.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium truncate">
                          {result.title}
                        </div>

                        {result.subtitle && (
                          <div className="mt-1 text-xs text-zinc-500 truncate">
                            {result.subtitle}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 text-xs text-zinc-600 px-2 py-1 bg-white/5 rounded-lg">
                        {getTypeLabel(result.type)}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
