// src/app/portal/calendar/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, Loader2, MapPin, Phone, RefreshCw, Sparkles, Users } from 'lucide-react';
import type {
  BookingSchema,
  BookingScheduleBlock,
  CalendarEvent,
  CalendarEventsResponse,
} from '@/types/calendar';

type CalendarConfig = {
  id: number;
  industry?: string | null;
  updatedAt?: string | null;
  schema: BookingSchema;
};

type ApiResponse = {
  ok: boolean;
  config: CalendarConfig | null;
};

type ResolvedSchedule = BookingScheduleBlock & { key: string };

const SHORT_WEEKDAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

const toTitle = (value: string) =>
  value
    .split(/[_-]/g)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const formatBreak = (range: string) => {
  const [start, end] = range.split('-').map((chunk) => chunk.trim());
  if (!start || !end) return range;
  return `${start} - ${end}`;
};

const findScheduleForDate = (date: Date, schedules: ResolvedSchedule[]) => {
  return (
    schedules.find(
      (schedule) => Array.isArray(schedule.days) && schedule.days.includes(date.getDay())
    ) || null
  );
};

const findFirstAvailableDate = (month: Date, schedules: ResolvedSchedule[]) => {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();

  for (let day = 1; day <= totalDays; day += 1) {
    const current = new Date(year, monthIndex, day);
    if (findScheduleForDate(current, schedules)) {
      return current;
    }
  }

  return null;
};

const EVENT_TOKENS = {
  virtual: {
    label: 'Virtual',
    emoji: '💻',
    chip: 'bg-sky-500/15 border border-sky-500/40 text-sky-50',
    card: 'from-sky-600/10 via-slate-900 to-slate-950 border-sky-500/40',
  },
  presential: {
    label: 'En campo',
    emoji: '🚐',
    chip: 'bg-amber-500/15 border border-amber-500/40 text-amber-50',
    card: 'from-amber-500/15 via-slate-900 to-slate-950 border-amber-500/40',
  },
} as const;

const STATUS_TOKENS: Record<string, { label: string; badge: string }> = {
  scheduled: {
    label: 'Programada',
    badge: 'text-emerald-200 bg-emerald-500/10 border border-emerald-500/40',
  },
  pending: {
    label: 'Pendiente',
    badge: 'text-amber-200 bg-amber-500/10 border border-amber-500/40',
  },
  confirmed: {
    label: 'Confirmada',
    badge: 'text-cyan-200 bg-cyan-500/10 border border-cyan-500/40',
  },
  done: {
    label: 'Completada',
    badge: 'text-sky-200 bg-sky-500/10 border border-sky-500/40',
  },
  completed: {
    label: 'Completada',
    badge: 'text-sky-200 bg-sky-500/10 border border-sky-500/40',
  },
  cancelled: {
    label: 'Cancelada',
    badge: 'text-rose-200 bg-rose-500/10 border border-rose-500/40',
  },
  blocked: {
    label: 'Bloqueada',
    badge: 'text-slate-300 bg-slate-800/70 border border-slate-700',
  },
};

const getStatusToken = (status: string) => {
  const key = status?.toLowerCase() ?? '';
  return (
    STATUS_TOKENS[key] || {
      label: status,
      badge: 'text-slate-300 bg-slate-800/70 border border-slate-700/70',
    }
  );
};

