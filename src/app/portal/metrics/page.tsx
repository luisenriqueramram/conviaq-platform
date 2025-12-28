// src/app/portal/metrics/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

type MsgSeriesPoint = {
  bucket: string | null;
  total: number;
  inbound: number;
  outbound_human: number;
  outbound_ai: number;
};

type MsgMetrics = {
  granularity: 'hour' | 'day';
  range: { since: string; until: string };
  series: MsgSeriesPoint[];
  totals: { total: number; inbound: number; outbound_human: number; outbound_ai: number };
};

type ConvPoint = { bucket: string | null; count: number };
type ConvMetrics = {
  granularity: 'hour' | 'day';
  range: { since: string; until: string };
  status_counts: { status: string; count: number }[];
  series: ConvPoint[];
};

export default function MetricsPage() {
  const [messages, setMessages] = useState<MsgMetrics | null>(null);
  const [conversations, setConversations] = useState<ConvMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [mRes, cRes] = await Promise.all([
          fetch('/api/metrics/messages').then(r => r.ok ? r.json() : Promise.reject(new Error('messages_fetch_failed'))),
          fetch('/api/metrics/conversations').then(r => r.ok ? r.json() : Promise.reject(new Error('conversations_fetch_failed'))),
        ]);
        if (!mounted) return;
        setMessages(mRes?.data ?? null);
        setConversations(cRes?.data ?? null);
      } catch (e) {
        console.warn('metrics fetch error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const conversationsToday = useMemo(() => {
    if (!conversations?.series?.length) return 0;
    // last bucket in range (assumes ascending order)
    const last = conversations.series[conversations.series.length - 1];
    return last?.count ?? 0;
  }, [conversations]);

  const responseRatePct = useMemo(() => {
    if (!messages) return '0%';
    const inbound = messages.totals?.inbound ?? 0;
    const outbound = (messages.totals?.outbound_human ?? 0) + (messages.totals?.outbound_ai ?? 0);
    if (inbound <= 0) return outbound > 0 ? '100%' : '0%';
    const pct = Math.round(Math.min(100, (outbound / inbound) * 100));
    return `${pct}%`;
  }, [messages]);

  const metrics = [
    { label: 'Conversaciones hoy', value: String(conversationsToday), icon: '💬', trend: null },
    { label: 'Leads nuevos', value: '0', icon: '🎯', trend: null },
    { label: 'Citas agendadas', value: '0', icon: '📅', trend: null },
    { label: 'Tasa de respuesta', value: responseRatePct, icon: '⚡', trend: null },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Métricas
          </h1>
          <p className="text-slate-400">
            Análisis de rendimiento y estadísticas de tu plataforma
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 backdrop-blur hover:border-slate-600 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <p className="text-sm text-slate-400">{metric.label}</p>
                  <p className="text-3xl font-bold text-slate-200">{metric.value}</p>
                </div>
                <span className="text-2xl opacity-70 group-hover:opacity-100 transition-opacity">
                  {metric.icon}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Messages Volume */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">
              Volumen de mensajes
            </h2>
            {messages ? (
              <div className="space-y-4">
                <div className="flex items-center gap-6 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" /> Entrada: {messages.totals.inbound}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500" /> Salida Humano: {messages.totals.outbound_human}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" /> Salida IA: {messages.totals.outbound_ai}
                  </div>
                </div>
                <div className="h-40 flex items-end gap-2 border border-dashed border-slate-700 rounded-lg p-3">
                  {messages.series.slice(-14).map((p, idx) => {
                    const max = Math.max(1, Math.max(p.inbound, p.outbound_human, p.outbound_ai));
                    const h = (v: number) => Math.round((v / max) * 120);
                    return (
                      <div key={idx} className="flex flex-col items-center gap-1">
                        <div className="flex items-end gap-1">
                          <div className="w-2 bg-emerald-500/70" style={{ height: h(p.inbound) }} />
                          <div className="w-2 bg-blue-500/70" style={{ height: h(p.outbound_human) }} />
                          <div className="w-2 bg-indigo-500/70" style={{ height: h(p.outbound_ai) }} />
                        </div>
                        <div className="text-[10px] text-slate-500">{new Date(p.bucket ?? Date.now()).toLocaleDateString()}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-500 border border-dashed border-slate-700 rounded-lg">
                Cargando métricas...
              </div>
            )}
          </div>

          {/* Conversation Funnel */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">
              Embudo de conversación
            </h2>
            {conversations ? (
              <div className="space-y-2">
                {conversations.status_counts.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                    <span className="text-sm text-slate-400">{s.status}</span>
                    <span className="text-xs text-slate-300">{s.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-500 border border-dashed border-slate-700 rounded-lg">
                Cargando métricas...
              </div>
            )}
          </div>

          {/* Intent Types */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">
              Tipos de intención
            </h2>
            <div className="space-y-2">
              {['Información', 'Cotización', 'Soporte', 'Queja'].map((intent) => (
                <div
                  key={intent}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50"
                >
                  <span className="text-sm text-slate-400">{intent}</span>
                  <span className="text-xs text-slate-500">0</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bot Performance */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">
              Desempeño del bot
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-400">Resoluciones completas</span>
                  <span className="text-sm font-semibold text-blue-400">0%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-blue-500 w-0" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-400">Escalaciones</span>
                  <span className="text-sm font-semibold text-amber-400">0%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-amber-500 w-0" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 backdrop-blur">
          <p className="text-sm text-slate-400">
            💡 <span className="font-semibold">Próximamente:</span> Gráficas avanzadas y métricas de leads/citas.
          </p>
        </div>
      </div>
    </div>
  );
}
