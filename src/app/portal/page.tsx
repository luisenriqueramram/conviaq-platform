// src/app/portal/page.tsx
'use client';

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { EmptyState } from "@/components/portal/EmptyState";
import { GlassPanel } from "@/components/portal/GlassPanel";
import { RefreshButton } from "@/components/ui/refresh-button";
import { cn } from "@/lib/utils";

const MOTIVATIONAL_PHRASES = [
  "¡El éxito se construye un cliente a la vez!",
  "Cada conversación es una oportunidad de oro",
  "Tu persistencia define tu éxito",
  "Los leads no esperan, ¡actúa ahora!",
  "Convierte conversaciones en cierres épicos",
  "La automatización te da superpoderes",
  "Hoy es el día para romper récords",
  "Tu energía atrae clientes de alto valor",
  "Cada NO te acerca más al SÍ perfecto",
  "Domina el follow-up, domina el mercado",
  "La velocidad de respuesta = más ventas",
  "Tu actitud determina tu altitud",
  "Convierte datos en decisiones ganadoras",
  "El momentum se construye con acción diaria",
  "Pipeline lleno, cuenta bancaria feliz",
  "Automatiza lo aburrido, enfócate en cerrar",
  "Cada mensaje puede ser tu próximo deal",
  "La consistencia mata al talento sin disciplina",
  "Tu CRM es tu arma secreta",
  "Más conversaciones = más conversiones",
  "El mejor momento para cerrar es AHORA",
  "Convierte objeciones en oportunidades",
  "Tu pipeline refleja tu futuro",
  "Automatiza para escalar sin límites",
  "Cada lead merece tu mejor versión",
  "La IA trabaja 24/7 para ti",
  "Cierra más, trabaja menos",
  "Tu base de datos es puro oro",
  "Follow-up agresivo, resultados explosivos",
  "El timing perfecto es cuando actúas",
  "Convierte leads fríos en deals calientes",
  "Tu mensaje puede cambiar un negocio",
  "Pipeline robusto, ventas imparables",
  "Automatiza el caos, multiplica resultados",
  "Cada interacción suma al cierre",
  "Responde rápido, cierra más rápido",
  "Tu CRM te hace invencible",
  "Más actividad = más oportunidades",
  "El follow-up es donde vive el dinero",
  "Convierte WhatsApp en tu cajero automático",
  "La velocidad vence a la perfección",
  "Tu persistencia asusta a la competencia",
  "Automatiza para dominar tu mercado",
  "Cada conversación puede ser tu record",
  "El momentum está de tu lado",
  "Cierra deals mientras duermes",
  "Tu disciplina define tu comisión",
  "Más pipeline, más tranquilidad",
  "La automatización es tu ventaja injusta",
  "¡Hoy se rompen todas las metas!"
];

type ApiOk<T> = { ok: true; data: T };
type ApiErr = { ok: false; error: string };
type ApiResp<T> = ApiOk<T> | ApiErr;

type MeResponse = {
  user: { id: number; name: string | null; email: string; role: string | null };
  tenant: { id: number; name: string; slug: string };
  plan: { id: number | null; name: string | null; features: string[] };
};

type MsgMetrics = {
  granularity: 'hour' | 'day';
  range: { since: string; until: string };
  series: Array<{
    bucket: string | null;
    total: number;
    inbound: number;
    outbound_human: number;
    outbound_ai: number;
  }>;
  totals: { total: number; inbound: number; outbound_human: number; outbound_ai: number };
};

type ConvMetrics = {
  granularity: 'hour' | 'day';
  range: { since: string; until: string };
  status_counts: { status: string; count: number }[];
  series: Array<{ bucket: string | null; count: number }>;
};

function fmtCount(n: unknown) {
  if (typeof n === "number") return String(n);
  return "—";
}

