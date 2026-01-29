'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import type {
  BookingSchema,
  BookingScheduleBlock,
  BookingServiceConfig,
} from '@/types/calendar';

type ConfigResponse = {
  ok: boolean;
  config: {
    id: number;
    industry?: string | null;
    schema: BookingSchema;
    updatedAt?: string | null;
  } | null;
};

type SaveResponse = {
  ok: boolean;
  config?: ConfigResponse['config'];
  error?: string;
};

const DEFAULT_SCHEMA: BookingSchema = {
  active: true,
  timezone: 'America/Mexico_City',
  fixed_capacity: 1,
  concurrency_mode: 'users',
  services: {},
  schedules: {},
};

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
];

const TIMEZONE_OPTIONS = [
  'America/Mexico_City',
  'America/Tijuana',
  'America/Monterrey',
  'America/Bogota',
  'UTC',
];

const MODALITY_OPTIONS = [
  { value: 'virtual', label: 'Virtual' },
  { value: 'presential', label: 'Presencial' },
  { value: 'hybrid', label: 'Híbrido' },
];

const CONCURRENCY_OPTIONS = [
  { value: 'users', label: 'Por usuarios' },
  { value: 'services', label: 'Por servicio' },
  { value: 'slots', label: 'Por slots' },
];

const TIME_TOKEN_REGEX = /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i;

