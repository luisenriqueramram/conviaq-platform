"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "calendar", label: "Calendario de Salidas" },
  { key: "routes", label: "Configuración de Rutas" },
  { key: "templates", label: "Plantillas de Mensajes" },
];

export default function TuristicosDelNortePanel() {
  const [tab, setTab] = useState("calendar");

  return (
    <div className="min-h-screen w-full bg-zinc-950 p-8 flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Turísticos del Norte</h1>
          <span className="inline-block px-3 py-1 rounded-full text-xs border border-blue-500/25 bg-zinc-800 text-blue-200 font-semibold">
            Panel exclusivo para Miguel Hernandez
          </span>
        </div>
      </div>
      <div className="flex gap-4 border-b border-blue-900/30 pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-6 py-2 rounded-t-2xl font-semibold text-base transition-all duration-200",
              tab === t.key
                ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg scale-105"
                : "bg-zinc-900 text-blue-200 hover:bg-blue-900/30 hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tab === "calendar" && <CalendarSection />}
        {tab === "routes" && <RoutesSection />}
        {tab === "templates" && <TemplatesSection />}
      </div>
    </div>
  );
}

function CalendarSection() {
  // TODO: Implementar tabla y formulario de salidas
  return (
    <div className="rounded-3xl bg-gradient-to-br from-zinc-900/90 to-zinc-800/80 border border-blue-900/30 shadow-xl p-8 flex flex-col gap-4 min-h-[220px]">
      <h2 className="text-2xl font-bold text-white mb-4">Calendario de Salidas</h2>
      <div className="text-zinc-400">Aquí podrás ver y programar las salidas de tus rutas turísticas.</div>
      {/* Tabla y formulario van aquí */}
    </div>
  );
}



function RoutesSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routes, setRoutes] = useState<any>({});
  const [info, setInfo] = useState<string>("");
  const [debugSchema, setDebugSchema] = useState<string>("");
  const [currentTenant, setCurrentTenant] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/me")
      .then((r) => r.json())
      .then((m) => {
        if (m?.tenant?.id) setCurrentTenant(String(m.tenant.id));
      })
      .catch(() => {})
      .finally(() => {});

    fetch("/api/turisticos-del-norte/config")
      .then(async (res) => {
        if (!res.ok) {
          let detail = "";
          try {
            const j = await res.json();
            detail = j ? ` · ${JSON.stringify(j)}` : "";
          } catch (e) {
            detail = "";
          }
          throw new Error(`Status ${res.status}${detail}`);
        }
        return res.json();
      })
      .then((data) => {
        const rawSchema = data?.config?.schema_json;
        const industryUsed = data?.config?.industry ? `Industria: ${data.config.industry}` : "";
        let parsed = rawSchema;
        if (typeof rawSchema === "string") {
          try {
            parsed = JSON.parse(rawSchema);
          } catch (e) {
            parsed = null;
          }
        }
        const routesData = parsed?.routes ?? {};
        setRoutes(routesData);
        setInfo(industryUsed);
        const preview = typeof rawSchema === "string" ? rawSchema.slice(0, 200) : JSON.stringify(rawSchema).slice(0, 200);
        setDebugSchema(`typeof schema_json: ${typeof rawSchema} · preview: ${preview}`);
        setError(null);
      })
        .catch((err: any) => setError(`No se pudo cargar la configuración. ${err?.message ?? ""}`))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-3xl bg-gradient-to-br from-zinc-900/90 to-zinc-800/80 border border-blue-900/30 shadow-xl p-8 flex flex-col gap-4 min-h-[220px]">
      <h2 className="text-2xl font-bold text-white mb-4">Configuración de Rutas</h2>
      <div className="text-zinc-400 mb-4">Administra las rutas, paradas y horarios de tu empresa turística.</div>
      {currentTenant && <div className="text-xs text-zinc-500">Tenant actual en sesión: {currentTenant}</div>}
      {loading ? (
        <div className="text-blue-300">Cargando rutas…</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : Object.keys(routes).length === 0 ? (
        <div className="text-zinc-500 space-y-1">
          <div>No hay rutas configuradas. Usa el botón para agregar la primera ruta.</div>
          {info && <div className="text-xs text-zinc-600">{info}</div>}
          {debugSchema && <div className="text-[11px] text-zinc-600">{debugSchema}</div>}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {Object.entries(routes).map(([key, route]: any) => (
            <div key={key} className="rounded-2xl bg-zinc-900/80 border border-blue-900/30 p-6 flex flex-col gap-2 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-lg font-bold text-white">{route.name}</div>
                  <div className="text-xs text-blue-300 font-mono">Código: {route.code || key}</div>
                </div>
                <span className="px-2 py-1 rounded bg-blue-900/30 text-xs text-blue-200">{route.origin} → {route.destination}</span>
              </div>
              <div className="mt-2">
                <div className="text-xs text-zinc-400 mb-1 font-semibold">Paradas:</div>
                <ul className="pl-4 list-disc space-y-1">
                  {route.stops?.length ? (
                    route.stops.map((stop: any, idx: number) => (
                      <li key={idx} className="text-zinc-300">
                        <span className="font-semibold">{stop.name}</span>
                        {typeof stop.minutes_offset === "number" ? (
                          <span className="ml-2 text-blue-400">+{stop.minutes_offset} min</span>
                        ) : (
                          <span className="ml-2 text-zinc-500">(sin horario)</span>
                        )}
                        {stop.location_url && (
                          <a href={stop.location_url} target="_blank" rel="noopener noreferrer" className="ml-2 underline text-blue-300">Ver mapa</a>
                        )}
                      </li>
                    ))
                  ) : (
                    <li className="text-zinc-500">Sin paradas registradas.</li>
                  )}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplatesSection() {
  // TODO: Implementar CRUD de plantillas de mensajes
  return (
    <div className="rounded-3xl bg-gradient-to-br from-zinc-900/90 to-zinc-800/80 border border-blue-900/30 shadow-xl p-8 flex flex-col gap-4 min-h-[220px]">
      <h2 className="text-2xl font-bold text-white mb-4">Plantillas de Mensajes</h2>
      <div className="text-zinc-400">Configura mensajes automáticos y multimedia para tus clientes.</div>
      {/* CRUD de plantillas va aquí */}
    </div>
  );
}