export default function PortalDashboardPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [leads, setLeads] = useState<any>(null);
  const [convos, setConvos] = useState<any>(null);
  const [pipes, setPipes] = useState<any>(null);
  const [msgMetrics, setMsgMetrics] = useState<MsgMetrics | null>(null);
  const [convMetrics, setConvMetrics] = useState<ConvMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [rangeKey, setRangeKey] = useState<'week' | 'month' | 'last3' | 'last2' | 'last24h'>('week');
  const [runtimeState, setRuntimeState] = useState<any>(null);
  const [waStatus, setWaStatus] = useState<'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const now = new Date();
        const toIso = (d: Date) => new Date(d).toISOString();
        const sinceUntil = (() => {
          const end = now;
          if (rangeKey === 'month') {
            const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
            return { since: toIso(start), until: toIso(end), granularity: 'day' as const };
          }
          if (rangeKey === 'last3') {
            const start = new Date(end.getTime() - 3 * 24 * 60 * 60 * 1000);
            return { since: toIso(start), until: toIso(end), granularity: 'day' as const };
          }
          if (rangeKey === 'last2') {
            const start = new Date(end.getTime() - 2 * 24 * 60 * 60 * 1000);
            return { since: toIso(start), until: toIso(end), granularity: 'day' as const };
          }
          if (rangeKey === 'last24h') {
            const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
            return { since: toIso(start), until: toIso(end), granularity: 'hour' as const };
          }
          // default: week
          const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
          return { since: toIso(start), until: toIso(end), granularity: 'day' as const };
        })();

        const qs = new URLSearchParams({
          since: sinceUntil.since,
          until: sinceUntil.until,
          granularity: sinceUntil.granularity,
        }).toString();

        // Cargar en 3 oleadas para no saturar el pool
        // Oleada 1: Info crítica del usuario (2 queries)
        const [meRes, rtRes] = await Promise.all([
          fetch('/api/me').then(r => r.ok ? r.json() : null),
          fetch('/api/tenant-runtime').then(r => r.ok ? r.json() : null),
        ]);
        if (!mounted) return;
        setMe(meRes);
        setRuntimeState(rtRes?.data ?? null);

        // Oleada 2: Datos principales (3 queries)
        const [convosRes, leadsRes, pipesRes] = await Promise.all([
          fetch(`/api/conversations?limit=50`).then(r => r.ok ? r.json() : null),
          fetch('/api/leads').then(r => r.ok ? r.json() : null),
          fetch('/api/pipelines').then(r => r.ok ? r.json() : null),
        ]);
        if (!mounted) return;
        setConvos(convosRes);
        setLeads(leadsRes);
        setPipes(pipesRes);

        // Oleada 3: Métricas y status (3 queries)
        const [msgRes, convRes, waRes] = await Promise.all([
          fetch(`/api/metrics/messages?${qs}`).then(r => r.ok ? r.json() : null),
          fetch(`/api/metrics/conversations?${qs}`).then(r => r.ok ? r.json() : null),
          fetch('/api/channels/whatsapp/status').then(r => r.ok ? r.json() : null),
        ]);
        if (!mounted) return;
        setMsgMetrics(msgRes?.data ?? null);
        setConvMetrics(convRes?.data ?? null);
        setRuntimeState(rtRes?.data ?? null);
        setWaStatus(waRes?.data?.status ?? null);
      } catch (e) {
        console.warn('Dashboard fetch error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    
    // Cargar solo al montar el componente, no en cada cambio de rangeKey
    if (mounted) {
      load();
    }
    
    return () => { mounted = false; };
  }, []); // Array vacío = solo una vez al montar

  // Recargar cuando cambia el rango de fechas
  useEffect(() => {
    if (!loading) {
      setLoading(true);
      const timer = setTimeout(async () => {
        let mounted = true;
        try {
          const end = new Date();
          const sinceUntil = (() => {
            const toIso = (d: Date) => d.toISOString().slice(0, 19) + 'Z';
            if (rangeKey === 'month') {
              const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
              return { since: toIso(start), until: toIso(end), granularity: 'day' as const };
            }
            if (rangeKey === 'last3') {
              const start = new Date(end.getTime() - 3 * 24 * 60 * 60 * 1000);
              return { since: toIso(start), until: toIso(end), granularity: 'day' as const };
            }
            if (rangeKey === 'last2') {
              const start = new Date(end.getTime() - 2 * 24 * 60 * 60 * 1000);
              return { since: toIso(start), until: toIso(end), granularity: 'day' as const };
            }
            if (rangeKey === 'last24h') {
              const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
              return { since: toIso(start), until: toIso(end), granularity: 'hour' as const };
            }
            // default: week
            const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
            return { since: toIso(start), until: toIso(end), granularity: 'day' as const };
          })();

          const qs = new URLSearchParams({
            since: sinceUntil.since,
            until: sinceUntil.until,
            granularity: sinceUntil.granularity,
          }).toString();

          const [msgRes, convRes] = await Promise.all([
            fetch(`/api/metrics/messages?${qs}`).then(r => r.ok ? r.json() : null),
            fetch(`/api/metrics/conversations?${qs}`).then(r => r.ok ? r.json() : null),
          ]);
          
          if (mounted) {
            setMsgMetrics(msgRes?.data ?? null);
            setConvMetrics(convRes?.data ?? null);
          }
        } catch (e) {
          console.warn('Metrics fetch error', e);
        } finally {
          if (mounted) setLoading(false);
        }
        return () => { mounted = false; };
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [rangeKey]);

  const leadsCount = leads?.ok ? (leads.data?.count ?? leads.data?.length ?? 0) : undefined;
  const convosCount = convos?.ok ? (convos.data?.count ?? convos.data?.length ?? 0) : undefined;
  const pipesCount = pipes?.ok ? (pipes.data?.count ?? pipes.data?.length ?? 0) : undefined;
  const leadsList = leads?.ok ? (leads.data?.items ?? leads.data ?? []) : [];
  const convosList = convos?.ok ? (convos.data?.items ?? convos.data ?? []) : [];

  const conversationsToday = useMemo(() => {
    if (!convMetrics?.series?.length) return 0;
    const last = convMetrics.series[convMetrics.series.length - 1];
    return last?.count ?? 0;
  }, [convMetrics]);

  const responseRatePct = useMemo(() => {
    if (!msgMetrics) return '0%';
    const inbound = msgMetrics.totals?.inbound ?? 0;
    const outbound = (msgMetrics.totals?.outbound_human ?? 0) + (msgMetrics.totals?.outbound_ai ?? 0);
    if (inbound <= 0) return outbound > 0 ? '100%' : '0%';
    const pct = Math.round(Math.min(100, (outbound / inbound) * 100));
    return `${pct}%`;
  }, [msgMetrics]);

  const hasAnyData =
    (typeof leadsCount === "number" && leadsCount > 0) ||
    (typeof convosCount === "number" && convosCount > 0) ||
    (typeof pipesCount === "number" && pipesCount > 0);

  if (loading) {
    return (
      <div className="relative min-h-screen w-full bg-white dark:bg-[#030303] text-zinc-800 dark:text-zinc-200 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-lg">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-white dark:bg-[#030303] text-zinc-800 dark:text-zinc-200 p-6 selection:bg-blue-500/30 selection:text-white transition-colors">
      {/* Auroras */}
      <div className="pointer-events-none fixed top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-400/10 dark:bg-blue-600/10 rounded-full blur-[120px] mix-blend-screen z-0" />
      <div className="pointer-events-none fixed bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-indigo-400/10 dark:bg-indigo-600/10 rounded-full blur-[120px] mix-blend-screen z-0" />

      <div className="relative z-10 max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-zinc-200 dark:border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              ¡BIENVENID@, {me?.user?.name?.toUpperCase() ?? 'USUARIO'}!
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-500 font-medium">
              {MOTIVATIONAL_PHRASES[Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length)]}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <RefreshButton />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400 dark:border-emerald-500/20 bg-emerald-100 dark:bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 dark:bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600 dark:bg-emerald-500"></span>
              </span>
              Sistema en línea
            </span>
          </div>
        </div>

        {/* KPI */}
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard
            title="Oportunidades Activas"
            subtitle="Conversaciones que requieren acción"
            value={String(
              convMetrics?.status_counts?.find((s) => s.status === 'open')?.count ?? 0
            )}
          />
          <KpiCard 
            title="Nuevas Conversaciones" 
            subtitle="Iniciadas en las últimas 24h"
            value={String(conversationsToday)} 
          />
          <KpiCard 
            title="Interacciones del Período" 
            subtitle="Volumen total de mensajes"
            value={fmtCount(msgMetrics?.totals?.total)} 
          />
          <KpiCard 
            title="Índice de Respuesta" 
            subtitle="% de mensajes respondidos"
            value={responseRatePct} 
            tone={responseRatePct !== '0%' ? 'ok' : 'muted'} 
          />
        </div>

        {/* Métricas en tiempo real */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Mensajes por fuente */}
          <GlassPanel
            title={
              rangeKey === 'last24h' ? 'Mensajes - Últimas 24 horas' :
              rangeKey === 'month' ? 'Mensajes - Últimos 30 días' :
              rangeKey === 'last3' ? 'Mensajes - Últimos 3 días' :
              rangeKey === 'last2' ? 'Mensajes - Últimos 2 días' :
              'Mensajes - Últimos 7 días'
            }
            subtitle="Por fuente (Entrada / IA / Humano)"
            className="border-white/5 bg-zinc-900/40 backdrop-blur-xl"
          >
            {msgMetrics ? (
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" /> Entrada: {msgMetrics.totals.inbound}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500" /> Humano: {msgMetrics.totals.outbound_human}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" /> IA: {msgMetrics.totals.outbound_ai}
                  </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RangeButton label="Semana" active={rangeKey==='week'} onClick={() => setRangeKey('week')} />
                    <RangeButton label="Mes" active={rangeKey==='month'} onClick={() => setRangeKey('month')} />
                    <RangeButton label="Últ. 3d" active={rangeKey==='last3'} onClick={() => setRangeKey('last3')} />
                    <RangeButton label="Últ. 2d" active={rangeKey==='last2'} onClick={() => setRangeKey('last2')} />
                    <RangeButton label="24h" active={rangeKey==='last24h'} onClick={() => setRangeKey('last24h')} />
                  </div>
                </div>
                <div className="h-32 flex items-end gap-1.5 border border-dashed border-white/10 rounded-lg p-3">
                  {(() => {
                    const windowSize = rangeKey==='last24h' ? 24 : (rangeKey==='last2' ? 2 : rangeKey==='last3' ? 3 : rangeKey==='month' ? 30 : 7);
                    const points = msgMetrics.series.slice(-windowSize);
                    const max = Math.max(1, ...points.map(s => Math.max(s.inbound, s.outbound_human, s.outbound_ai)));
                    const h = (v: number) => Math.round((v / max) * 100);
                    return points.map((p, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex items-end justify-center gap-0.5">
                          <div className="w-2 bg-emerald-500/70 rounded-t" style={{ height: h(p.inbound) || 2 }} />
                          <div className="w-2 bg-blue-500/70 rounded-t" style={{ height: h(p.outbound_human) || 2 }} />
                          <div className="w-2 bg-indigo-500/70 rounded-t" style={{ height: h(p.outbound_ai) || 2 }} />
                        </div>
                        <div className="text-[9px] text-zinc-600 truncate w-full text-center">
                          {rangeKey==='last24h'
                            ? new Date(p.bucket ?? Date.now()).toLocaleTimeString('es-MX', { hour: '2-digit' })
                            : new Date(p.bucket ?? Date.now()).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-zinc-500 text-sm">
                Cargando métricas...
              </div>
            )}
          </GlassPanel>

          {/* Conversaciones por estado */}
          <GlassPanel
            title="Conversaciones por Estado"
            subtitle="Distribución actual"
            className="border-white/5 bg-zinc-900/40 backdrop-blur-xl"
          >
            {convMetrics ? (
              <div className="space-y-2 pt-4">
                {convMetrics.status_counts.map((s, idx) => {
                  const total = convMetrics.status_counts.reduce((sum, x) => sum + x.count, 0);
                  const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                  return (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-black/20 hover:bg-black/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          s.status === 'open' ? "bg-green-500" : s.status === 'closed' ? "bg-gray-500" : "bg-yellow-500"
                        )} />
                        <span className="text-sm text-zinc-300 capitalize">{s.status}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500">{pct}%</span>
                        <span className="text-sm font-medium text-zinc-200">{s.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-zinc-500 text-sm">
                Cargando métricas...
              </div>
            )}
          </GlassPanel>
        </div>

        {/* Panels */}
        <div className="grid gap-6 lg:grid-cols-1">
          <GlassPanel
            title="Estado del Sistema"
            subtitle="Conectividad y banderas del bot"
            className="min-h-[240px] border-white/5 bg-zinc-900/40 backdrop-blur-xl"
          >
            <div className="grid gap-3 pt-4">
              <StatusRow label="Bot encendido" ok={runtimeState ? !runtimeState.ai_force_off : false} />
              <StatusRow label="WhatsApp conectado" ok={waStatus === 'CONNECTED'} />
              <div className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-black/20 px-4 py-3">
                <div className="text-xs font-medium text-zinc-400">Plan</div>
                <div className="text-xs font-medium text-zinc-300">{me?.plan?.name ?? '—'}</div>
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* Últimas 5 conversaciones */}
        <div className="grid gap-6 lg:grid-cols-1">
          <GlassPanel
            title="Últimas 5 conversaciones"
            subtitle="Actividad reciente"
            className="border-white/5 bg-zinc-900/40 backdrop-blur-xl"
          >
            {Array.isArray(convosList) && convosList.length > 0 ? (
              <ul className="divide-y divide-white/5">
                {convosList.slice(0, 5).map((c: any, idx: number) => (
                  <li
                    key={c?.id ?? c?.id_conversacion ?? idx}
                    className="py-3 flex items-center justify-between gap-3 group hover:bg-white/5 px-2 -mx-2 rounded transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-zinc-200 font-medium truncate group-hover:text-blue-400 transition-colors">
                        {c?.contact_name ?? c?.titulo ?? c?.name ?? "Conversación"}
                      </div>
                      <div className="text-xs text-zinc-600 truncate">
                        {c?.channel_type ?? c?.canal ?? "Canal"}
                      </div>
                    </div>
                    <Link
                      href={`/portal/conversations?cid=${encodeURIComponent(String(c?.id ?? c?.id_conversacion ?? ""))}`}
                      className="text-[10px] font-medium text-zinc-400 hover:text-white border border-white/10 bg-white/5 px-2.5 py-1 rounded hover:bg-blue-600/20 hover:border-blue-500/30 transition-all"
                    >
                      Abrir
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="Sin actividad"
                description="Las nuevas conversaciones aparecerán aquí."
              />
            )}
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  subtitle,
  value,
  tone = "muted",
}: {
  title: string;
  subtitle?: string;
  value: string;
  tone?: "muted" | "ok" | "error";
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900/60 p-6 backdrop-blur-xl transition-all hover:border-blue-400 dark:hover:border-blue-500/30 hover:shadow-lg dark:hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.2)]">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 dark:from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-3">
          <div className="space-y-0.5">
            <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {title}
            </div>
            {subtitle && (
              <div className="text-[9px] text-zinc-500 dark:text-zinc-600 font-medium leading-tight max-w-[180px]">
                {subtitle}
              </div>
            )}
          </div>
          <div
            className={cn(
              "w-2 h-2 rounded-full shrink-0",
              tone === "ok"
                ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                : tone === "error"
                ? "bg-red-500"
                : "bg-zinc-400 dark:bg-zinc-700"
            )}
          />
        </div>

        <div className="text-3xl font-mono font-medium text-zinc-900 dark:text-zinc-100 tracking-tight group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
          {value}
        </div>
      </div>
    </div>
  );
}

function Quick({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-white/[0.02] p-4 transition-all hover:bg-zinc-50 dark:hover:bg-white/[0.05] hover:border-zinc-300 dark:hover:border-white/10"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:from-blue-500/10 dark:group-hover:from-blue-500/5 group-hover:to-transparent transition-all duration-500" />
      <div className="relative z-10">
        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{label}</div>
        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-500">{desc}</div>
      </div>
    </Link>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-black/20 px-4 py-3 group hover:border-zinc-300 dark:hover:border-white/10 transition-colors">
      <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300">{label}</div>
      <div className={cn("text-xs font-medium", ok ? "text-emerald-600 dark:text-emerald-500" : "text-red-500 dark:text-red-400")}>
        {ok ? "En línea" : "Sin conexión"}
      </div>
    </div>
  );
}

function RangeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-xs px-3 py-1 rounded border transition-colors",
        active
          ? "border-blue-400 dark:border-blue-500/50 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300"
          : "border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/20"
      )}
    >
      {label}
    </button>
  );
}
