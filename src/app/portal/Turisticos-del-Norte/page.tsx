"use client";

import React, { useState, useEffect, useMemo } from "react";
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
    name: "",
    origin_city: "",
    destination_city: "",
    calculate_times: false,
    active: true,
    stopsText: "[]",
  });
  const [routeSaving, setRouteSaving] = useState(false);
  const [routeSaveError, setRouteSaveError] = useState<string | null>(null);

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
      <div className="text-zinc-400 mb-4">Administra las rutas, paradas y horarios de tu empresa turística.</div>
      {currentTenant && <div className="text-xs text-zinc-500">Tenant actual en sesión: {currentTenant}</div>}
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
                    <div className="text-lg font-bold text-white">{route.name}</div>
                    <div className="text-xs text-blue-300 font-mono">{route.code || key}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className={cn(
                        "px-2 py-1 rounded text-xs",
                        route.active === false
                          ? "bg-red-500/20 text-red-200 border border-red-500/30"
                          : "bg-green-500/20 text-green-200 border border-green-500/30"
                      )}
                      onClick={async () => {
                        try {
                          const next = { ...(rawSchema || {}), routes: { ...(rawSchema?.routes || {}) } };
                          const current = next.routes[key] || {};
                          next.routes[key] = { ...current, active: current.active === false ? true : false };
                          await saveRoutes(next);
                        } catch (e) {
                          setError("No se pudo cambiar estatus");
                        }
                      }}
                    >
                      {route.active === false ? "Inactiva" : "Activa"}
                    </button>
                    <button
                      className="px-2 py-1 rounded text-xs bg-blue-600/30 text-blue-100 border border-blue-600/40"
                      onClick={() => {
                        setEditingKey(String(key));
                        setRouteForm({
                          key: String(key),
                          code: route.code || String(key),
                          name: route.name || "",
                          origin_city: route.config?.origin_city || "",
                          destination_city: route.config?.destination_city || "",
                          calculate_times: !!route.config?.calculate_times,
                          active: route.active !== false,
                          stopsText: JSON.stringify(route.stops || [], null, 2),
                        });
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="px-2 py-1 rounded text-xs bg-red-600/20 text-red-100 border border-red-600/40"
                      onClick={async () => {
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
                <div className="text-xs text-zinc-400">{route.config?.origin_city} → {route.config?.destination_city}</div>
                <div className="text-xs text-zinc-500">{route.stops?.length || 0} paradas</div>
              </div>
              ))
            )}
          </div>

          <div className="rounded-2xl bg-zinc-900/70 border border-blue-900/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-semibold">{editingKey ? "Editar ruta" : "Agregar ruta"}</div>
                <div className="text-xs text-zinc-500">Guarda en schema_json.routes</div>
              </div>
              {editingKey && (
                <button className="text-xs text-cyan-300" onClick={() => { setEditingKey(""); setRouteForm({ key: "", code: "", name: "", origin_city: "", destination_city: "", calculate_times: false, active: true, stopsText: "[]" }); }}>
                  Limpiar
                </button>
              )}
            </div>
            <form
              className="space-y-2"
              onSubmit={async (e) => {
                e.preventDefault();
                setRouteSaving(true);
                setRouteSaveError(null);
                try {
                  let stopsParsed: any = [];
                  if (routeForm.stopsText.trim()) {
                    stopsParsed = JSON.parse(routeForm.stopsText);
                    if (!Array.isArray(stopsParsed)) throw new Error("stops debe ser un arreglo");
                  }
                  const next = { ...(rawSchema || {}) };
                  const routesCopy = { ...(next.routes || {}) };
                  const key = routeForm.key.trim() || routeForm.code.trim() || `RUTA_${Date.now()}`;
                  routesCopy[key] = {
                    code: routeForm.code || key,
                    name: routeForm.name || key,
                    stops: stopsParsed,
                    active: routeForm.active,
                    config: {
                      origin_city: routeForm.origin_city,
                      destination_city: routeForm.destination_city,
                      calculate_times: routeForm.calculate_times,
                    },
                  };
                  next.routes = routesCopy;
                  await saveRoutes(next);
                  setEditingKey("");
                  setRouteForm({ key: "", code: "", name: "", origin_city: "", destination_city: "", calculate_times: false, active: true, stopsText: "[]" });
                } catch (err: any) {
                  setRouteSaveError(err?.message || "Error al guardar");
                } finally {
                  setRouteSaving(false);
                }
              }}
            >
              <input
                required
                placeholder="Clave (ej. C_M)"
                value={routeForm.key}
                onChange={(e) => setRouteForm((p) => ({ ...p, key: e.target.value }))}
                className="w-full rounded-xl bg-zinc-950/60 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
              <input
                placeholder="Código"
                value={routeForm.code}
                onChange={(e) => setRouteForm((p) => ({ ...p, code: e.target.value }))}
                className="w-full rounded-xl bg-zinc-950/60 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
              <input
                placeholder="Nombre"
                value={routeForm.name}
                onChange={(e) => setRouteForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-xl bg-zinc-950/60 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Origen"
                  value={routeForm.origin_city}
                  onChange={(e) => setRouteForm((p) => ({ ...p, origin_city: e.target.value }))}
                  className="w-full rounded-xl bg-zinc-950/60 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                />
                <input
                  placeholder="Destino"
                  value={routeForm.destination_city}
                  onChange={(e) => setRouteForm((p) => ({ ...p, destination_city: e.target.value }))}
                  className="w-full rounded-xl bg-zinc-950/60 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-3 text-sm text-white">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={routeForm.calculate_times}
                    onChange={(e) => setRouteForm((p) => ({ ...p, calculate_times: e.target.checked }))}
                  />
                  Calcular tiempos
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={routeForm.active}
                    onChange={(e) => setRouteForm((p) => ({ ...p, active: e.target.checked }))}
                  />
                  Activa
                </label>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">Paradas (JSON Array)</div>
                <textarea
                  rows={6}
                  value={routeForm.stopsText}
                  onChange={(e) => setRouteForm((p) => ({ ...p, stopsText: e.target.value }))}
                  className="w-full rounded-xl bg-zinc-950/60 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none font-mono"
                />
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
  const [form, setForm] = useState({
    key: "",
    usage_description: "",
    response_type: "text",
    client_message: "",
    media_url: "",
    maps_url: "",
    active: true,
  });
  const [editingKey, setEditingKey] = useState<string>("");

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
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const nextSchema = rawSchema ? { ...rawSchema } : {};
      const resources = { ...(nextSchema.resources || {}) };
      const key = form.key.trim() ? form.key.trim().toUpperCase().replace(/\s+/g, "_") : `RES_${Date.now()}`;
      resources[key] = {
        usage_description: form.usage_description,
        response_type: form.response_type,
        client_message: form.client_message,
        media_url: form.media_url || null,
        maps_url: form.maps_url || null,
        active: form.active,
      };
      nextSchema.resources = resources;
      await saveResources(nextSchema);
      setForm({ key: "", usage_description: "", response_type: "text", client_message: "", media_url: "", maps_url: "", active: true });
      setEditingKey("");
    } catch (err: any) {
      setSaveError(`No se pudo guardar la plantilla. ${err?.message ?? ""}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-zinc-900/90 to-zinc-800/80 border border-blue-900/30 shadow-xl p-8 flex flex-col gap-4 min-h-[220px]">
      <h2 className="text-2xl font-bold text-white mb-2">Plantillas de Mensajes</h2>
      <div className="text-zinc-400 mb-2">Se leen/escriben en schema_json.resources (industry_configs, tenant 26).</div>
      {debug && <div className="text-[11px] text-zinc-600">{debug}</div>}

      {loading ? (
        <div className="text-blue-300">Cargando plantillas…</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : (
        <div className="grid lg:grid-cols-[2fr,1fr] gap-4">
          <div className="space-y-3">
            {templates.length === 0 ? (
              <div className="text-zinc-500">No hay recursos/plantillas configuradas.</div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {templates.map((tpl) => (
                  <div key={tpl.key} className="rounded-2xl bg-zinc-900/70 border border-blue-900/30 p-4 shadow space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-white font-semibold">{tpl.usage_description || tpl.key}</div>
                        <div className="text-xs text-blue-300 font-mono">{tpl.key}</div>
                      </div>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs",
                        tpl.active === false ? "bg-red-500/20 text-red-200 border border-red-500/30" : "bg-green-500/20 text-green-200 border border-green-500/30"
                      )}>{tpl.response_type || "text"}</span>
                    </div>
                    {tpl.client_message && (
                      <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{tpl.client_message}</div>
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
                          try {
                            const next = { ...(rawSchema || {}), resources: { ...(rawSchema?.resources || {}) } };
                            delete next.resources[tpl.key];
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
                        onClick={async () => {
                          try {
                            const next = { ...(rawSchema || {}), resources: { ...(rawSchema?.resources || {}) } };
                            const current = next.resources[tpl.key] || {};
                            next.resources[tpl.key] = { ...current, active: current.active === false ? true : false };
                            await saveResources(next);
                          } catch (e) {
                            setSaveError("No se pudo cambiar estatus");
                          }
                        }}
                      >
                        {tpl.active === false ? "Inactiva" : "Activa"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-zinc-900/70 border border-blue-900/30 p-4 space-y-3">
            <div>
              <div className="text-white font-semibold">Agregar/Actualizar plantilla</div>
              <div className="text-xs text-zinc-500">Se guarda en schema_json.resources (key en MAYÚSCULAS)</div>
            </div>
            <form className="space-y-2" onSubmit={handleAdd}>
              <input
                required
                placeholder="Clave (ej. INFO_PAGO)"
                value={form.key}
                onChange={(e) => handleFormChange("key", e.target.value)}
                className="w-full rounded-xl bg-zinc-950/60 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
              <input
                placeholder="Descripción de uso"
                value={form.usage_description}
                onChange={(e) => handleFormChange("usage_description", e.target.value)}
                className="w-full rounded-xl bg-zinc-950/60 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
              <select
                value={form.response_type}
                onChange={(e) => handleFormChange("response_type", e.target.value)}
                className="w-full rounded-xl bg-zinc-950/60 border border-blue-900/30 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="text">Texto</option>
                <option value="image">Imagen</option>
                <option value="location_image">Ubicación + imagen</option>
              </select>
              <textarea
                rows={5}
                placeholder="Mensaje al cliente"
                value={form.client_message}
                onChange={(e) => handleFormChange("client_message", e.target.value)}
                className="w-full rounded-xl bg-zinc-950/60 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
              <input
                placeholder="Media URL (opcional)"
                value={form.media_url}
                onChange={(e) => handleFormChange("media_url", e.target.value)}
                className="w-full rounded-xl bg-zinc-950/60 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
              <input
                placeholder="Maps URL (opcional)"
                value={form.maps_url}
                onChange={(e) => handleFormChange("maps_url", e.target.value)}
                className="w-full rounded-xl bg-zinc-950/60 border border-blue-900/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
              />
              <div className="flex items-center gap-2 text-sm text-white">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                />
                <span>Activa</span>
                {editingKey && (
                  <button type="button" className="text-xs text-cyan-300" onClick={() => {
                    setEditingKey("");
                    setForm({ key: "", usage_description: "", response_type: "text", client_message: "", media_url: "", maps_url: "", active: true });
                  }}>Limpiar</button>
                )}
              </div>
              {saveError && <div className="text-red-400 text-sm">{saveError}</div>}
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold py-2 shadow-lg disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Guardar plantilla"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  function handleSelect(tpl: any) {
    setEditingKey(tpl.key);
    setForm({
      key: tpl.key || "",
      usage_description: tpl.usage_description || "",
      response_type: tpl.response_type || "text",
      client_message: tpl.client_message || "",
      media_url: tpl.media_url || "",
      maps_url: tpl.maps_url || "",
      active: tpl.active !== false,
    });
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