const getMonthRange = (value: Date) => {
  const start = new Date(Date.UTC(value.getFullYear(), value.getMonth(), 1));
  const end = new Date(Date.UTC(value.getFullYear(), value.getMonth() + 1, 1));
  return { start, end };
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [config, setConfig] = useState<CalendarConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const res = await fetch('/api/calendar/config', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('No se pudo recuperar la configuración de citas');
      }

      const data: ApiResponse = await res.json();
      setConfig(data.config);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error inesperado');
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const timezone = config?.schema?.timezone ?? 'America/Mexico_City';

  const dateKeyFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    [timezone]
  );

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('es-MX', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
      }),
    [timezone]
  );

  const longDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('es-MX', {
        timeZone: timezone,
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    [timezone]
  );

  const getDateKey = (value: Date | string) =>
    dateKeyFormatter.format(typeof value === 'string' ? new Date(value) : value);

  const formatTime = (value: string) => timeFormatter.format(new Date(value));

  const scheduleEntries = useMemo<ResolvedSchedule[]>(() => {
    if (!config?.schema?.schedules) return [];
    return Object.entries(config.schema.schedules).map(([key, schedule]) => ({
      key,
      ...schedule,
      label: schedule.label ?? toTitle(key),
    }));
  }, [config]);

  const serviceEntries = useMemo(() => {
    if (!config?.schema?.services) return [];
    return Object.entries(config.schema.services).map(([key, service]) => ({
      key,
      ...service,
    }));
  }, [config]);

  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  };

  useEffect(() => {
    if (!config) {
      setEvents([]);
      return;
    }

    const { start, end } = getMonthRange(currentMonth);
    const controller = new AbortController();

    const fetchEvents = async () => {
      try {
        setEventsLoading(true);
        setEventsError(null);

        const res = await fetch(
          `/api/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}`,
          { cache: 'no-store', signal: controller.signal }
        );

        if (!res.ok) {
          throw new Error('No se pudieron cargar las citas del mes');
        }

        const data: CalendarEventsResponse = await res.json();
        setEvents(data.events);
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        setEvents([]);
        setEventsError(
          error instanceof Error ? error.message : 'Error inesperado al cargar citas'
        );
      } finally {
        setEventsLoading(false);
      }
    };

    fetchEvents();
    return () => controller.abort();
  }, [config?.id, currentMonth]);

  useEffect(() => {
    if (!scheduleEntries.length) {
      if (selectedDate === null) {
        setSelectedDate(new Date());
      }
      return;
    }

    const matchesCurrentMonth =
      selectedDate &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear();

    if (matchesCurrentMonth) {
      return;
    }

    const fallback = findFirstAvailableDate(currentMonth, scheduleEntries);
    if (fallback && (!selectedDate || fallback.getTime() !== selectedDate.getTime())) {
      setSelectedDate(fallback);
    } else if (!fallback && selectedDate) {
      setSelectedDate(null);
    }
  }, [currentMonth, scheduleEntries, selectedDate]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    events.forEach((event) => {
      const key = getDateKey(event.start_at);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(event);
    });

    map.forEach((list) =>
      list.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    );

    return map;
  }, [events, dateKeyFormatter]);

  const selectedDayKey = selectedDate ? getDateKey(selectedDate) : null;
  const selectedDayEvents = selectedDayKey ? eventsByDay.get(selectedDayKey) ?? [] : [];

  const selectedSchedule = selectedDate
    ? findScheduleForDate(selectedDate, scheduleEntries)
    : null;
  const focusedEvent = focusedEventId
    ? selectedDayEvents.find((event) => `${event.source}-${event.id}` === focusedEventId) || null
    : null;

  useEffect(() => {
    setFocusedEventId(null);
  }, [selectedDayKey]);

  const monthName = currentMonth.toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
    timeZone: timezone,
  });

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();
  const firstDayIndex = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const daysArray = Array.from({ length: daysInMonth }, (_, idx) => idx + 1);
  const emptySlots = Array.from({ length: firstDayIndex }, (_, idx) => idx);

  const calendarReady = Boolean(config && scheduleEntries.length);
  const todayDateString = new Date().toDateString();

  const summaryCards = [
    {
      label: 'Estado del esquema',
      value: config?.schema?.active ? 'Activo' : 'Inactivo',
      helper: config?.updatedAt
        ? `Actualizado el ${new Date(config.updatedAt).toLocaleString('es-MX', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}`
        : 'Sin historial reciente',
      icon: Sparkles,
    },
    {
      label: 'Zona horaria',
      value: timezone,
      helper: 'Se usa para renderizar horarios y recordatorios',
      icon: CalendarDays,
    },
    {
      label: 'Capacidad fija',
      value:
        config?.schema?.fixed_capacity != null
          ? config.schema.fixed_capacity
          : 'No definida',
      helper: `Modo de concurrencia: ${
        config?.schema?.concurrency_mode ?? 'sin especificar'
      }`,
      icon: Users,
    },
    {
      label: 'Servicios disponibles',
      value: serviceEntries.length,
      helper: scheduleEntries.length
        ? `${scheduleEntries.length} bloques de horario configurados`
        : 'Configura bloques para habilitar días',
      icon: Clock,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="space-y-6 max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white">Calendario de citas</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadConfig}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800/70 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Recargar
            </button>
            <Link
              href="/portal/calendar/designer"
              className="px-4 py-2 rounded-lg border border-slate-700/80 text-slate-200 hover:bg-slate-800/70 transition-colors"
            >
              Configurar esquema
            </Link>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 text-red-200 px-4 py-3 text-sm">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-12 text-center space-y-4">
            <Loader2 className="w-7 h-7 text-slate-200 animate-spin mx-auto" />
            <p className="text-slate-300">Cargando configuración desde CRM…</p>
          </div>
        ) : !config ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-10 text-center space-y-4">
            <p className="text-xl font-semibold text-white">Sin booking_schema</p>
            <p className="text-slate-400">
              Configura el objeto <span className="text-white font-semibold">booking_schema</span> en la tabla
              <span className="text-white font-semibold"> industry_configs</span> para comenzar a mostrar la disponibilidad de este tenant.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-2"
                >
                  <div className="flex items-center gap-3">
                    <card.icon className="w-4 h-4 text-sky-300" />
                    <span className="text-xs uppercase tracking-widest text-slate-400">
                      {card.label}
                    </span>
                  </div>
                  <div className="text-2xl font-semibold text-white">{card.value}</div>
                  <p className="text-xs text-slate-500">{card.helper}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur lg:col-span-2 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-slate-400 text-sm">Disponibilidad mensual</p>
                    <h2 className="text-2xl font-bold text-white capitalize">{monthName}</h2>
                    <p className="text-xs text-slate-500">
                      Horario en {timezone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                      }
                      className="p-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                      ←
                    </button>
                    <button
                      onClick={goToToday}
                      className="px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm transition-colors"
                    >
                      Hoy
                    </button>
                    <button
                      onClick={() =>
                        setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                      }
                      className="p-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                      →
                    </button>
                  </div>
                </div>

                <div className="-mx-2 sm:mx-0 overflow-x-auto pb-2">
                  <div className="min-w-[560px] sm:min-w-0 space-y-3 px-2 sm:px-0">
                    <div className="grid grid-cols-7 gap-2 text-center">
                      {SHORT_WEEKDAYS.map((day) => (
                        <div
                          key={day}
                          className="text-xs font-semibold text-slate-400 uppercase tracking-widest py-2"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {emptySlots.map((slot) => (
                        <div key={`empty-${slot}`} className="aspect-square rounded-xl bg-transparent" />
                      ))}
                      {daysArray.map((day) => {
                    const date = new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth(),
                      day
                    );
                    const schedule = findScheduleForDate(date, scheduleEntries);
                    const isToday = date.toDateString() === todayDateString;
                    const isSelected =
                      selectedDate && date.toDateString() === selectedDate.toDateString();
                    const dayKey = getDateKey(date);
                    const dayEvents = eventsByDay.get(dayKey) ?? [];
                    const isActiveDay =
                      (Boolean(schedule) && config.schema?.active) || dayEvents.length > 0;

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => (schedule || dayEvents.length > 0) && setSelectedDate(date)}
                        className={`aspect-square rounded-xl border p-3 flex flex-col items-start justify-between transition-all ${
                          isActiveDay
                            ? 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20'
                            : 'border-slate-800 bg-slate-900/40 text-slate-500 cursor-not-allowed'
                        } ${
                          isSelected
                            ? 'ring-2 ring-emerald-400 shadow-lg shadow-emerald-900/30'
                            : isToday
                            ? 'ring-1 ring-cyan-400/60 shadow-md shadow-cyan-900/20'
                            : ''
                        }`}
                        disabled={!(schedule || dayEvents.length > 0)}
                      >
                        <div className="flex items-center justify-between w-full text-white">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold">{day}</span>
                            {isToday && (
                              <span className="text-[10px] uppercase tracking-wide text-emerald-300">
                                Hoy
                              </span>
                            )}
                          </div>
                          {dayEvents.length > 0 && (
                            <span className="text-[11px] font-semibold text-slate-300">
                              {dayEvents.length}
                            </span>
                          )}
                        </div>
                        <div className="w-full space-y-1 text-left">
                          {dayEvents.length > 0 ? (
                            <>
                              <div className="flex flex-wrap gap-1">
                                {dayEvents.slice(0, 3).map((event) => {
                                  const token = EVENT_TOKENS[event.modality];
                                  return (
                                    <span
                                      key={`${event.source}-${event.id}`}
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${token.chip}`}
                                    >
                                      {token.emoji} {formatTime(event.start_at)}
                                    </span>
                                  );
                                })}
                                {dayEvents.length > 3 && (
                                  <span className="text-[10px] text-slate-400">
                                    +{dayEvents.length - 3}
                                  </span>
                                )}
                              </div>
                              {schedule && (
                                <p className="text-[10px] text-slate-400">
                                  Ventana {schedule.start} - {schedule.end}
                                </p>
                              )}
                            </>
                          ) : schedule ? (
                            <>
                              <p className="text-xs text-emerald-200 font-semibold">
                                {schedule.start} - {schedule.end}
                              </p>
                              {schedule.breaks?.length ? (
                                <p className="text-[10px] text-emerald-100/80">
                                  Breaks: {formatBreak(schedule.breaks[0])}
                                  {schedule.breaks.length > 1 && ' +'}
                                </p>
                              ) : (
                                <p className="text-[10px] text-emerald-100/70">Sin descansos</p>
                              )}
                            </>
                          ) : (
                            <p className="text-[11px] text-slate-500">No disponible</p>
                          )}
                        </div>
                        {isToday && (
                          <div className="w-full h-1 rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 opacity-70" />
                        )}
                      </button>
                    );
                  })}
                      </div>
                    </div>
                  </div>
              </div>
              {eventsError && (
                <div className="lg:col-span-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-100 px-4 py-3 text-sm">
                  {eventsError}
                </div>
              )}

              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
                  <div>
                    <p className="text-slate-400 text-sm">Día seleccionado</p>
                    <h3 className="text-xl font-semibold text-white">
                      {selectedDate
                        ? longDateFormatter.format(selectedDate)
                        : 'Sin selección'}
                    </h3>
                  </div>
                  {selectedSchedule ? (
                    <div className="space-y-3 text-sm text-slate-200">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-300" />
                        <span>
                          {selectedSchedule.start} - {selectedSchedule.end}
                        </span>
                      </div>
                      {selectedSchedule.breaks?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedSchedule.breaks.map((range) => (
                            <span
                              key={range}
                              className="px-2 py-1 rounded-full bg-slate-800 text-[11px] text-slate-300 border border-slate-700"
                            >
                              {formatBreak(range)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Sin descansos configurados</span>
                      )}
                      <div className="text-xs text-slate-500">
                        Capacidad estimada:{' '}
                        {selectedSchedule.capacity ??
                          config.schema?.fixed_capacity ??
                          'No definida'}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      Selecciona un día habilitado para ver su disponibilidad exacta.
                    </p>
                  )}
                  <div className="pt-4 mt-4 border-t border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-slate-400 text-sm">Citas del día</p>
                      {eventsLoading && (
                        <span className="text-xs text-slate-500 flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Actualizando
                        </span>
                      )}
                    </div>
                    {eventsLoading ? (
                      <div className="text-xs text-slate-500">Cargando citas…</div>
                    ) : selectedDayEvents.length ? (
                      <div className="space-y-3">
                        {selectedDayEvents.map((event) => {
                          const token = EVENT_TOKENS[event.modality];
                          const statusToken = getStatusToken(event.status);
                          const eventKey = `${event.source}-${event.id}`;
                          const isFocused = focusedEventId === eventKey;
                          return (
                            <button
                              type="button"
                              key={eventKey}
                              onClick={() =>
                                setFocusedEventId((prev) => (prev === eventKey ? null : eventKey))
                              }
                              className={`w-full text-left rounded-xl border px-4 py-3 bg-gradient-to-br ${token.card} transition-all ${
                                isFocused ? 'ring-2 ring-emerald-300 shadow-lg shadow-emerald-900/30' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                                  <span>{token.emoji}</span>
                                  <span>{event.title}</span>
                                </div>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest ${statusToken.badge}`}
                                >
                                  {statusToken.label}
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-200/80">
                                <span>
                                  {formatTime(event.start_at)}
                                  {event.end_at ? ` - ${formatTime(event.end_at)}` : ''}
                                </span>
                                {event.price_label && (
                                  <span className="text-emerald-300 font-semibold">
                                    {event.price_label}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-xs text-slate-400 flex flex-wrap gap-3">
                                {event.modality === 'virtual' && event.channel && (
                                  <span>Canal: {event.channel}</span>
                                )}
                                {event.modality === 'presential' && event.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {event.location}
                                  </span>
                                )}
                                {event.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {event.phone}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Aún no hay citas en este día.</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-slate-300 font-semibold">Detalles de la agenda</p>
                      {focusedEvent && (
                        <span className="text-[11px] uppercase tracking-wide text-emerald-300">
                          {focusedEvent.modality === 'virtual' ? 'Virtual' : 'Presencial'}
                        </span>
                      )}
                    </div>
                    {focusedEvent ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-base text-white font-semibold">{focusedEvent.title}</p>
                          <p className="text-xs text-slate-500">
                            {formatTime(focusedEvent.start_at)}
                            {focusedEvent.end_at ? ` · ${formatTime(focusedEvent.end_at)}` : ''}
                          </p>
                        </div>
                        <dl className="grid gap-2 text-xs text-slate-400">
                          {focusedEvent.status && (
                            <div className="flex justify-between">
                              <dt className="font-semibold text-slate-300">Estado</dt>
                              <dd>{getStatusToken(focusedEvent.status).label}</dd>
                            </div>
                          )}
                          {focusedEvent.service_type && (
                            <div className="flex justify-between">
                              <dt className="font-semibold text-slate-300">Servicio</dt>
                              <dd>{focusedEvent.service_type}</dd>
                            </div>
                          )}
                          {focusedEvent.customer_name && (
                            <div className="flex justify-between">
                              <dt className="font-semibold text-slate-300">Cliente</dt>
                              <dd>{focusedEvent.customer_name}</dd>
                            </div>
                          )}
                          {focusedEvent.phone && (
                            <div className="flex justify-between">
                              <dt className="font-semibold text-slate-300">Teléfono</dt>
                              <dd className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {focusedEvent.phone}
                              </dd>
                            </div>
                          )}
                          {focusedEvent.location && (
                            <div className="flex justify-between">
                              <dt className="font-semibold text-slate-300">Ubicación</dt>
                              <dd className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {focusedEvent.location}
                              </dd>
                            </div>
                          )}
                          {focusedEvent.notes && (
                            <div className="flex flex-col gap-1">
                              <dt className="font-semibold text-slate-300">Notas</dt>
                              <dd className="text-slate-400">{focusedEvent.notes}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Selecciona una cita de la lista para ver todos sus detalles operativos.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
                  <div>
                    <p className="text-slate-400 text-sm">Servicios configurados</p>
                    <h3 className="text-xl font-semibold text-white">
                      {serviceEntries.length ? 'Paquetes' : 'Sin servicios'}
                    </h3>
                  </div>
                  {serviceEntries.length ? (
                    <div className="space-y-3">
                      {serviceEntries.map((service) => (
                        <div
                          key={service.key}
                          className="border border-slate-800 rounded-xl p-4 bg-slate-900/50"
                        >
                          <div className="flex items-center justify-between gap-4 text-white">
                            <p className="font-semibold">{service.name}</p>
                            <span className="text-[11px] uppercase tracking-wide text-slate-400">
                              {service.modality?.toUpperCase() ?? 'SIN MODALIDAD'}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-slate-400 flex flex-wrap gap-3">
                            <span>
                              Duración base:{' '}
                              <span className="text-emerald-300 font-semibold">
                                {service.duration_minutes != null && service.duration_minutes > 0
                                  ? `${service.duration_minutes} min`
                                  : 'Por definir'}
                              </span>
                            </span>
                            <span>
                              Dirección requerida:{' '}
                              <span className="text-emerald-300 font-semibold">
                                {service.requires_address ? 'Sí' : 'No'}
                              </span>
                            </span>
                            {service.buffer_after_minutes != null && (
                              <span>
                                Buffer después:{' '}
                                <span className="text-emerald-300 font-semibold">
                                  {service.buffer_after_minutes} min
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      Define servicios en <span className="font-semibold text-white">booking_schema.services</span> para habilitar tipos de cita.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
