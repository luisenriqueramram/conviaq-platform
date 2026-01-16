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
    <div className="min-h-screen w-full bg-zinc-950 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 sm:gap-8">
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

const DAY_OPTIONS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

function CalendarSection() {
  const [rows, setRows] = useState<CalendarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ route: "", status: "", start: "", end: "" });
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [routeOptions, setRouteOptions] = useState<Array<{ key: string; label: string }>>([]);
  const [selectedDateKey, setSelectedDateKey] = useState<string>("");
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

  useEffect(() => {
    const loadRoutes = async () => {
      try {
        const res = await fetch("/api/turisticos-del-norte/config");
        if (!res.ok) return;
        const data = await res.json();
        const rawSchema = data?.config?.schema_json;
        let parsed = rawSchema;
        if (typeof rawSchema === "string") {
          try {
            parsed = JSON.parse(rawSchema);
          } catch {
            parsed = null;
          }
        }
        const routesData = parsed?.routes ?? {};
        const options = Object.entries(routesData).map(([key, route]: any) => ({
          key,
          label: route?.name || `${route?.config?.origin_city || "Inicio"} → ${route?.config?.destination_city || "Fin"}`,
        }));
        setRouteOptions(options);
      } catch {
        setRouteOptions([]);
      }
    };
    loadRoutes();
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

  const getTripDate = (value: CalendarRow["trip_date"]) => {
    if (typeof value === "string") {
      return value.length >= 10 ? value.slice(0, 10) : value;
    }
    return new Date(value).toISOString().slice(0, 10);
  };

  const filteredRows = useMemo(() => {
    return rows
      .filter((r) => (filters.status ? r.status === filters.status : true))
      .filter((r) => (filters.route ? r.route_key.toLowerCase().includes(filters.route.toLowerCase()) : true))
      .filter((r) => {
        const dateKey = getTripDate(r.trip_date);
        return filters.start ? dateKey >= filters.start : true;
      })
      .filter((r) => {
        const dateKey = getTripDate(r.trip_date);
        return filters.end ? dateKey <= filters.end : true;
      })
      .sort(compareRowsDesc);
  }, [rows, filters]);

  const handleChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const monthName = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(calendarMonth);
  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const firstDay = monthStart.getDay();
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const todayKey = new Date().toISOString().slice(0, 10);

  const getRouteLabel = (routeKey: string) => {
    const found = routeOptions.find((opt) => opt.key === routeKey);
    return found?.label || routeKey;
  };

  const monthRows = useMemo(() => {
    const map = new Map<string, CalendarRow[]>();
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth() + 1;
    for (const row of filteredRows) {
      const dateKey = getTripDate(row.trip_date);
      const [y, m] = dateKey.split("-").map(Number);
      if (y !== year || m !== month) continue;
      const key = dateKey;
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return map;
  }, [filteredRows, calendarMonth]);

  const routeColorMap = useMemo(() => {
    const palette = [
      { pill: "bg-cyan-500/20 border-cyan-400/60 text-cyan-100", dot: "bg-cyan-400" },
      { pill: "bg-emerald-500/20 border-emerald-400/60 text-emerald-100", dot: "bg-emerald-400" },
      { pill: "bg-amber-500/20 border-amber-400/60 text-amber-100", dot: "bg-amber-400" },
      { pill: "bg-violet-500/20 border-violet-400/60 text-violet-100", dot: "bg-violet-400" },
      { pill: "bg-fuchsia-500/20 border-fuchsia-400/60 text-fuchsia-100", dot: "bg-fuchsia-400" },
      { pill: "bg-sky-500/20 border-sky-400/60 text-sky-100", dot: "bg-sky-400" },
      { pill: "bg-rose-500/20 border-rose-400/60 text-rose-100", dot: "bg-rose-400" },
      { pill: "bg-lime-500/20 border-lime-400/60 text-lime-100", dot: "bg-lime-400" },
    ];
    const keys = routeOptions.length
      ? routeOptions.map((r) => r.key)
      : Array.from(new Set(rows.map((r) => r.route_key)));
    const map = new Map<string, { pill: string; dot: string }>();
    keys.forEach((key, idx) => {
      map.set(key, palette[idx % palette.length]);
    });
    return map;
  }, [routeOptions, rows]);

  const getRouteColor = (routeKey: string) => routeColorMap.get(routeKey)?.pill || "bg-zinc-700/20 border-zinc-500/60 text-zinc-200";
  const getRouteDot = (routeKey: string) => routeColorMap.get(routeKey)?.dot || "bg-zinc-500";
  const selectedRows = selectedDateKey ? (monthRows.get(selectedDateKey) ?? []) : [];

  useEffect(() => {
    setCalendarMonth(new Date());
  }, []);

  const formatCurrency = (value: number | string) =>
    Number(value).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
        setForm((prev) => ({ ...prev, route_key: "", trip_date: "", departure_time: "", price: "" }));
      }
    } catch (err: any) {
      setCreateError(`No se pudo crear la salida. ${err?.message ?? ""}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="rounded-3xl bg-gradient-to-br from-zinc-900/90 to-zinc-800/80 border border-blue-900/30 shadow-xl p-4 sm:p-6 lg:p-8 flex flex-col gap-4 min-h-[220px]">
      <h2 className="text-2xl font-bold text-white mb-2">Calendario de Salidas</h2>
        <div className="text-zinc-400">Visualiza salidas por día. Haz clic en una fecha para ver detalles y costos.</div>

      <div className="grid gap-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <select
              value={filters.route}
              onChange={(e) => handleChange("route", e.target.value)}
              className="w-full rounded-xl bg-zinc-900/70 border border-blue-900/30 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todas las rutas</option>
              {(routeOptions.length ? routeOptions : Array.from(new Set(rows.map((r) => r.route_key))).map((key) => ({ key, label: key })))
                .map((route) => (
                  <option key={route.key} value={route.key}>{route.label}</option>
                ))}
            </select>
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

          {(filters.route || filters.status || filters.start || filters.end) && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300">
              <span className="text-zinc-500">Filtros activos:</span>
              {filters.route && <span className="px-2 py-1 rounded-full bg-zinc-800 border border-zinc-700">Ruta: {getRouteLabel(filters.route)}</span>}
              {filters.status && <span className="px-2 py-1 rounded-full bg-zinc-800 border border-zinc-700">Estatus: {filters.status}</span>}
              {filters.start && <span className="px-2 py-1 rounded-full bg-zinc-800 border border-zinc-700">Desde: {filters.start}</span>}
              {filters.end && <span className="px-2 py-1 rounded-full bg-zinc-800 border border-zinc-700">Hasta: {filters.end}</span>}
              <button
                type="button"
                onClick={() => setFilters({ route: "", status: "", start: "", end: "" })}
                className="px-2 py-1 rounded-full border border-cyan-500/40 text-cyan-200"
              >
                Limpiar filtros
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-blue-300">Cargando calendario…</div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : (
            <div className="rounded-2xl border border-blue-900/30 bg-zinc-900/50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold capitalize">{monthName}</div>
                  <div className="text-xs text-zinc-500">Vista mensual con rutas, horarios, costos y estatus.</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-1 rounded-lg bg-zinc-900/70 border border-blue-900/30 text-white"
                    onClick={() => setCalendarMonth(new Date())}
                  >
                    Hoy
                  </button>
                  <button
                    className="px-3 py-1 rounded-lg bg-zinc-900/70 border border-blue-900/30 text-white"
                    onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  >
                    ←
                  </button>
                  <button
                    className="px-3 py-1 rounded-lg bg-zinc-900/70 border border-blue-900/30 text-white"
                    onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                <span className="text-zinc-500">Leyenda:</span>
                <span className="px-2 py-[2px] rounded-full bg-green-500/20 text-green-200 border border-green-500/30">Activo</span>
                <span className="px-2 py-[2px] rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30">Pausado</span>
                <span className="px-2 py-[2px] rounded-full bg-red-500/20 text-red-200 border border-red-500/30">Cancelado</span>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[720px]">
                  <div className="grid grid-cols-7 gap-2 text-xs text-zinc-500">
                    {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
                      <div key={d} className="text-center">{d}</div>
                    ))}
                  </div>

                  {filteredRows.length === 0 ? (
                    <div className="text-zinc-500">No hay salidas registradas con estos filtros.</div>
                  ) : (
                    <div className="grid grid-cols-7 gap-2">
                      {emptyDays.map((i) => (
                        <div key={`empty-${i}`} className="min-h-[96px] sm:min-h-[110px] rounded-xl border border-transparent" />
                      ))}
                      {monthDays.map((day) => {
                        const dateKey = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const dayRows = monthRows.get(dateKey) ?? [];
                        const visible = dayRows.slice(0, 3);
                        const extra = dayRows.length - visible.length;
                        return (
                          <button
                            type="button"
                            key={dateKey}
                            onClick={() => setSelectedDateKey(dateKey)}
                            className={cn(
                              "min-h-[96px] sm:min-h-[110px] rounded-xl border bg-zinc-950/60 p-2 space-y-2 text-left transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-md",
                              dateKey === todayKey ? "border-cyan-400/70 shadow-[0_0_0_1px_rgba(34,211,238,0.35)]" : "border-blue-900/30",
                              selectedDateKey === dateKey ? "ring-1 ring-cyan-400/40" : ""
                            )}
                          >
                            <div className={cn("text-xs font-semibold", dateKey === todayKey ? "text-cyan-200" : "text-zinc-400")}>{day}</div>
                            {visible.length === 0 ? (
                              <div className="text-[10px] text-zinc-600">Sin salidas</div>
                            ) : (
                              <div className="space-y-1">
                                {visible.map((row) => (
                                  <div key={row.id} className="rounded-lg border border-blue-900/30 bg-zinc-900/70 px-2 py-1 transition-all duration-200 hover:border-blue-500/50 hover:bg-zinc-900/90">
                                    <div className="flex items-center justify-between text-[10px] text-zinc-300">
                                      <span className="flex items-center gap-2 font-semibold text-zinc-100 truncate">
                                        <span className={cn("h-2 w-2 rounded-full", getRouteDot(row.route_key))} />
                                        {getRouteLabel(row.route_key)}
                                      </span>
                                      <span>{formatTime(row.departure_time)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                                      <span>${formatCurrency(row.price)}</span>
                                      <span className={cn(
                                        "px-2 py-[1px] rounded-full",
                                        row.status === "Activo"
                                          ? "bg-green-500/20 text-green-200 border border-green-500/30"
                                          : row.status === "Cancelado"
                                            ? "bg-red-500/20 text-red-200 border border-red-500/30"
                                            : "bg-amber-500/20 text-amber-200 border border-amber-500/30"
                                      )}>
                                        {row.status}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                                {extra > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedDateKey(dateKey)}
                                    className="text-[10px] text-cyan-300"
                                  >
                                    +{extra} más
                                  </button>
                                )}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {selectedDateKey && (
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm">
        <div className="absolute right-0 top-0 h-full w-full md:max-w-md bg-zinc-950 border-l border-blue-900/40 shadow-2xl p-4 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-400">Detalle del día</div>
              <div className="text-lg font-semibold text-white">{selectedDateKey}</div>
              <div className="text-xs text-zinc-500">Salidas programadas y estatus</div>
            </div>
            <button
              type="button"
              className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-200"
              onClick={() => setSelectedDateKey("")}
            >
              Cerrar
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto pr-1">
            {selectedRows.length === 0 ? (
              <div className="text-sm text-zinc-500">No hay salidas en este día.</div>
            ) : (
              selectedRows
                .slice()
                .sort((a, b) => a.departure_time.localeCompare(b.departure_time))
                .map((row) => (
                  <div key={row.id} className="rounded-xl border border-blue-900/30 bg-zinc-900/70 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-white font-semibold">
                        <span className={cn("h-2.5 w-2.5 rounded-full", getRouteDot(row.route_key))} />
                        {getRouteLabel(row.route_key)}
                      </div>
                      <span className="text-xs text-zinc-400">{formatTime(row.departure_time)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>{row.origin_area || "-"} → {row.destination_area || "-"}</span>
                      <span className="text-sm font-semibold text-blue-200">${formatCurrency(row.price)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={cn("px-2 py-[1px] rounded-full border", getRouteColor(row.route_key))}>Ruta</span>
                      <span className={cn(
                        "px-2 py-[1px] rounded-full",
                        row.status === "Activo"
                          ? "bg-green-500/20 text-green-200 border border-green-500/30"
                          : row.status === "Cancelado"
                            ? "bg-red-500/20 text-red-200 border border-red-500/30"
                            : "bg-amber-500/20 text-amber-200 border border-amber-500/30"
                      )}>
                        {row.status}
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
      )}
    </>
  );
}



function RoutesSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routes, setRoutes] = useState<any>({});
  const [rawSchema, setRawSchema] = useState<any>(null);
  const [calendarRows, setCalendarRows] = useState<CalendarRow[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
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
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerSaving, setPlannerSaving] = useState(false);
  const [plannerSaved, setPlannerSaved] = useState("");
  const [plannerError, setPlannerError] = useState<string | null>(null);
  const [plannerRouteKey, setPlannerRouteKey] = useState("");
  const [plannerRange, setPlannerRange] = useState({ start: "", end: "" });
  const [plannerBase, setPlannerBase] = useState({
    price: "",
    time: "07:00",
    status: "Activo",
    origin_area: "",
    destination_area: "",
  });
  const [costRules, setCostRules] = useState<{ id: string; amount: number; days: number[] }[]>([]);
  const [timeRules, setTimeRules] = useState<{ id: string; time: string; days: number[] }[]>([]);
  const [blockedDays, setBlockedDays] = useState<number[]>([]);
  const [costDraft, setCostDraft] = useState<{ amount: string; days: number[] }>({ amount: "", days: [] });
  const [timeDraft, setTimeDraft] = useState<{ time: string; days: number[] }>({ time: "", days: [] });

  const markDirty = () => setRouteDirty(true);

  const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);
  const formatShort = (d: Date) =>
    new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short" }).format(d);
  const formatLong = (d: Date) =>
    new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(d);
  const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

  const getLatestRowForRoute = (routeKey: string) => {
    let latest: CalendarRow | null = null;
    for (const row of calendarRows) {
      if (row.route_key !== routeKey) continue;
      if (!latest) {
        latest = row;
        continue;
      }
      const da = new Date(`${row.trip_date}T${row.departure_time}`);
      const db = new Date(`${latest.trip_date}T${latest.departure_time}`);
      if (da.getTime() > db.getTime()) latest = row;
    }
    return latest;
  };

  const openPlanner = (routeKey: string, routeData: any) => {
    const today = new Date();
    const end = new Date();
    end.setDate(today.getDate() + 13);
    const latest = getLatestRowForRoute(routeKey);
    const latestTime = latest?.departure_time ? latest.departure_time.slice(0, 5) : "07:00";
    setPlannerRouteKey(routeKey);
    setPlannerRange({ start: toIsoDate(today), end: toIsoDate(end) });
    setPlannerBase({
      price: latest?.price ? String(latest.price) : "",
      time: latestTime,
      status: "Activo",
      origin_area: latest?.origin_area || routeData?.config?.origin_city || "",
      destination_area: latest?.destination_area || routeData?.config?.destination_city || "",
    });
    setCostRules([]);
    setTimeRules([]);
    setBlockedDays([]);
    setCostDraft({ amount: "", days: [] });
    setTimeDraft({ time: "", days: [] });
    setPlannerError(null);
    setPlannerSaved("");
    setPlannerOpen(true);
  };

  const usedCostDays = new Set(costRules.flatMap((r) => r.days));
  const usedTimeDays = new Set(timeRules.flatMap((r) => r.days));

  const availableCostDay = (d: number) => !usedCostDays.has(d) || costDraft.days.includes(d);
  const availableTimeDay = (d: number) => !usedTimeDays.has(d) || timeDraft.days.includes(d);

  const toggleDayDraft = (kind: "cost" | "time", day: number) => {
    if (kind === "cost") {
      const exists = costDraft.days.includes(day);
      setCostDraft((prev) => ({ ...prev, days: exists ? prev.days.filter((d) => d !== day) : [...prev.days, day] }));
    } else {
      const exists = timeDraft.days.includes(day);
      setTimeDraft((prev) => ({ ...prev, days: exists ? prev.days.filter((d) => d !== day) : [...prev.days, day] }));
    }
  };

  const toggleBlockedDay = (day: number) => {
    setBlockedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const addCostRule = () => {
    const amountNum = Number(costDraft.amount);
    if (!amountNum || !costDraft.days.length) return;
    setCostRules((prev) => [...prev, { id: makeId("cost"), amount: amountNum, days: costDraft.days }]);
    setCostDraft({ amount: "", days: [] });
  };

  const addTimeRule = () => {
    if (!timeDraft.time || !timeDraft.days.length) return;
    setTimeRules((prev) => [...prev, { id: makeId("time"), time: timeDraft.time, days: timeDraft.days }]);
    setTimeDraft({ time: "", days: [] });
  };

  const calendarDays = useMemo(() => {
    if (!plannerRange.start || !plannerRange.end || !plannerRouteKey) return [] as { key: string; date: Date; cost: number; time: string; blocked: boolean }[];
    const start = new Date(plannerRange.start);
    const end = new Date(plannerRange.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    const days = [] as { key: string; date: Date; cost: number; time: string; blocked: boolean }[];
    let cursor = new Date(start);
    const baseCost = Number(plannerBase.price) || 0;
    const rowMap = new Map<string, CalendarRow>();
    for (const row of calendarRows) {
      if (row.route_key === plannerRouteKey) {
        rowMap.set(row.trip_date, row);
      }
    }
    while (cursor <= end) {
      const dow = cursor.getDay();
      const dateKey = cursor.toISOString().slice(0, 10);
      const existing = rowMap.get(dateKey);
      const existingCost = existing?.price ? Number(existing.price) : undefined;
      const existingTime = existing?.departure_time ? existing.departure_time.slice(0, 5) : undefined;
      const costRule = costRules.find((r) => r.days.includes(dow));
      const timeRule = timeRules.find((r) => r.days.includes(dow));
      const blocked = blockedDays.includes(dow);
      days.push({
        key: cursor.toISOString(),
        date: new Date(cursor),
        cost: costRule?.amount ?? existingCost ?? baseCost,
        time: timeRule?.time ?? existingTime ?? plannerBase.time,
        blocked,
      });
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    }
    return days;
  }, [plannerRange, plannerRouteKey, plannerBase.price, plannerBase.time, costRules, timeRules, calendarRows, blockedDays]);

  const plannerRoute = plannerRouteKey ? (routes as any)[plannerRouteKey] : null;
  const dayLabel = (d: number) => DAY_OPTIONS.find((opt) => opt.value === d)?.label ?? "";

  const handlePlannerSave = async () => {
    if (!plannerRouteKey) {
      setPlannerError("Selecciona una ruta");
      return;
    }
    if (!plannerRange.start || !plannerRange.end) {
      setPlannerError("Selecciona un rango de fechas");
      return;
    }
    if (!plannerBase.price || Number(plannerBase.price) <= 0) {
      setPlannerError("Define un precio base válido");
      return;
    }
    if (!plannerBase.time) {
      setPlannerError("Define una hora de salida base");
      return;
    }
    const activeDays = calendarDays.filter((d) => !d.blocked);
    if (!activeDays.length) {
      setPlannerError("No hay días con salida en el rango seleccionado");
      return;
    }
    setPlannerSaving(true);
    setPlannerError(null);
    setPlannerSaved("");
    try {
      const entries = activeDays.map((d) => ({
        route_key: plannerRouteKey,
        trip_date: d.date.toISOString().slice(0, 10),
        departure_time: d.time,
        price: d.cost,
        status: plannerBase.status,
        origin_area: plannerBase.origin_area || null,
        destination_area: plannerBase.destination_area || null,
        metadata: {
          source: "planner",
          cost_rules: costRules,
          time_rules: timeRules,
          blocked_days: blockedDays,
          base: plannerBase,
        },
      }));
      const res = await fetch("/api/turisticos-del-norte/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries,
          replace: { route_key: plannerRouteKey, start: plannerRange.start, end: plannerRange.end },
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
      const refresh = await fetch("/api/turisticos-del-norte/calendar");
      if (refresh.ok) {
        const data = await refresh.json();
        setCalendarRows(data?.calendar ?? []);
      }
      setPlannerSaved("Calendario actualizado. Puedes seguir ajustando o regresar.");
    } catch (err: any) {
      setPlannerError(`No se pudo guardar. ${err?.message ?? ""}`);
    } finally {
      setPlannerSaving(false);
    }
  };

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

  useEffect(() => {
    const loadCalendar = async () => {
      setCalendarLoading(true);
      try {
        const res = await fetch("/api/turisticos-del-norte/calendar");
        if (!res.ok) {
          throw new Error(`Status ${res.status}`);
        }
        const data = await res.json();
        setCalendarRows(data?.calendar ?? []);
      } catch {
        setCalendarRows([]);
      } finally {
        setCalendarLoading(false);
      }
    };
    loadCalendar();
  }, []);

  return (
    <div className="rounded-3xl bg-gradient-to-br from-zinc-900/90 to-zinc-800/80 border border-blue-900/30 shadow-xl p-4 sm:p-6 lg:p-8 flex flex-col gap-4 min-h-[220px]">
      <h2 className="text-2xl font-bold text-white mb-4">Configuración de Rutas</h2>
      <div className="text-zinc-400 mb-4">Crea rutas y define paradas. Usa “Planificar salidas” para programar horarios y costos.</div>
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
                <div>No hay rutas configuradas. Usa “+ Nueva ruta” para empezar.</div>
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
                      className="px-2 py-1 rounded text-xs bg-gradient-to-r from-emerald-500 to-cyan-400 text-zinc-950 font-semibold"
                      onClick={() => openPlanner(String(key), route)}
                    >
                      Planificar salidas
                    </button>
                    <button
                      className="px-2 py-1 rounded text-xs bg-red-600/20 text-red-100 border border-red-600/40"
                      onClick={async () => {
                        const ok = typeof window !== "undefined" ? window.confirm("¿Eliminar esta ruta?") : true;
                        if (!ok) return;
                        try {
                          const next = { ...(rawSchema || {}), routes: { ...(rawSchema?.routes || {}) } };
                          delete next.routes[key];
                          await fetch("/api/turisticos-del-norte/calendar", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ route_key: String(key) }),
                          });
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

      {plannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto mt-8 mb-8 bg-zinc-950 border border-blue-900/40 rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-blue-900/30">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-400">Editar</div>
                <div className="text-xl font-bold text-white">Calendario de salidas por ruta</div>
                <div className="text-xs text-zinc-500">Selecciona ruta, rango y reglas por día. Guardar no te saca.</div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  className="rounded-full border border-zinc-700 px-4 py-1 text-zinc-200"
                  onClick={() => setPlannerOpen(false)}
                >
                  Regresar
                </button>
                <button
                  type="button"
                  className="rounded-full border border-zinc-700 px-4 py-1 text-zinc-200"
                  onClick={() => setPlannerOpen(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr,1.2fr] gap-6 p-6 max-h-[85vh] overflow-y-auto">
              <div className="space-y-4">
                <div className="rounded-2xl border border-blue-900/30 bg-zinc-900/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-white font-semibold">Paso 1 · Ruta a modificar</div>
                    <div className="text-[11px] text-zinc-500">Obligatorio</div>
                  </div>
                  {calendarLoading && (
                    <div className="text-[11px] text-blue-300">Cargando calendario actual…</div>
                  )}
                  <select
                    value={plannerRouteKey}
                    onChange={(e) => {
                      const nextKey = e.target.value;
                      setPlannerRouteKey(nextKey);
                      const latest = getLatestRowForRoute(nextKey);
                      const nextRoute = (routes as any)[nextKey];
                      setPlannerBase((p) => ({
                        ...p,
                        price: latest?.price ? String(latest.price) : p.price,
                        time: latest?.departure_time ? latest.departure_time.slice(0, 5) : p.time,
                        origin_area: latest?.origin_area || nextRoute?.config?.origin_city || p.origin_area,
                        destination_area: latest?.destination_area || nextRoute?.config?.destination_city || p.destination_area,
                      }));
                    }}
                    className="w-full rounded-xl bg-zinc-950/70 border border-blue-900/30 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Selecciona ruta</option>
                    {Object.entries(routes).map(([key, route]: any) => (
                      <option key={key} value={key}>
                        {route?.config?.origin_city || "Inicio"} → {route?.config?.destination_city || "Fin"}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-zinc-500">Ruta actual: {plannerRoute?.name || plannerRouteKey || "(sin seleccionar)"}</div>
                </div>

                <div className="rounded-2xl border border-blue-900/30 bg-zinc-900/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-white font-semibold">Paso 2 · Intervalo de fechas</div>
                    <div className="text-[11px] text-zinc-500">Define el rango</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">Inicio</div>
                      <input
                        type="date"
                        value={plannerRange.start}
                        onChange={(e) => setPlannerRange((p) => ({ ...p, start: e.target.value }))}
                        className="w-full rounded-xl bg-zinc-950/70 border border-blue-900/30 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">Fin</div>
                      <input
                        type="date"
                        min={plannerRange.start}
                        value={plannerRange.end}
                        onChange={(e) => setPlannerRange((p) => ({ ...p, end: e.target.value }))}
                        className="w-full rounded-xl bg-zinc-950/70 border border-blue-900/30 px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">Se mapearán {calendarDays.length} días dentro del intervalo.</div>
                </div>

                <div className="rounded-2xl border border-blue-900/30 bg-zinc-900/70 p-4 space-y-3">
                  <div className="text-white font-semibold">Valores base</div>
                  <div className="text-xs text-zinc-500">Se usan si un día no tiene regla específica.</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">Costo base</div>
                      <input
                        type="number"
                        min={0}
                        value={plannerBase.price}
                        onChange={(e) => setPlannerBase((p) => ({ ...p, price: e.target.value }))}
                        className="w-full rounded-xl bg-zinc-950/70 border border-blue-900/30 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">Hora base</div>
                      <input
                        type="time"
                        value={plannerBase.time}
                        onChange={(e) => setPlannerBase((p) => ({ ...p, time: e.target.value }))}
                        className="w-full rounded-xl bg-zinc-950/70 border border-blue-900/30 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">Origen</div>
                      <input
                        value={plannerBase.origin_area}
                        onChange={(e) => setPlannerBase((p) => ({ ...p, origin_area: e.target.value }))}
                        className="w-full rounded-xl bg-zinc-950/70 border border-blue-900/30 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">Destino</div>
                      <input
                        value={plannerBase.destination_area}
                        onChange={(e) => setPlannerBase((p) => ({ ...p, destination_area: e.target.value }))}
                        className="w-full rounded-xl bg-zinc-950/70 border border-blue-900/30 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-zinc-500 mb-1">Estatus</div>
                      <select
                        value={plannerBase.status}
                        onChange={(e) => setPlannerBase((p) => ({ ...p, status: e.target.value }))}
                        className="w-full rounded-xl bg-zinc-950/70 border border-blue-900/30 px-3 py-2 text-sm text-white"
                      >
                        <option value="Activo">Activo</option>
                        <option value="Pausado">Pausado</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-900/30 bg-zinc-900/70 p-4 space-y-2">
                  <div className="text-white font-semibold">Guía rápida</div>
                  <ul className="text-xs text-zinc-500 space-y-1 list-disc list-inside">
                    <li>Agrega un costo con el botón + y elige días libres.</li>
                    <li>Luego puedes agregar otro costo con días no usados.</li>
                    <li>Lo mismo aplica para las horas de salida.</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-blue-900/30 bg-zinc-900/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold">Modificar costo</div>
                      <div className="text-xs text-zinc-500">Selecciona días y asigna un costo específico.</div>
                    </div>
                    <button
                      type="button"
                      onClick={addCostRule}
                      className="px-3 py-2 rounded-lg bg-emerald-500 text-zinc-950 text-xs font-semibold"
                    >
                      + Agregar costo
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DAY_OPTIONS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        disabled={!availableCostDay(d.value)}
                        onClick={() => toggleDayDraft("cost", d.value)}
                        className={cn(
                          "px-3 py-2 rounded-lg border text-xs",
                          costDraft.days.includes(d.value)
                            ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                            : "border-blue-900/30 bg-zinc-950/60 text-zinc-300",
                          !availableCostDay(d.value) ? "opacity-40 cursor-not-allowed" : "hover:border-emerald-400/60"
                        )}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={costDraft.amount}
                      onChange={(e) => setCostDraft((p) => ({ ...p, amount: e.target.value }))}
                      placeholder="Ej. 850"
                      className="flex-1 rounded-xl bg-zinc-950/70 border border-blue-900/30 px-3 py-2 text-sm text-white"
                    />
                    <div className="text-xs text-zinc-500">Días libres: {DAY_OPTIONS.filter((d) => availableCostDay(d.value)).length}</div>
                  </div>
                  {costRules.length > 0 && (
                    <div className="space-y-2">
                      {costRules.map((rule) => (
                        <div key={rule.id} className="flex items-center justify-between rounded-xl border border-blue-900/30 bg-zinc-950/60 px-3 py-2 text-xs">
                          <span className="text-emerald-300">${rule.amount}</span>
                          <span className="text-zinc-400">{rule.days.map(dayLabel).join(", ")}</span>
                          <button
                            type="button"
                            className="text-red-300"
                            onClick={() => setCostRules((prev) => prev.filter((r) => r.id !== rule.id))}
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-blue-900/30 bg-zinc-900/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold">Modificar hora de salida</div>
                      <div className="text-xs text-zinc-500">Elige días y asigna horario.</div>
                    </div>
                    <button
                      type="button"
                      onClick={addTimeRule}
                      className="px-3 py-2 rounded-lg bg-cyan-500 text-zinc-950 text-xs font-semibold"
                    >
                      + Agregar hora
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DAY_OPTIONS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        disabled={!availableTimeDay(d.value)}
                        onClick={() => toggleDayDraft("time", d.value)}
                        className={cn(
                          "px-3 py-2 rounded-lg border text-xs",
                          timeDraft.days.includes(d.value)
                            ? "border-cyan-400 bg-cyan-500/20 text-cyan-100"
                            : "border-blue-900/30 bg-zinc-950/60 text-zinc-300",
                          !availableTimeDay(d.value) ? "opacity-40 cursor-not-allowed" : "hover:border-cyan-400/60"
                        )}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={timeDraft.time}
                      onChange={(e) => setTimeDraft((p) => ({ ...p, time: e.target.value }))}
                      className="flex-1 rounded-xl bg-zinc-950/70 border border-blue-900/30 px-3 py-2 text-sm text-white"
                    />
                    <div className="text-xs text-zinc-500">Días libres: {DAY_OPTIONS.filter((d) => availableTimeDay(d.value)).length}</div>
                  </div>
                  {timeRules.length > 0 && (
                    <div className="space-y-2">
                      {timeRules.map((rule) => (
                        <div key={rule.id} className="flex items-center justify-between rounded-xl border border-blue-900/30 bg-zinc-950/60 px-3 py-2 text-xs">
                          <span className="text-cyan-300">{rule.time}h</span>
                          <span className="text-zinc-400">{rule.days.map(dayLabel).join(", ")}</span>
                          <button
                            type="button"
                            className="text-red-300"
                            onClick={() => setTimeRules((prev) => prev.filter((r) => r.id !== rule.id))}
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-blue-900/30 bg-zinc-900/70 p-4 space-y-3">
                  <div>
                    <div className="text-white font-semibold">Días sin salida</div>
                    <div className="text-xs text-zinc-500">Bloquea días completos dentro del rango (ej. martes sin servicio).</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DAY_OPTIONS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleBlockedDay(d.value)}
                        className={cn(
                          "px-3 py-2 rounded-lg border text-xs",
                          blockedDays.includes(d.value)
                            ? "border-red-400 bg-red-500/20 text-red-100"
                            : "border-blue-900/30 bg-zinc-950/60 text-zinc-300 hover:border-red-400/60"
                        )}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  {blockedDays.length === 0 && (
                    <div className="text-xs text-zinc-500">No hay días bloqueados.</div>
                  )}
                </div>

                <div className="rounded-2xl border border-blue-900/30 bg-zinc-900/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold">Vista previa del calendario</div>
                      <div className="text-xs text-zinc-500">Ruta - Hora salida - Costo</div>
                    </div>
                    <div className="text-xs text-zinc-500">{calendarDays.length} días</div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                    {calendarDays.map((d) => (
                      <div key={d.key} className={cn(
                        "rounded-xl border px-3 py-2 text-xs",
                        d.blocked
                          ? "border-red-500/40 bg-red-500/10 text-red-200"
                          : "border-blue-900/30 bg-zinc-950/60 text-zinc-300"
                      )}>
                        <div className="flex items-center justify-between">
                          <span className="capitalize">{formatShort(d.date)}</span>
                          <span className="text-[10px] text-zinc-500">{plannerRoute?.name || plannerRouteKey}</span>
                        </div>
                        {d.blocked ? (
                          <div className="text-[11px] font-semibold">Sin salida</div>
                        ) : (
                          <div className="flex items-center justify-between mt-1">
                            <span>Salida {d.time}h</span>
                            <span className="font-semibold">${d.cost}</span>
                          </div>
                        )}
                        <div className="text-[10px] text-zinc-600">{formatLong(d.date)}</div>
                      </div>
                    ))}
                    {calendarDays.length === 0 && (
                      <div className="text-xs text-zinc-500">Selecciona un rango para ver el calendario.</div>
                    )}
                  </div>
                  {plannerError && <div className="text-red-400 text-sm">{plannerError}</div>}
                  {plannerSaved && <div className="text-green-300 text-sm">{plannerSaved}</div>}
                  <div className="flex flex-col sm:flex-row gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setPlannerOpen(false)}
                      className="w-full sm:w-auto rounded-xl border border-zinc-700 px-4 py-2 text-sm text-white bg-zinc-900/60"
                    >
                      Regresar
                    </button>
                    <button
                      type="button"
                      disabled={plannerSaving}
                      onClick={handlePlannerSave}
                      className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold px-4 py-2 shadow-lg disabled:opacity-50"
                    >
                      {plannerSaving ? "Guardando…" : "Guardar calendario"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
    <div className="rounded-3xl bg-gradient-to-br from-zinc-900/90 to-zinc-800/80 border border-blue-900/30 shadow-xl p-4 sm:p-6 lg:p-8 flex flex-col gap-4 min-h-[220px]">
      <h2 className="text-2xl font-bold text-white mb-2">Plantillas de Mensajes</h2>
      <div className="text-zinc-400 mb-2">Crea mensajes con texto e imagen. Úsalos para respuestas rápidas y consistentes.</div>
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
                    </div>
                  </div>
                  {tpl.client_message && (
                    <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed line-clamp-2">{tpl.client_message}</div>
                  )}
                  <div className="flex items-center gap-3 text-xs">
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

                <div className="rounded-xl bg-black/30 border border-white/5 p-2 min-h-[120px] flex items-center justify-center">
                  {(!mediaPreview && !form.media_url && !pendingFile) && (
                    <div className="text-xs text-zinc-500">Sin archivo seleccionado</div>
                  )}
                  {(mediaPreview || form.media_url) && !imageFailed && (
                    <div className="w-full flex flex-col items-center gap-1">
                      <img
                        src={mediaPreview || form.media_url}
                        alt="media"
                        className="max-h-64 w-full object-contain"
                        onError={() => setImageFailed(true)}
                        onLoad={() => setImageFailed(false)}
                      />
                      <div className="text-[11px] text-zinc-400">Vista previa</div>
                    </div>
                  )}
                  {(imageFailed || (!mediaPreview && (form.media_url || pendingFile))) && (
                    <div className="w-full flex items-center justify-between text-xs text-zinc-200 gap-3">
                      <span className="truncate">Archivo listo: {form.media_url || pendingFile?.name || "(sin nombre)"}</span>
                      {form.media_url && (
                        <a className="text-cyan-300 underline" href={form.media_url} target="_blank" rel="noopener noreferrer">Abrir</a>
                      )}
                    </div>
                  )}
                </div>

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
                  className="hidden"
                />
                <div className="flex items-center justify-between gap-3 text-sm text-zinc-200">
                  <button
                    type="button"
                    onClick={() => replaceInputRef.current?.click()}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-white shadow hover:bg-blue-500"
                  >
                    Seleccionar archivo
                  </button>
                  <span className="text-xs text-zinc-400 truncate">
                    {pendingFile?.name || form.media_url ? pendingFile?.name || "Archivo actual" : "Ningún archivo seleccionado"}
                  </span>
                </div>
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
    setImageFailed(false);
    const maybePreview = tpl.media_url ? tpl.media_url : "";
    setMediaPreview(maybePreview);
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
