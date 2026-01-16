"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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

type CalendarRow = {
  id: number;
  route_key: string;
  trip_date: string;
  departure_time: string;
  price: string | number;
  status: string;
  origin_area?: string | null;
  destination_area?: string | null;
  metadata?: any;
};

function CalendarSection() {
  const [rows, setRows] = useState<CalendarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ route: "", status: "", start: "", end: "" });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    route_key: "",
    trip_date: "",
    departure_time: "",
    price: "",
    status: "Activo",
    origin_area: "",
    destination_area: "",
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/turisticos-del-norte/calendar");
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
        const data = await res.json();
        setRows(data?.calendar ?? []);
        setError(null);
      } catch (err: any) {
        setError(`No se pudo cargar el calendario. ${err?.message ?? ""}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatDate = (d: string) => {
    try {
      return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "America/Mexico_City" }).format(new Date(d));
    } catch {
      return d;
    }
  };

  const formatTime = (t: string) => {
    const [h, m] = t.split(":");
    if (!h || !m) return t;
    const d = new Date();
    d.setHours(Number(h));
    d.setMinutes(Number(m));
    return new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit" }).format(d);
  };

  const compareRowsDesc = (a: CalendarRow, b: CalendarRow) => {
    const da = new Date(`${a.trip_date}T${a.departure_time}`);
    const db = new Date(`${b.trip_date}T${b.departure_time}`);
    return db.getTime() - da.getTime();
  };

  const filteredRows = useMemo(() => {
    return rows
      .filter((r) => (filters.status ? r.status === filters.status : true))
      .filter((r) => (filters.route ? r.route_key.toLowerCase().includes(filters.route.toLowerCase()) : true))
      .filter((r) => (filters.start ? r.trip_date >= filters.start : true))
      .filter((r) => (filters.end ? r.trip_date <= filters.end : true))
      .sort(compareRowsDesc);
  }, [rows, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const handleFormChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/turisticos-del-norte/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route_key: form.route_key,
          trip_date: form.trip_date,
          departure_time: form.departure_time,
          price: Number(form.price),
          status: form.status,
          origin_area: form.origin_area || null,
          destination_area: form.destination_area || null,
        }),
      });
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
      const data = await res.json();
      if (data?.salida) {
        setRows((prev) => [data.salida, ...prev].sort(compareRowsDesc));
        setPage(1);
        setForm((prev) => ({ ...prev, route_key: "", trip_date: "", departure_time: "", price: "" }));
      }
    } catch (err: any) {
      setCreateError(`No se pudo crear la salida. ${err?.message ?? ""}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-zinc-900/90 to-zinc-800/80 border border-blue-900/30 shadow-xl p-8 flex flex-col gap-4 min-h-[220px]">
      <h2 className="text-2xl font-bold text-white mb-2">Calendario de Salidas</h2>
      <div className="text-zinc-400 mb-4">Aquí podrás ver y programar las salidas de tus rutas turísticas.</div>

      <div className="grid lg:grid-cols-[2fr,1fr] gap-4">
        <div className="space-y-3">
          <div className="grid md:grid-cols-4 gap-2">
            <input
              type="text"
              placeholder="Buscar por ruta"
              value={filters.route}
              onChange={(e) => handleChange("route", e.target.value)}
              className="w-full rounded-xl bg-zinc-900/70 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
            />
            <select
              value={filters.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full rounded-xl bg-zinc-900/70 border border-blue-900/30 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todos los estatus</option>
              <option value="Activo">Activo</option>
              <option value="Suspendido">Suspendido</option>
              <option value="Cancelado">Cancelado</option>
            </select>
            <input
              type="date"
              value={filters.start}
              onChange={(e) => handleChange("start", e.target.value)}
              className="w-full rounded-xl bg-zinc-900/70 border border-blue-900/30 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
            <input
              type="date"
              value={filters.end}
              onChange={(e) => handleChange("end", e.target.value)}
              className="w-full rounded-xl bg-zinc-900/70 border border-blue-900/30 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {loading ? (
            <div className="text-blue-300">Cargando calendario…</div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : filteredRows.length === 0 ? (
            <div className="text-zinc-500">No hay salidas registradas con estos filtros.</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-blue-900/30 bg-zinc-900/50">
              <table className="min-w-full text-sm text-left text-zinc-200">
                <thead className="bg-zinc-900/60 text-xs uppercase text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">Ruta</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Hora</th>
                    <th className="px-4 py-3">Origen → Destino</th>
                    <th className="px-4 py-3">Precio</th>
                    <th className="px-4 py-3">Estatus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pageRows.map((row) => (
                    <tr key={row.id} className="hover:bg-white/5 transition">
                      <td className="px-4 py-3 font-semibold text-white">{row.route_key}</td>
                      <td className="px-4 py-3">{formatDate(row.trip_date)}</td>
                      <td className="px-4 py-3">{formatTime(row.departure_time)}</td>
                      <td className="px-4 py-3 text-zinc-300">
                        {row.origin_area || "-"} → {row.destination_area || "-"}
                      </td>
                      <td className="px-4 py-3 text-blue-200 font-semibold">${Number(row.price).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-semibold",
                          row.status === "Activo"
                            ? "bg-green-500/20 text-green-200 border border-green-500/30"
                            : row.status === "Cancelado"
                              ? "bg-red-500/20 text-red-200 border border-red-500/30"
                              : "bg-amber-500/20 text-amber-200 border border-amber-500/30"
                        )}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-zinc-400">
            <div>
              Mostrando {Math.min(filteredRows.length, (page - 1) * PAGE_SIZE + 1)}-
              {Math.min(filteredRows.length, page * PAGE_SIZE)} de {filteredRows.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg bg-zinc-900/70 border border-blue-900/30 text-white disabled:opacity-40"
              >
                ← Anterior
              </button>
              <span className="text-xs text-zinc-500">Página {page} / {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg bg-zinc-900/70 border border-blue-900/30 text-white disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900/70 border border-blue-900/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-semibold">Agregar salida</div>
              <div className="text-xs text-zinc-500">Carga rápida con ruta, fecha, hora y precio.</div>
            </div>
          </div>
                      <form className="space-y-2" onSubmit={handleCreate}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                required
                placeholder="Ruta (ej. MZT-DF)"
                value={form.route_key}
                onChange={(e) => handleFormChange("route_key", e.target.value)}
                className="w-full rounded-xl bg-zinc-950/60 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
              <input
                required
                type="date"
                value={form.trip_date}
                onChange={(e) => handleFormChange("trip_date", e.target.value)}
                className="w-full rounded-xl bg-zinc-950/60 border border-blue-900/30 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
              <input
                required
                type="time"
                value={form.departure_time}
                onChange={(e) => handleFormChange("departure_time", e.target.value)}
                className="w-full rounded-xl bg-zinc-950/60 border border-blue-900/30 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
              <input
                required
                type="number"
                step="0.01"
                placeholder="Precio"
                value={form.price}
                onChange={(e) => handleFormChange("price", e.target.value)}
                className="w-full rounded-xl bg-zinc-950/60 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
              <input
                placeholder="Origen"
                value={form.origin_area}
                onChange={(e) => handleFormChange("origin_area", e.target.value)}
                className="w-full rounded-xl bg-zinc-950/60 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
              <input
                placeholder="Destino"
                value={form.destination_area}
                onChange={(e) => handleFormChange("destination_area", e.target.value)}
                className="w-full rounded-xl bg-zinc-950/60 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
              <select
                value={form.status}
                onChange={(e) => handleFormChange("status", e.target.value)}
                className="w-full rounded-xl bg-zinc-950/60 border border-blue-900/30 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="Activo">Activo</option>
                <option value="Suspendido">Suspendido</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>

            {createError && <div className="text-red-400 text-sm">{createError}</div>}

            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold py-2 shadow-lg disabled:opacity-50"
            >
              {creating ? "Guardando…" : "Guardar salida"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}



function RoutesSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routes, setRoutes] = useState<any>({});
  const [rawSchema, setRawSchema] = useState<any>(null);
  const [info, setInfo] = useState<string>("");
  const [debugSchema, setDebugSchema] = useState<string>("");
  const [currentTenant, setCurrentTenant] = useState<string>("");
  const [editingKey, setEditingKey] = useState<string>("");
  const [routeForm, setRouteForm] = useState({
    key: "",
    code: "",
    origin_city: "",
    destination_city: "",
    calculate_times: false,
    active: true,
    stops: [] as any[],
  });
  const [stopDraft, setStopDraft] = useState<{ name: string; minutes_offset: number; resource_ref: string }>({
    name: "",
    minutes_offset: 0,
    resource_ref: "",
  });
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [routeDirty, setRouteDirty] = useState(false);
  const [routeSaved, setRouteSaved] = useState<string>("");
  const [showAllStops, setShowAllStops] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [routeSaving, setRouteSaving] = useState(false);
  const [routeSaveError, setRouteSaveError] = useState<string | null>(null);

  const markDirty = () => setRouteDirty(true);

  useEffect(() => {
    if (!routeSaved) return;
    const t = setTimeout(() => setRouteSaved(""), 2500);
    return () => clearTimeout(t);
  }, [routeSaved]);

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
        setRawSchema(parsed || {});
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
      <div className="text-zinc-400 mb-4">Administra las rutas, paradas y horarios de tu Línea de Autobuses.</div>
      {routeSaved && (
        <div className="fixed bottom-6 right-6 z-20 rounded-xl bg-green-600/20 text-green-100 border border-green-500/40 px-4 py-3 shadow-lg">
          {routeSaved}
        </div>
      )}
      {/* Se oculta tenant en UI para evitar ruido */}
      {loading ? (
        <div className="text-blue-300">Cargando rutas…</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : (
        <div className="grid lg:grid-cols-[2fr,1fr] gap-4">
          <div className="grid md:grid-cols-2 gap-3">
            {Object.keys(routes).length === 0 ? (
              <div className="text-zinc-500 space-y-1 col-span-2">
                <div>No hay rutas configuradas. Usa el formulario para agregar la primera.</div>
                {info && <div className="text-xs text-zinc-600">{info}</div>}
                {debugSchema && <div className="text-[11px] text-zinc-600">{debugSchema}</div>}
              </div>
            ) : (
              Object.entries(routes).map(([key, route]: any) => (
              <div key={key} className="rounded-2xl bg-zinc-900/80 border border-blue-900/30 p-4 flex flex-col gap-2 shadow-md">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <div className="text-lg font-bold text-white">{route.config?.origin_city || "Inicio"} → {route.config?.destination_city || "Fin"}</div>
                    <div className="text-xs text-blue-300/60">{route.name || ""}</div>
                    <div className="text-[11px] text-zinc-500">{Array.isArray(route.stops) ? route.stops.length : 0} paradas</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-2 py-1 rounded text-xs bg-blue-600/30 text-blue-100 border border-blue-600/40"
                      onClick={() => {
                        setShowForm(true);
                        setEditingKey(String(key));
                        setRouteForm({
                          key: String(key),
                          code: route.code || String(key),
                          origin_city: route.config?.origin_city || "",
                          destination_city: route.config?.destination_city || "",
                          calculate_times: !!route.config?.calculate_times,
                          active: true,
                          stops: Array.isArray(route.stops) ? route.stops : [],
                        });
                        setStopDraft({ name: "", minutes_offset: 0, resource_ref: "" });
                        setRouteDirty(false);
                        setRouteSaved("");
                        setShowAllStops(false);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="px-2 py-1 rounded text-xs bg-red-600/20 text-red-100 border border-red-600/40"
                      onClick={async () => {
                        const ok = typeof window !== "undefined" ? window.confirm("¿Eliminar esta ruta?") : true;
                        if (!ok) return;
                        try {
                          const next = { ...(rawSchema || {}), routes: { ...(rawSchema?.routes || {}) } };
                          delete next.routes[key];
                          await saveRoutes(next);
                        } catch (e) {
                          setError("No se pudo eliminar la ruta");
                        }
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
              ))
            )}
          </div>

          <div className="rounded-2xl bg-zinc-900/70 border border-blue-900/30 p-4 space-y-3">
            {!showForm && (
              <button
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold py-2 shadow"
                onClick={() => {
                  setShowForm(true);
                  setEditingKey("");
                  setRouteForm({ key: "", code: "", origin_city: "", destination_city: "", calculate_times: false, active: true, stops: [] });
                  setStopDraft({ name: "", minutes_offset: 0, resource_ref: "" });
                  setRouteDirty(false);
                  setRouteSaved("");
                  setShowAllStops(false);
                }}
              >
                + Nueva ruta
              </button>
            )}

            {showForm && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">{editingKey ? "Editar ruta" : "Nueva ruta"}</div>
                    <div className="text-xs text-zinc-500">Para terminar, oprime guardar.</div>
                    {routeDirty && <div className="text-[11px] text-amber-300">Tienes cambios sin guardar</div>}
                    {!routeDirty && routeSaved && <div className="text-[11px] text-green-300">{routeSaved}</div>}
                    {editingKey && <div className="text-[11px] text-blue-300/80">Clave interna: {editingKey}</div>}
                  </div>
                  <div className="flex gap-2 text-xs text-cyan-300">
                    <button
                      onClick={() => {
                        setShowForm(false);
                        setEditingKey("");
                        setRouteDirty(false);
                        setRouteSaved("");
                        setShowAllStops(false);
                      }}
                    >
                      Cerrar
                    </button>
                    <button
                      onClick={() => {
                        setEditingKey("");
                        setRouteForm({ key: "", code: "", origin_city: "", destination_city: "", calculate_times: false, active: true, stops: [] });
                        setStopDraft({ name: "", minutes_offset: 0, resource_ref: "" });
                        setRouteDirty(false);
                        setRouteSaved("");
                        setShowAllStops(false);
                      }}
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
                <form
                  className="space-y-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!routeForm.origin_city.trim() || !routeForm.destination_city.trim()) {
                      setRouteSaveError("Indica Inicio y Fin");
                      return;
                    }
                    if (!routeForm.stops || routeForm.stops.length === 0) {
                      setRouteSaveError("Agrega al menos una parada");
                      return;
                    }
                    setRouteSaving(true);
                    setRouteSaveError(null);
                    setRouteSaved("");
                    try {
                      const stopsParsed = (routeForm.stops || []).map((s, idx) => ({
                        ...s,
                        sequence: idx + 1,
                        minutes_offset: Number(s.minutes_offset) || 0,
                      }));
                      const next = { ...(rawSchema || {}) };
                      const routesCopy = { ...(next.routes || {}) };
                      const baseKey = routeForm.key.trim() || routeForm.code.trim() || `${routeForm.origin_city} ${routeForm.destination_city}`.trim();
                      const safeKey = (baseKey || `RUTA_${Date.now()}`).replace(/\s+/g, "_").toUpperCase();
                      const routeLabel = `${routeForm.origin_city || "Inicio"} → ${routeForm.destination_city || "Fin"}`.trim();
                      routesCopy[safeKey] = {
                        code: routeForm.code || safeKey,
                        name: routeLabel,
                        stops: stopsParsed,
                        active: true,
                        config: {
                          origin_city: routeForm.origin_city,
                          destination_city: routeForm.destination_city,
                          calculate_times: routeForm.calculate_times,
                        },
                      };
                      next.routes = routesCopy;
                      await saveRoutes(next);
                      setEditingKey("");
                      setRouteForm({ key: "", code: "", origin_city: "", destination_city: "", calculate_times: false, active: true, stops: [] });
                      setStopDraft({ name: "", minutes_offset: 0, resource_ref: "" });
                      setShowForm(false);
                      setRouteDirty(false);
                      setRouteSaved("Ruta guardada");
                      setShowAllStops(false);
                    } catch (err: any) {
                      setRouteSaveError(err?.message || "Error al guardar");
                    } finally {
                      setRouteSaving(false);
                    }
                  }}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Inicio"
                      value={routeForm.origin_city}
                      onChange={(e) => { setRouteForm((p) => ({ ...p, origin_city: e.target.value })); markDirty(); }}
                      className="w-full rounded-xl bg-zinc-950/60 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      placeholder="Fin"
                      value={routeForm.destination_city}
                      onChange={(e) => { setRouteForm((p) => ({ ...p, destination_city: e.target.value })); markDirty(); }}
                      className="w-full rounded-xl bg-zinc-950/60 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="text-xs text-blue-200/80 font-mono">Vista previa: {(routeForm.origin_city || "Inicio").trim()} → {(routeForm.destination_city || "Fin").trim()}</div>
                  <label className="flex items-center gap-2 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={routeForm.calculate_times}
                      onChange={(e) => { setRouteForm((p) => ({ ...p, calculate_times: e.target.checked })); markDirty(); }}
                    />
                    Calcular tiempos automáticamente
                  </label>
                  <div className="rounded-xl border border-blue-900/30 bg-zinc-950/60 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-white font-semibold text-sm">Paradas</div>
                      <div className="text-[11px] text-zinc-500">Arrastra con el ícono ⋮⋮</div>
                    </div>
                    <div className="flex items-end gap-2 flex-wrap">
                      <div className="flex-1 min-w-[180px]">
                        <div className="text-xs text-zinc-500 mb-1">Nombre</div>
                        <input
                          placeholder="Ej. Acayucan"
                          value={stopDraft.name}
                          onChange={(e) => setStopDraft((p) => ({ ...p, name: e.target.value }))}
                          className="w-full rounded-xl bg-zinc-900 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div className="w-32">
                        <div className="text-xs text-zinc-500 mb-1">Horas</div>
                        <select
                          value={Math.floor((Number(stopDraft.minutes_offset) || 0) / 60)}
                          onChange={(e) => {
                            const hrs = Number(e.target.value) || 0;
                            const mins = (Number(stopDraft.minutes_offset) || 0) % 60;
                            setStopDraft((p) => ({ ...p, minutes_offset: hrs * 60 + mins }));
                          }}
                          className="w-full rounded-xl bg-zinc-900 border border-blue-900/30 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                        >
                          {Array.from({ length: 25 }).map((_, i) => (
                            <option key={i} value={i}>{i} hrs</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-32">
                        <div className="text-xs text-zinc-500 mb-1">Minutos</div>
                        <select
                          value={(Number(stopDraft.minutes_offset) || 0) % 60}
                          onChange={(e) => {
                            const mins = Number(e.target.value) || 0;
                            const hrs = Math.floor((Number(stopDraft.minutes_offset) || 0) / 60);
                            setStopDraft((p) => ({ ...p, minutes_offset: hrs * 60 + mins }));
                          }}
                          className="w-full rounded-xl bg-zinc-900 border border-blue-900/30 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                        >
                          {Array.from({ length: 12 }).map((_, i) => {
                            const v = i * 5;
                            return (
                              <option key={v} value={v}>{v} min</option>
                            );
                          })}
                        </select>
                      </div>
                      <button
                        type="button"
                        className="px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold shadow"
                        onClick={() => {
                          if (!stopDraft.name.trim()) return;
                          setRouteForm((p) => ({
                            ...p,
                            stops: [...(p.stops || []), { ...stopDraft, minutes_offset: Number(stopDraft.minutes_offset) || 0 }],
                          }));
                          setStopDraft({ name: "", minutes_offset: 0, resource_ref: "" });
                          markDirty();
                        }}
                      >
                        + Parada
                      </button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {(routeForm.stops || []).length === 0 ? (
                        <div className="text-xs text-zinc-500">Aún no hay paradas. Agrega al menos una.</div>
                      ) : (
                        ((showAllStops ? (routeForm.stops || []) : (routeForm.stops || []).slice(0, 6))).map((s: any, idx: number) => (
                          <div
                            key={idx}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (draggingIndex === null) return;
                              setHoverIndex(idx);
                              if (draggingIndex === idx) return;
                              const next = [...(routeForm.stops || [])];
                              const [moved] = next.splice(draggingIndex, 1);
                              next.splice(idx, 0, moved);
                              setRouteForm((p) => ({ ...p, stops: next }));
                              setDraggingIndex(idx);
                              markDirty();
                            }}
                            onDragLeave={() => setHoverIndex(null)}
                            onDragEnd={() => {
                              setDraggingIndex(null);
                              setHoverIndex(null);
                            }}
                            className={cn(
                              "flex items-center gap-2 rounded-xl bg-zinc-900 border border-blue-900/30 px-3 py-2 transition-all duration-150",
                              hoverIndex === idx ? "border-blue-500/60 bg-blue-900/20" : "",
                              draggingIndex === idx ? "opacity-70 scale-[0.995]" : ""
                            )}
                          >
                            <div
                              draggable
                              onDragStart={() => setDraggingIndex(idx)}
                              onDragEnd={() => {
                                setDraggingIndex(null);
                                setHoverIndex(null);
                              }}
                              className="text-lg text-zinc-400 cursor-grab select-none pr-1"
                              title="Arrastra para reordenar"
                            >
                              ⋮⋮
                            </div>
                            <div className="text-xs text-zinc-500 w-6">{idx + 1}</div>
                            <input
                              value={s.name}
                              onChange={(e) => {
                                const next = [...(routeForm.stops || [])];
                                next[idx] = { ...next[idx], name: e.target.value };
                                setRouteForm((p) => ({ ...p, stops: next }));
                                markDirty();
                              }}
                              className="flex-1 rounded-lg bg-transparent border border-blue-900/30 px-2 py-1 text-sm text-white"
                            />
                            <div className="flex items-center gap-1 text-xs text-zinc-400">
                              <span>{Math.floor((Number(s.minutes_offset) || 0) / 60)}h</span>
                              <span>{(Number(s.minutes_offset) || 0) % 60}m</span>
                            </div>
                            <select
                              value={Math.floor((Number(s.minutes_offset) || 0) / 60)}
                              onChange={(e) => {
                                const hrs = Number(e.target.value) || 0;
                                const mins = (Number(s.minutes_offset) || 0) % 60;
                                const next = [...(routeForm.stops || [])];
                                next[idx] = { ...next[idx], minutes_offset: hrs * 60 + mins };
                                setRouteForm((p) => ({ ...p, stops: next }));
                                markDirty();
                              }}
                              className="w-20 rounded-lg bg-transparent border border-blue-900/30 px-2 py-1 text-sm text-white"
                            >
                              {Array.from({ length: 25 }).map((_, i) => (
                                <option key={i} value={i}>{i}h</option>
                              ))}
                            </select>
                            <select
                              value={(Number(s.minutes_offset) || 0) % 60}
                              onChange={(e) => {
                                const mins = Number(e.target.value) || 0;
                                const hrs = Math.floor((Number(s.minutes_offset) || 0) / 60);
                                const next = [...(routeForm.stops || [])];
                                next[idx] = { ...next[idx], minutes_offset: hrs * 60 + mins };
                                setRouteForm((p) => ({ ...p, stops: next }));
                                markDirty();
                              }}
                              className="w-20 rounded-lg bg-transparent border border-blue-900/30 px-2 py-1 text-sm text-white"
                            >
                              {Array.from({ length: 12 }).map((_, i) => {
                                const v = i * 5;
                                return <option key={v} value={v}>{v}m</option>;
                              })}
                            </select>
                            <button
                              type="button"
                              className="text-xs text-red-300"
                              onClick={() => {
                                const next = [...(routeForm.stops || [])];
                                next.splice(idx, 1);
                                setRouteForm((p) => ({ ...p, stops: next }));
                                markDirty();
                              }}
                            >
                              Eliminar
                            </button>
                          </div>
                        ))
                      )}
                      {(routeForm.stops || []).length > 6 && (
                        <button
                          type="button"
                          className="text-xs text-cyan-300"
                          onClick={() => setShowAllStops((v) => !v)}
                        >
                          {showAllStops ? "Ver menos" : `Ver todas (${routeForm.stops.length})`}
                        </button>
                      )}
                    </div>
                  </div>
                  {routeSaveError && <div className="text-red-400 text-sm">{routeSaveError}</div>}
                  <button
                    type="submit"
                    disabled={routeSaving}
                    className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold py-2 shadow-lg disabled:opacity-50"
                  >
                    {routeSaving ? "Guardando…" : "Guardar ruta"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  async function saveRoutes(nextSchema: any) {
    const res = await fetch("/api/turisticos-del-norte/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schema_json: nextSchema }),
    });
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
    setRawSchema(nextSchema);
    setRoutes(nextSchema.routes || {});
  }
}

function TemplatesSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [rawSchema, setRawSchema] = useState<any>(null);
  const [debug, setDebug] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [mediaPreview, setMediaPreview] = useState("");
  const [removeExisting, setRemoveExisting] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    usage_description: "",
    response_type: "text",
    client_message: "",
    media_url: "",
    media_path: "",
    maps_url: "",
  });
  const [editingKey, setEditingKey] = useState<string>("");
  const [linkEnabled, setLinkEnabled] = useState(false);

  const resetFormState = () => {
    setEditingKey("");
    setForm({ usage_description: "", response_type: "text", client_message: "", media_url: "", media_path: "", maps_url: "" });
    setLinkEnabled(false);
    setDirty(false);
    setSaveError(null);
    setUploadSuccess("");
    setMediaPreview("");
    setPendingFile(null);
    setRemoveExisting(false);
    setImageFailed(false);
  };

  const closeModal = () => {
    resetFormState();
    setShowTemplateModal(false);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/turisticos-del-norte/config");
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
        const data = await res.json();
        const schema = data?.config?.schema_json;
        let parsed = schema;
        if (typeof schema === "string") {
          try {
            parsed = JSON.parse(schema);
          } catch (e) {
            parsed = null;
          }
        }
        setRawSchema(parsed || {});
        const resourcesObj = parsed?.resources || {};
        const resourcesArray = Object.entries(resourcesObj).map(([k, v]: any) => ({ key: k, ...(v || {}) }));
        setTemplates(resourcesArray);
        const preview = typeof schema === "string" ? schema.slice(0, 200) : JSON.stringify(schema).slice(0, 200);
        setDebug(`typeof schema_json: ${typeof schema} · preview: ${preview}`);
        setError(null);
      } catch (err: any) {
        setError(`No se pudo cargar el schema para plantillas. ${err?.message ?? ""}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleFormChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved("");
    try {
      if (!form.usage_description.trim()) {
        setSaveError("Agrega una descripción de uso");
        setSaving(false);
        return;
      }
      if (!form.client_message.trim()) {
        setSaveError("Escribe un mensaje (máx 220)");
        setSaving(false);
        return;
      }
      if (form.client_message.length > 450) {
        setSaveError("Máximo 450 caracteres");
        setSaving(false);
        return;
      }
      if (linkEnabled && !form.maps_url.trim()) {
        setSaveError("Agrega el link de ubicación");
        setSaving(false);
        return;
      }
      let mediaUrl = form.media_url;
      let mediaPath = form.media_path;
      const prevPath = form.media_path;

      if (pendingFile) {
        setUploading(true);
        const uploaded = await uploadFile(pendingFile);
        mediaUrl = uploaded.url;
        mediaPath = uploaded.path || "";
        if (prevPath && prevPath !== mediaPath) {
          await deleteMediaFromStorage(prevPath);
        }
        setUploading(false);
      } else if (removeExisting && prevPath) {
        await deleteMediaFromStorage(prevPath);
        mediaUrl = "";
        mediaPath = "";
      }

      const nextSchema = rawSchema ? { ...rawSchema } : {};
      const resources = { ...(nextSchema.resources || {}) };
      const candidate = form.usage_description || form.client_message || "";
      const normalized = candidate
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/_{2,}/g, "_")
        .replace(/^_|_$/g, "")
        .toUpperCase();
      const key = editingKey || (normalized ? normalized : `RES_${Date.now()}`);
      const existing = resources[key] || {};
      resources[key] = {
        usage_description: form.usage_description,
        response_type: form.response_type,
        client_message: form.client_message,
        media_url: mediaUrl || null,
        media_path: mediaPath || null,
        maps_url: linkEnabled ? (form.maps_url || null) : null,
        active: existing.active ?? true,
      };
      nextSchema.resources = resources;
      await saveResources(nextSchema);
      setForm({ usage_description: "", response_type: "text", client_message: "", media_url: "", media_path: "", maps_url: "" });
      setEditingKey("");
      setLinkEnabled(false);
      setDirty(false);
      setShowTemplateModal(false);
      setPendingFile(null);
      setMediaPreview("");
      setRemoveExisting(false);
      setSaved("Plantilla guardada");
    } catch (err: any) {
      setSaveError(`No se pudo guardar la plantilla. ${err?.message ?? ""}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-zinc-900/90 to-zinc-800/80 border border-blue-900/30 shadow-xl p-8 flex flex-col gap-4 min-h-[220px]">
      <h2 className="text-2xl font-bold text-white mb-2">Plantillas de Mensajes</h2>
      {saved && (
        <div className="fixed bottom-6 right-6 z-20 rounded-xl bg-green-600/20 text-green-100 border border-green-500/40 px-4 py-3 shadow-lg">
          {saved}
        </div>
      )}

      {loading ? (
        <div className="text-blue-300">Cargando plantillas…</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <input
                placeholder="Buscar plantilla"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-72 rounded-xl bg-zinc-900/70 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
              <div className="text-[11px] text-zinc-500">Máx 220 caracteres</div>
            </div>
            <button
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold shadow"
              onClick={() => {
                resetFormState();
                setShowTemplateModal(true);
              }}
            >
              Nueva plantilla
            </button>
          </div>

          {templates.length === 0 ? (
            <div className="text-zinc-500">No hay recursos/plantillas configuradas.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {templates
                .filter((t) => {
                  if (!search.trim()) return true;
                  const q = search.toLowerCase();
                  return (t.usage_description || "").toLowerCase().includes(q) || (t.client_message || "").toLowerCase().includes(q);
                })
                .sort((a, b) => (a.usage_description || "").localeCompare(b.usage_description || ""))
                .map((tpl) => (
                <div key={tpl.key} className="rounded-2xl bg-zinc-900/70 border border-blue-900/30 p-4 shadow space-y-2">
                  <div className="flex items-center justify-between gap-2 cursor-pointer" onClick={() => handleSelect(tpl)}>
                    <div className="text-white font-semibold">{tpl.usage_description || "Sin título"}</div>
                    <div className="flex items-center gap-2">
                      {tpl.active === false && <span className="px-2 py-1 rounded-full text-xs bg-zinc-800 text-zinc-200 border border-zinc-600">Inactiva</span>}
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-900/30 text-blue-200">{tpl.response_type || "text"}</span>
                    </div>
                  </div>
                  {tpl.client_message && (
                    <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed line-clamp-2">{tpl.client_message}</div>
                  )}
                  <div className="flex items-center gap-3 text-xs">
                    {tpl.media_url && (
                      <a href={tpl.media_url} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline">Ver media</a>
                    )}
                    {tpl.maps_url && (
                      <a href={tpl.maps_url} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline">Ver mapa</a>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      className="px-2 py-1 rounded bg-blue-600/30 text-blue-100 border border-blue-600/40"
                      onClick={() => handleSelect(tpl)}
                    >
                      Editar
                    </button>
                    <button
                      className="px-2 py-1 rounded bg-red-600/20 text-red-100 border border-red-600/40"
                      onClick={async () => {
                        const ok = typeof window !== "undefined" ? window.confirm("¿Eliminar plantilla?") : true;
                        if (!ok) return;
                        try {
                          const next = { ...(rawSchema || {}), resources: { ...(rawSchema?.resources || {}) } };
                          delete next.resources[tpl.key];
                          if (tpl.media_path) {
                            await deleteMediaFromStorage(tpl.media_path);
                          }
                          await saveResources(next);
                        } catch (e) {
                          setSaveError("No se pudo eliminar");
                        }
                      }}
                    >
                      Eliminar
                    </button>
                    <button
                      className="px-2 py-1 rounded bg-zinc-800 border border-zinc-600 text-zinc-200"
                      onClick={() => handleDuplicate(tpl)}
                    >
                      Duplicar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showTemplateModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={closeModal}>
          <div
            className="relative w-full max-w-3xl rounded-3xl bg-zinc-950 border border-blue-900/40 shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              aria-label="Cerrar"
              className="absolute top-3 right-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white px-3 py-1 text-sm"
              onClick={closeModal}
            >
              ×
            </button>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
              <div className="text-white font-semibold text-lg">{editingKey ? "Editar plantilla" : "Nueva plantilla"}</div>
            </div>

            <form className="space-y-3" onSubmit={handleAdd}>
              <input
                placeholder="Descripción de uso"
                value={form.usage_description}
                onChange={(e) => handleFormChange("usage_description", e.target.value)}
                className="w-full rounded-xl bg-zinc-900/70 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
              <select
                value={form.response_type}
                onChange={(e) => handleFormChange("response_type", e.target.value)}
                className="w-full rounded-xl bg-zinc-900/70 border border-blue-900/30 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="text">Texto</option>
              </select>
              <textarea
                rows={4}
                maxLength={450}
                placeholder="Mensaje al cliente (máx 450)"
                value={form.client_message}
                onChange={(e) => handleFormChange("client_message", e.target.value)}
                className="w-full rounded-xl bg-zinc-900/70 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
              <div className="text-[11px] text-zinc-500 text-right">{form.client_message.length}/450</div>
              <div className="space-y-3 rounded-xl border border-blue-900/30 bg-zinc-900/70 p-3">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Media (imagen/archivo). Se sube y genera URL pública.</span>
                  {form.media_url && (
                    <div className="flex items-center gap-2">
                      <a href={form.media_url} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline">Descargar</a>
                      <button
                        type="button"
                        className="text-amber-300"
                        onClick={() => replaceInputRef.current?.click()}
                      >
                        Reemplazar
                      </button>
                      <button
                        type="button"
                        className="text-red-300"
                        onClick={() => {
                          setForm((p) => ({ ...p, media_url: "", media_path: "" }));
                          setDirty(true);
                          setMediaPreview("");
                          setPendingFile(null);
                          setUploadSuccess("");
                          setRemoveExisting(true);
                        }}
                      >
                        Quitar
                      </button>
                    </div>
                  )}
                </div>

                {(mediaPreview || form.media_url) && form.response_type === "text" ? (
                  !imageFailed ? (
                    <div className="rounded-xl bg-black/30 border border-white/5 p-2 flex flex-col gap-1 items-center justify-center">
                      <img
                        src={mediaPreview || form.media_url}
                        alt="media"
                        className="max-h-64 w-full object-contain"
                        onError={() => setImageFailed(true)}
                      />
                      <div className="text-[11px] text-zinc-400">Vista previa</div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-black/30 border border-white/5 p-3 text-xs text-zinc-200 flex items-center justify-between">
                      <span className="truncate">Archivo listo: {form.media_url}</span>
                      <a className="text-cyan-300 underline" href={form.media_url} target="_blank" rel="noopener noreferrer">Abrir</a>
                    </div>
                  )
                ) : null}

                <input
                  ref={replaceInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setSaveError(null);
                    setPendingFile(file);
                    setImageFailed(false);
                    const objUrl = URL.createObjectURL(file);
                    setMediaPreview(objUrl);
                    setUploadSuccess("Listo para guardar");
                    setDirty(true);
                    setRemoveExisting(false);
                    // limpia para permitir volver a subir el mismo archivo si se desea
                    if (e.target) (e.target as HTMLInputElement).value = "";
                  }}
                  className="w-full text-sm text-zinc-200"
                />
                {uploading && <div className="text-xs text-blue-300">Subiendo archivo…</div>}
                {uploadSuccess && !uploading && <div className="text-xs text-green-300">{uploadSuccess}</div>}
              </div>
              <label className="flex items-center gap-2 text-sm text-white">
                <input
                  type="checkbox"
                  checked={linkEnabled}
                  onChange={(e) => setLinkEnabled(e.target.checked)}
                />
                <span>Incluir link de ubicación</span>
              </label>
              {linkEnabled && (
                <input
                  placeholder="Link de ubicación"
                  value={form.maps_url}
                  onChange={(e) => handleFormChange("maps_url", e.target.value)}
                  className="w-full rounded-xl bg-zinc-900/70 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                />
              )}
              {dirty && !saving && <div className="text-[11px] text-amber-300">Tienes cambios sin guardar</div>}
              {saveError && <div className="text-red-400 text-sm">{saveError}</div>}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
                <button
                  type="button"
                  className="w-full sm:w-auto rounded-xl border border-zinc-700 px-4 py-2 text-sm text-white bg-zinc-900/60"
                  onClick={closeModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold px-4 py-2 shadow-lg disabled:opacity-50"
                >
                  {saving ? "Guardando…" : editingKey ? "Actualizar plantilla" : "Guardar plantilla"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  function handleSelect(tpl: any) {
    setEditingKey(tpl.key);
    setForm({
      usage_description: tpl.usage_description || "",
      response_type: tpl.response_type || "text",
      client_message: tpl.client_message || "",
      media_url: tpl.media_url || "",
      media_path: tpl.media_path || "",
      maps_url: tpl.maps_url || "",
    });
    setLinkEnabled(!!tpl.maps_url);
    setDirty(false);
    setSaveError(null);
    setPendingFile(null);
    setRemoveExisting(false);
    const maybePreview = tpl.media_url && (isImageUrl(tpl.media_url) || isImageUrl(tpl.media_path || "")) ? tpl.media_url : "";
    setMediaPreview(maybePreview);
    setShowTemplateModal(true);
  }

  function handleDuplicate(tpl: any) {
    setEditingKey("");
    setForm({
      usage_description: `${tpl.usage_description || tpl.key} copia`,
      response_type: tpl.response_type || "text",
      client_message: tpl.client_message || "",
      media_url: "",
      media_path: "",
      maps_url: tpl.maps_url || "",
    });
    setLinkEnabled(!!tpl.maps_url);
    setSaveError(null);
    setDirty(true);
    setPendingFile(null);
    setRemoveExisting(false);
    const maybePreview = "";
    setMediaPreview(maybePreview);
    setShowTemplateModal(true);
  }

  async function uploadFile(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/turisticos-del-norte/upload", {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      let detail = "";
      try {
        const j = await res.json();
        detail = j ? ` · ${JSON.stringify(j)}` : "";
      } catch (e) {
        detail = "";
      }
      throw new Error(`Upload failed (${res.status})${detail}`);
    }
    const data = await res.json();
    if (!data?.url) throw new Error("Respuesta sin URL");
    return { url: data.url as string, path: data.path as string | undefined };
  }

  async function deleteMediaFromStorage(path?: string) {
    if (!path) return;
    try {
      await fetch("/api/turisticos-del-norte/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
    } catch (e) {
      console.error("No se pudo eliminar de storage", e);
    }
  }

  function isImageUrl(url: string) {
    return /\.(png|jpe?g|gif|webp|heic|heif|bmp|tiff?)($|\?)/i.test(url.split("?")[0]);
  }

  async function saveResources(nextSchema: any) {
    const res = await fetch("/api/turisticos-del-norte/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schema_json: nextSchema }),
    });
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
    const resourcesArray = Object.entries(nextSchema.resources || {}).map(([k, v]: any) => ({ key: k, ...(v || {}) }));
    setRawSchema(nextSchema);
    setTemplates(resourcesArray);
  }
}