const sanitizeTimeChunk = (value?: string | null) => {
  if (!value) return '';
  const match = value.match(TIME_TOKEN_REGEX);
  if (!match) return '';
  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[4]?.toUpperCase();

  if (meridiem === 'PM' && hours < 12) {
    hours += 12;
  }
  if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes}`;
};

const splitBreakRange = (range?: string | null) => {
  if (!range) {
    return { start: '', end: '' };
  }
  const [rawStart, rawEnd] = range.split('-');
  return {
    start: sanitizeTimeChunk(rawStart),
    end: sanitizeTimeChunk(rawEnd),
  };
};

const composeBreakRange = (start?: string | null, end?: string | null) => {
  const safeStart = sanitizeTimeChunk(start);
  const safeEnd = sanitizeTimeChunk(end);
  if (!safeStart && !safeEnd) {
    return ' - ';
  }
  return `${safeStart}-${safeEnd}`;
};

const normalizeBreakEntries = (entries?: string[] | null) =>
  (entries ?? [])
    .map((range) => {
      const { start, end } = splitBreakRange(range);
      if (!start || !end) {
        return null;
      }
      return `${start}-${end}`;
    })
    .filter((value): value is string => Boolean(value));

const cloneSchema = (input?: BookingSchema | null): BookingSchema =>
  JSON.parse(JSON.stringify(input ?? DEFAULT_SCHEMA));

const ensureServices = (schema: BookingSchema) => schema.services ?? {};
const ensureSchedules = (schema: BookingSchema) => schema.schedules ?? {};

const prepareSchemaForSave = (input: BookingSchema): BookingSchema => {
  const draft = cloneSchema(input);
  if (!draft.schedules) {
    return draft;
  }
  const nextSchedules: Record<string, BookingScheduleBlock> = {};
  Object.entries(draft.schedules).forEach(([key, block]) => {
    nextSchedules[key] = {
      ...block,
      breaks: normalizeBreakEntries(block.breaks),
    };
  });
  draft.schedules = nextSchedules;
  return draft;
};

export default function CalendarDesignerPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schema, setSchema] = useState<BookingSchema>(() => cloneSchema(DEFAULT_SCHEMA));
  const [originalSchema, setOriginalSchema] = useState<BookingSchema | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [newServiceKeys, setNewServiceKeys] = useState<string[]>([]);
  const [newScheduleKeys, setNewScheduleKeys] = useState<string[]>([]);

  const markNewService = (key: string) =>
    setNewServiceKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
  const unmarkNewService = (key: string) =>
    setNewServiceKeys((prev) => prev.filter((item) => item !== key));

  const markNewSchedule = (key: string) =>
    setNewScheduleKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
  const unmarkNewSchedule = (key: string) =>
    setNewScheduleKeys((prev) => prev.filter((item) => item !== key));

  const clearNewFlags = () => {
    setNewServiceKeys([]);
    setNewScheduleKeys([]);
  };

  const loadSchema = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const res = await fetch('/api/calendar/config', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('No se pudo obtener la configuración actual');
      }
      const data: ConfigResponse = await res.json();
      const nextSchema = data.config?.schema ? cloneSchema(data.config.schema) : cloneSchema();
      setSchema(nextSchema);
      setOriginalSchema(cloneSchema(nextSchema));
      clearNewFlags();
    } catch (error) {
      console.error('[Calendar Designer] load error', error);
      setFeedback({
        type: 'error',
        message: 'No pudimos cargar el esquema. Intenta nuevamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchema();
  }, []);

  const servicesEntries = useMemo(() => Object.entries(ensureServices(schema)), [schema]);
  const scheduleEntries = useMemo(() => Object.entries(ensureSchedules(schema)), [schema]);

  const orderedServiceEntries = useMemo(() => {
    if (!servicesEntries.length) return servicesEntries;
    const newSet = new Set(newServiceKeys);
    return [
      ...servicesEntries.filter(([key]) => newSet.has(key)),
      ...servicesEntries.filter(([key]) => !newSet.has(key)),
    ];
  }, [servicesEntries, newServiceKeys]);

  const orderedScheduleEntries = useMemo(() => {
    if (!scheduleEntries.length) return scheduleEntries;
    const newSet = new Set(newScheduleKeys);
    return [
      ...scheduleEntries.filter(([key]) => newSet.has(key)),
      ...scheduleEntries.filter(([key]) => !newSet.has(key)),
    ];
  }, [scheduleEntries, newScheduleKeys]);

  const isDirty = useMemo(() => {
    if (!originalSchema) {
      return true;
    }
    return JSON.stringify(originalSchema) !== JSON.stringify(schema);
  }, [schema, originalSchema]);

  const updateSchemaField = <K extends keyof BookingSchema>(key: K, value: BookingSchema[K]) => {
    setSchema((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const addService = () => {
    const newKey = `service_${Date.now()}`;
    const draft: BookingServiceConfig = {
      name: '',
      duration_minutes: null,
      requires_address: false,
      buffer_after_minutes: null,
      description: '',
      schedule_keys: [],
    };

    setSchema((prev) => ({
      ...prev,
      services: {
        ...ensureServices(prev),
        [newKey]: draft,
      },
    }));
    markNewService(newKey);
  };

  const removeService = (key: string) => {
    setSchema((prev) => {
      const copy = { ...ensureServices(prev) };
      delete copy[key];
      return { ...prev, services: copy };
    });
    unmarkNewService(key);
  };

  const updateService = <K extends keyof BookingServiceConfig>(
    key: string,
    field: K,
    value: BookingServiceConfig[K]
  ) => {
    setSchema((prev) => ({
      ...prev,
      services: {
        ...ensureServices(prev),
        [key]: {
          ...ensureServices(prev)[key],
          [field]: value,
        },
      },
    }));
  };

  const toggleServiceSchedule = (serviceKey: string, scheduleKey: string) => {
    setSchema((prev) => {
      const services = { ...ensureServices(prev) };
      const service = services[serviceKey];
      if (!service) {
        return prev;
      }
      const current = service.schedule_keys ?? [];
      const exists = current.includes(scheduleKey);
      const nextKeys = exists ? current.filter((id) => id !== scheduleKey) : [...current, scheduleKey];
      services[serviceKey] = {
        ...service,
        schedule_keys: nextKeys,
      };
      return {
        ...prev,
        services,
      };
    });
  };

  const addSchedule = (options?: { attachToService?: string }) => {
    const newKey = `horario_${Date.now()}`;
    const draft: BookingScheduleBlock = {
      label: '',
      days: [],
      start: '',
      end: '',
      breaks: [],
      capacity: null,
    };

    setSchema((prev) => {
      const nextSchedules = {
        ...ensureSchedules(prev),
        [newKey]: draft,
      };

      if (options?.attachToService) {
        const services = { ...ensureServices(prev) };
        const targetService = services[options.attachToService];
        if (targetService) {
          const currentKeys = targetService.schedule_keys ?? [];
          services[options.attachToService] = {
            ...targetService,
            schedule_keys: currentKeys.includes(newKey)
              ? currentKeys
              : [...currentKeys, newKey],
          };
          return {
            ...prev,
            schedules: nextSchedules,
            services,
          };
        }
      }

      return {
        ...prev,
        schedules: nextSchedules,
      };
    });
    markNewSchedule(newKey);
  };

  const removeSchedule = (key: string) => {
    setSchema((prev) => {
      const schedules = { ...ensureSchedules(prev) };
      delete schedules[key];

      const services = { ...ensureServices(prev) };
      Object.entries(services).forEach(([serviceKey, service]) => {
        if (service?.schedule_keys?.includes(key)) {
          services[serviceKey] = {
            ...service,
            schedule_keys: service.schedule_keys.filter((id) => id !== key),
          };
        }
      });

      return { ...prev, schedules, services };
    });
    unmarkNewSchedule(key);
  };

  const updateSchedule = <K extends keyof BookingScheduleBlock>(
    key: string,
    field: K,
    value: BookingScheduleBlock[K]
  ) => {
    setSchema((prev) => ({
      ...prev,
      schedules: {
        ...ensureSchedules(prev),
        [key]: {
          ...ensureSchedules(prev)[key],
          [field]: value,
        },
      },
    }));
  };

  const toggleScheduleDay = (key: string, day: number) => {
    const block = ensureSchedules(schema)[key];
    if (!block) return;
    const hasDay = block.days.includes(day);
    const nextDays = hasDay ? block.days.filter((d) => d !== day) : [...block.days, day];
    updateSchedule(key, 'days', nextDays.sort((a, b) => a - b));
  };

  const handleBreakChange = (
    key: string,
    index: number,
    part: 'start' | 'end',
    rawValue: string
  ) => {
    const block = ensureSchedules(schema)[key];
    if (!block) return;
    const nextBreaks = [...(block.breaks ?? [])];
    const current = splitBreakRange(nextBreaks[index]);
    const nextRange =
      part === 'start'
        ? composeBreakRange(rawValue, current.end)
        : composeBreakRange(current.start, rawValue);
    nextBreaks[index] = nextRange;
    updateSchedule(key, 'breaks', nextBreaks);
  };

  const addBreakRow = (key: string) => {
    const block = ensureSchedules(schema)[key];
    const nextBreaks = [...(block?.breaks ?? []), composeBreakRange('', '')];
    updateSchedule(key, 'breaks', nextBreaks);
  };

  const removeBreakRow = (key: string, index: number) => {
    const block = ensureSchedules(schema)[key];
    if (!block) return;
    const nextBreaks = (block.breaks ?? []).filter((_, idx) => idx !== index);
    updateSchedule(key, 'breaks', nextBreaks);
  };

  const resetChanges = () => {
    if (originalSchema) {
      setSchema(cloneSchema(originalSchema));
    } else {
      setSchema(cloneSchema(DEFAULT_SCHEMA));
    }
    clearNewFlags();
    setFeedback(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setFeedback(null);
      const payload = prepareSchemaForSave(schema);
      const res = await fetch('/api/calendar/config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schema: payload }),
      });
      const data: SaveResponse = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo guardar la configuración');
      }
      const savedSchema = data.config?.schema ? cloneSchema(data.config.schema) : cloneSchema();
      setSchema(savedSchema);
      setOriginalSchema(cloneSchema(savedSchema));
      clearNewFlags();
      setFeedback({ type: 'success', message: 'Esquema actualizado correctamente.' });
    } catch (error) {
      console.error('[Calendar Designer] save error', error);
      setFeedback({
        type: 'error',
        message: 'Ocurrió un error al guardar. Revisa los campos e inténtalo de nuevo.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <Link
              href="/portal/calendar"
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Regresar al calendario
            </Link>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Configurador</p>
              <h1 className="text-4xl font-semibold text-white mt-2">Diseña tu sistema de citas</h1>
              <p className="text-slate-400 mt-1">
                Ajusta horarios, servicios y reglas sin salir de CONVIAQ.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={resetChanges}
                disabled={!isDirty || saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800/60 disabled:opacity-40"
              >
                <RefreshCw className="w-4 h-4" />
                Restablecer
              </button>
              <button
                onClick={handleSave}
                disabled={!isDirty || saving}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-semibold shadow-lg shadow-emerald-900/30 disabled:opacity-40"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar cambios
              </button>
            </div>
          </div>
        </div>

        {feedback && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-100'
            }`}
          >
            {feedback.message}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center space-y-4">
            <Loader2 className="w-7 h-7 text-slate-200 animate-spin mx-auto" />
            <p className="text-slate-400">Cargando esquema actual…</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* General settings */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-5">
              <div className="flex items-center gap-3 text-white">
                <Settings2 className="w-5 h-5 text-cyan-300" />
                <div>
                  <h2 className="text-xl font-semibold">Ajustes generales</h2>
                  <p className="text-sm text-slate-400">Define la base operativa del calendario.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">Esquema activo</p>
                    <p className="text-xs text-slate-400">Habilita o pausa el sistema de citas.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(schema.active)}
                    onChange={(e) => updateSchemaField('active', e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-800"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-white">Zona horaria</span>
                  <select
                    value={schema.timezone}
                    onChange={(e) => updateSchemaField('timezone', e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-white"
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz} value={tz} className="bg-slate-900">
                        {tz}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-white">Capacidad fija</span>
                  <input
                    type="number"
                    min={1}
                    value={schema.fixed_capacity ?? ''}
                    onChange={(e) => updateSchemaField('fixed_capacity', Number(e.target.value) || null)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-white"
                  />
                  <span className="text-xs text-slate-500">
                    Número máximo de citas paralelas si no se define por bloque.
                  </span>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-white">Modo de concurrencia</span>
                  <select
                    value={schema.concurrency_mode ?? 'users'}
                    onChange={(e) => updateSchemaField('concurrency_mode', e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-white"
                  >
                    {CONCURRENCY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-slate-900">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            {/* Services */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 text-white">
                  <Wand2 className="w-5 h-5 text-emerald-300" />
                  <div>
                    <h2 className="text-xl font-semibold">Servicios ofrecidos</h2>
                    <p className="text-sm text-slate-400">
                      Define paquetes virtuales o presenciales con duración, buffers y notas.
                    </p>
                  </div>
                </div>
                <button
                  onClick={addService}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-white hover:bg-slate-800/80"
                >
                  <Plus className="w-4 h-4" />
                  Agregar servicio
                </button>
              </div>

              {servicesEntries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 px-6 py-10 text-center text-slate-500">
                  Aún no hay servicios. Crea uno nuevo para comenzar.
                </div>
              ) : (
                <div className="space-y-4">
                  {orderedServiceEntries.map(([key, service]) => {
                    const isNew = newServiceKeys.includes(key);
                    return (
                      <div
                        key={key}
                        className={`relative rounded-xl p-5 space-y-4 ${
                          isNew
                            ? 'border border-emerald-400/60 bg-emerald-500/5 shadow-[0_0_35px_rgba(16,185,129,0.25)]'
                            : 'border border-slate-800 bg-slate-950/40'
                        }`}
                      >
                        {isNew && (
                          <span className="absolute -top-3 right-4 inline-flex items-center gap-1 rounded-full border border-emerald-400/70 bg-emerald-500/10 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
                            <Sparkles className="w-3 h-3" />
                            Nuevo
                          </span>
                        )}
                      <div className="flex flex-wrap items-center gap-4 justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs uppercase tracking-widest text-slate-500">
                            Identificador (igual que el nombre)
                          </span>
                          <span className="text-white font-semibold">
                            {service.name?.trim() || 'Servicio sin nombre'}
                          </span>
                        </div>
                        <button
                          onClick={() => removeService(key)}
                          className="text-xs px-3 py-1 rounded-lg border border-rose-600/60 text-rose-200 hover:bg-rose-600/10"
                        >
                          <Trash2 className="w-3 h-3" />
                          Eliminar
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-1">
                          <span className="text-sm text-slate-300">Nombre visible</span>
                          <input
                            value={service.name ?? ''}
                            onChange={(e) => updateService(key, 'name', e.target.value)}
                            placeholder="Ej. Servicio presencial"
                            className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-white placeholder:text-slate-600"
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="text-sm text-slate-300">Modalidad</span>
                          <select
                            value={service.modality ?? ''}
                            onChange={(e) => updateService(key, 'modality', e.target.value || undefined)}
                            className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-white"
                          >
                            <option value="" className="bg-slate-900 text-slate-500">
                              Selecciona una modalidad
                            </option>
                            {MODALITY_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value} className="bg-slate-900">
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-1">
                          <span className="text-sm text-slate-300">Duración (min)</span>
                          <input
                            type="number"
                            min={5}
                            value={service.duration_minutes ?? ''}
                            onChange={(e) =>
                              updateService(
                                key,
                                'duration_minutes',
                                e.target.value === ''
                                  ? null
                                  : Math.max(5, Number(e.target.value) || 0)
                              )
                            }
                            className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-white"
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="text-sm text-slate-300">Buffer posterior (min)</span>
                          <input
                            type="number"
                            min={0}
                            value={service.buffer_after_minutes ?? ''}
                            onChange={(e) =>
                              updateService(
                                key,
                                'buffer_after_minutes',
                                e.target.value === ''
                                  ? null
                                  : Math.max(0, Number(e.target.value) || 0)
                              )
                            }
                            className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-white"
                          />
                        </label>
                      </div>

                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={Boolean(service.requires_address)}
                          onChange={(e) => updateService(key, 'requires_address', e.target.checked)}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800"
                        />
                        <span className="text-sm text-slate-300">
                          Requiere dirección completa del cliente
                        </span>
                      </label>

                      <label className="space-y-1">
                        <span className="text-sm text-slate-300">Descripción</span>
                        <textarea
                          value={service.description ?? ''}
                          onChange={(e) => updateService(key, 'description', e.target.value)}
                          className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-white"
                          rows={2}
                        />
                      </label>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-300">Horarios vinculados</span>
                          {scheduleEntries.length > 0 && (
                            <button
                              type="button"
                              onClick={() => addSchedule({ attachToService: key })}
                              className="text-xs inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-slate-200 hover:bg-slate-800/70"
                            >
                              <Plus className="w-3 h-3" />
                              Nuevo horario ligado
                            </button>
                          )}
                        </div>
                        {scheduleEntries.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 px-4 py-3 text-sm text-slate-400 space-y-2">
                            <p>Crea un bloque de horario y lo podrás asignar a este servicio.</p>
                            <button
                              type="button"
                              onClick={() => addSchedule({ attachToService: key })}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-white hover:bg-slate-800/70"
                            >
                              <Plus className="w-3 h-3" />
                              Crear y vincular
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap gap-2">
                              {orderedScheduleEntries.map(([scheduleKey, block]) => {
                                const label = block.label?.trim() || 'Bloque sin nombre';
                                const assigned = Boolean(service.schedule_keys?.includes(scheduleKey));
                                return (
                                  <button
                                    type="button"
                                    key={scheduleKey}
                                    onClick={() => toggleServiceSchedule(key, scheduleKey)}
                                    className={`text-xs px-3 py-1.5 rounded-full border transition ${
                                      assigned
                                        ? 'border-emerald-400 text-emerald-200 bg-emerald-500/10'
                                        : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                                    }`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-xs text-slate-500">
                              Puedes reutilizar el mismo bloque en varios servicios o dejar el servicio sin horarios para definirlo después.
                            </p>
                          </>
                        )}
                      </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Schedules */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 text-white">
                  <Clock className="w-5 h-5 text-sky-300" />
                  <div>
                    <h2 className="text-xl font-semibold">Bloques de horario</h2>
                    <p className="text-sm text-slate-400">
                      Configura ventanas disponibles, descansos y capacidad por día.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => addSchedule()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-white hover:bg-slate-800/80"
                >
                  <Plus className="w-4 h-4" />
                  Agregar bloque
                </button>
              </div>

              {scheduleEntries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 px-6 py-10 text-center text-slate-500">
                  No hay horarios configurados.
                </div>
              ) : (
                <div className="space-y-4">
                  {orderedScheduleEntries.map(([key, block]) => {
                    const isNew = newScheduleKeys.includes(key);
                    const blockBreaks = block.breaks ?? [];
                    return (
                      <div
                        key={key}
                        className={`relative rounded-xl p-5 space-y-4 ${
                          isNew
                            ? 'border border-sky-400/60 bg-sky-500/5 shadow-[0_0_35px_rgba(14,165,233,0.25)]'
                            : 'border border-slate-800 bg-slate-950/40'
                        }`}
                      >
                        {isNew && (
                          <span className="absolute -top-3 right-4 inline-flex items-center gap-1 rounded-full border border-sky-400/70 bg-sky-500/10 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-100">
                            <Sparkles className="w-3 h-3" />
                            Nuevo
                          </span>
                        )}
                      <div className="flex flex-wrap items-center gap-4 justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs uppercase tracking-widest text-slate-500">
                            Identificador (igual que la etiqueta)
                          </span>
                          <span className="text-white font-semibold">
                            {block.label?.trim() || 'Bloque sin nombre'}
                          </span>
                        </div>
                        <button
                          onClick={() => removeSchedule(key)}
                          className="text-xs px-3 py-1 rounded-lg border border-rose-600/60 text-rose-200 hover:bg-rose-600/10"
                        >
                          <Trash2 className="w-3 h-3" />
                          Eliminar
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <label className="space-y-1">
                          <span className="text-sm text-slate-300">Etiqueta visible</span>
                          <input
                            value={block.label ?? ''}
                            onChange={(e) => updateSchedule(key, 'label', e.target.value)}
                            placeholder="Ej. Horario vespertino"
                            className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-white placeholder:text-slate-600"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-sm text-slate-300">Inicio</span>
                          <input
                            type="time"
                            value={block.start ?? ''}
                            onChange={(e) => updateSchedule(key, 'start', e.target.value)}
                            className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-white"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-sm text-slate-300">Fin</span>
                          <input
                            type="time"
                            value={block.end ?? ''}
                            onChange={(e) => updateSchedule(key, 'end', e.target.value)}
                            className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-white"
                          />
                        </label>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-300">Descansos (formato 24h)</span>
                          <button
                            type="button"
                            onClick={() => addBreakRow(key)}
                            className="text-xs inline-flex items-center gap-1 rounded-full border border-slate-700 px-2.5 py-1 text-slate-200 hover:bg-slate-800/70"
                          >
                            <Plus className="w-3 h-3" />
                            Agregar descanso
                          </button>
                        </div>
                        {blockBreaks.length ? (
                          <div className="space-y-2">
                            {blockBreaks.map((range, index) => {
                              const { start, end } = splitBreakRange(range);
                              return (
                                <div
                                  key={`${key}-break-${index}`}
                                  className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
                                >
                                  <input
                                    type="time"
                                    value={start || ''}
                                    onChange={(e) => handleBreakChange(key, index, 'start', e.target.value)}
                                    className="rounded-md border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-white"
                                  />
                                  <span className="text-xs uppercase tracking-wide text-slate-500">a</span>
                                  <input
                                    type="time"
                                    value={end || ''}
                                    onChange={(e) => handleBreakChange(key, index, 'end', e.target.value)}
                                    className="rounded-md border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeBreakRow(key, index)}
                                    className="text-xs inline-flex items-center gap-1 rounded-md border border-rose-600/60 px-2 py-1 text-rose-200 hover:bg-rose-600/10"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Quitar
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">
                            Sin descansos configurados. Usa el botón para agregar uno nuevo.
                          </p>
                        )}
                        <p className="text-xs text-slate-500">Utiliza horas en formato HH:mm (24h).</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {WEEKDAY_OPTIONS.map((day) => {
                          const active = block.days.includes(day.value);
                          return (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => toggleScheduleDay(key, day.value)}
                              className={`text-xs px-3 py-1 rounded-full border transition ${
                                active
                                  ? 'border-emerald-400 text-emerald-200 bg-emerald-500/10'
                                  : 'border-slate-700 text-slate-400'
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>

                      <label className="space-y-1">
                        <span className="text-sm text-slate-300">Capacidad específica</span>
                        <input
                          type="number"
                          min={0}
                          value={block.capacity ?? ''}
                          onChange={(e) =>
                            updateSchedule(
                              key,
                              'capacity',
                              e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0)
                            )
                          }
                          className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-white"
                        />
                        <span className="text-xs text-slate-500">
                          Déjalo vacío para usar la capacidad fija.
                        </span>
                      </label>
                    </div>
                    );
                  })}
                </div>
              )}
            </section>

          </div>
        )}

        <div className="sticky bottom-6 flex justify-end">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 shadow-xl shadow-black/30 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <CheckCircle2 className={`w-4 h-4 ${isDirty ? 'text-amber-300' : 'text-emerald-300'}`} />
              {isDirty ? 'Cambios pendientes' : 'Todo sincronizado'}
            </div>
            <button
              onClick={resetChanges}
              disabled={!isDirty || saving}
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800/70 disabled:opacity-40"
            >
              Deshacer
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="text-sm px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-semibold disabled:opacity-40"
            >
              {saving ? 'Guardando…' : 'Guardar esquema'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
