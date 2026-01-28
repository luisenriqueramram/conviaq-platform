"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, Trash2 } from "lucide-react";

type Lead = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  stage: number | null;
  date?: string | null;
  replied?: boolean;
  conversationStatus?: string | null;
  aiForceOff?: boolean;
  tags?: Array<{ id: number; name: string; color?: string | null; is_system?: boolean }>;
  confidence?: number | null;
  waJid?: string | null;
  lastContactMessageAt?: string | null;
  lastAiAuditNote?: string | null;
  summary?: string | null;
  description?: string | null;
  conversationId?: number | null;
  dealValue?: number | null;
  currency?: string | null;
  stageName?: string | null;
  reminders?: Array<{ id: string; text: string; dueAt: string; active: boolean }>;
};

type Stage = {
  id: number;
  name: string;
  color?: string | null;
  stage_order?: number | null;
  is_final?: boolean;
};

export default function PipelineFlowPage() {
  const params = useParams();
  const pipelineId = params?.id as string | undefined;

  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeadLoading, setSelectedLeadLoading] = useState(false);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [movingLeadId, setMovingLeadId] = useState<number | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [editOrder, setEditOrder] = useState(false);
  const [draggedStageId, setDraggedStageId] = useState<number | null>(null);
  const [orderSaving, setOrderSaving] = useState(false);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [universalStageIds, setUniversalStageIds] = useState<Set<number>>(new Set());

  const orderedStages = useMemo(() => {
    const withOrder = stages.filter((s) => typeof s.stage_order === "number");
    return withOrder.length ? withOrder.sort((a, b) => (a.stage_order ?? 9999) - (b.stage_order ?? 9999)) : stages;
  }, [stages]);

  useEffect(() => {
    if (!pipelineId) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/pipelines/${pipelineId}/leads`);
        if (!res.ok) throw new Error("No pudimos cargar el pipeline");
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Error al cargar");
        if (!mounted) return;
        setStages(json.data?.stages || []);
        setLeads(json.data?.leads || []);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [pipelineId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/config/metadata");
        if (!res.ok) return;
        const json = await res.json();
        const stagesMeta: Array<{ id: number; t_order: number }> = json?.data?.stages || [];
        const universalIds = stagesMeta.filter((s) => s.t_order === 0).map((s) => s.id);
        setUniversalStageIds(new Set(universalIds));
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const getLeadsInStage = (stageId: number) => {
    return leads
      .filter((l) => l.stage === stageId)
      .sort((a, b) => {
        const confA = typeof a.confidence === "number" ? a.confidence : -1;
        const confB = typeof b.confidence === "number" ? b.confidence : -1;
        if (confB !== confA) return confB - confA;
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
  };

  const hottestStage = stages.reduce<{ id: number | null; name: string; count: number }>(
    (acc, stage) => {
      const count = getLeadsInStage(stage.id).length;
      return count > acc.count ? { id: stage.id, name: stage.name, count } : acc;
    },
    { id: null, name: "Sin actividad", count: 0 }
  );

  const cotizacionStageIds = useMemo(
    () => stages.filter((s) => /cotiz/i.test(s.name)).map((s) => s.id),
    [stages]
  );

  const ganadoStageIds = useMemo(
    () => stages.filter((s) => s.is_final || /ganado/i.test(s.name)).map((s) => s.id),
    [stages]
  );

  const cotizacionCount = leads.filter((l) => l.stage != null && cotizacionStageIds.includes(l.stage)).length;
  const ganadoCount = leads.filter((l) => l.stage != null && ganadoStageIds.includes(l.stage)).length;

  const formatDateTime = (value?: string | null) => {
    if (!value) return null;
    const normalized = value.includes("T") ? value : value.replace(" ", "T");
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Mexico_City",
    }).format(d);
  };

  const formatLastMessage = (value?: string | null) => {
    if (!value) return null;
    const normalized = value.includes("T") ? value : value.replace(" ", "T");
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return null;

    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - d.getTime());
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1);

    const dateOnly = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "America/Mexico_City" });

    if (minutes < 60) return `Hace ${Math.max(minutes, 1)} min`;
    if (hours < 3) {
      const rem = minutes - hours * 60;
      return `Hace ${hours} h${rem ? ` ${rem} min` : ""}`;
    }
    if (d >= todayStart) return `Hoy • Hace más de ${hours} h aprox.`;
    if (d >= yesterdayStart) return "Ayer";
    return dateOnly.format(d);
  };

  const persistStageChange = async (leadId: number, nextStageId: number, previousStageId: number | null) => {
    setMoveError(null);
    setMovingLeadId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: nextStageId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "No pudimos actualizar el lead");
      }
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : "Movimiento no guardado");
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: previousStageId } : l)));
      setSelectedLead((curr) => (curr && curr.id === leadId ? { ...curr, stage: previousStageId } : curr));
    } finally {
      setMovingLeadId(null);
    }
  };

  const changeLeadStage = async (leadId: number, targetStage: Stage) => {
    const previous = leads.find((l) => l.id === leadId)?.stage ?? null;
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: targetStage.id } : l)));
    setSelectedLead((curr) => (curr && curr.id === leadId ? { ...curr, stage: targetStage.id } : curr));
    await persistStageChange(leadId, targetStage.id, previous);
  };

  const handleDropLead = (stageId: number) => {
    if (!draggedLead || editOrder) return;
    const targetStage = stages.find((s) => s.id === stageId);
    setDraggedLead(null);
    if (!targetStage) {
      setMoveError("Etapa no encontrada");
      setTimeout(() => setMoveError(null), 3000);
      return;
    }
    changeLeadStage(draggedLead.id, targetStage);
  };

  const openLeadDetails = async (leadShort: Lead) => {
    try {
      setSelectedLeadLoading(true);
      setSelectedLead(leadShort);
      const res = await fetch(`/api/leads/${leadShort.id}`);
      if (!res.ok) return;
      const json = await res.json().catch(() => null);
      if (!json?.ok) return;
      setSelectedLead((prev) => {
        const prevLast = prev?.lastContactMessageAt;
        const prevConversationId = prev?.conversationId;
        const nextLast = (json.data as any)?.lastContactMessageAt ?? (json.data as any)?.last_contact_message_at ?? null;
        const merged = { ...(prev ?? {}), ...json.data } as Lead;
        if (!nextLast && prevLast) {
          merged.lastContactMessageAt = prevLast;
        }
        if (!merged.conversationId && prevConversationId) {
          merged.conversationId = prevConversationId;
        }
        return merged;
      });
    } catch (e) {
      // ignore
    } finally {
      setSelectedLeadLoading(false);
    }
  };

  const saveStageOrder = async () => {};

  if (!pipelineId) return <div className="p-8">Pipeline inválido</div>;
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050608] text-white px-4 py-6">
        <div className="mx-auto max-w-[1380px] space-y-4">
          <div className="h-12 w-64 animate-pulse rounded-xl bg-white/5" />
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-20 w-48 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
          <div className="stealth-scroll overflow-x-auto pb-4">
            <div className="flex min-w-min gap-6 pr-6">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex-shrink-0 w-[420px] space-y-3">
                  <div className="h-14 animate-pulse rounded-2xl bg-white/5" />
                  <div className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4">
                    {Array.from({ length: 3 }).map((__, cidx) => (
                      <div key={cidx} className="h-24 animate-pulse rounded-2xl bg-[#0c1018]" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!stages.length) return <div className="p-8">Este pipeline no tiene etapas configuradas.</div>;

  const renderTemperature = (lead: Lead) => {
    const stage = stages.find((s) => s.id === lead.stage);
    const isGanado = stage?.is_final && /ganado/i.test(stage.name);
    if (isGanado) return <div className="mb-1 inline-flex items-center gap-2 rounded-xl px-2 py-1 text-xs font-semibold text-white bg-green-600/70 border border-green-300/40">🏆 Ganado</div>;

    const c = lead.confidence ?? -1;
    if (c >= 80) return <div className="mb-1 inline-flex items-center gap-2 rounded-xl px-2 py-1 text-xs font-semibold text-white bg-gradient-to-r from-orange-500/80 to-red-600/80 border border-orange-400/40">🔥 HOT <span className="text-white/70">{c}%</span></div>;
    if (c >= 60) return <div className="mb-1 inline-flex items-center gap-2 rounded-xl px-2 py-1 text-xs font-semibold text-white bg-gradient-to-r from-yellow-400/80 to-orange-400/80 border border-yellow-300/40">🌤️ Tibio <span className="text-white/70">{c}%</span></div>;
    if (c >= 30) return <div className="mb-1 inline-flex items-center gap-2 rounded-xl px-2 py-1 text-xs font-semibold text-white bg-gradient-to-r from-blue-400/80 to-sky-500/80 border border-blue-300/40">🧊 Frío <span className="text-white/70">{c}%</span></div>;
    return null;
  };

  return (
    <div className="min-h-screen bg-[#050608] text-white text-[15px]">
      <div className="mx-auto max-w-[1380px] space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
            <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 flex flex-col items-start min-w-[110px]">
              <span className="text-[9px] uppercase tracking-widest text-white/35">Más activo</span>
              <span className="text-[13px] font-medium text-white/80 leading-tight">{hottestStage.name}</span>
              <span className="text-[10px] text-white/45">{hottestStage.count}</span>
            </div>
            <div className="rounded-xl border border-green-400/30 bg-green-500/10 px-2 py-1 flex flex-col items-start min-w-[110px]">
              <span className="text-[9px] uppercase tracking-widest text-green-300/80">Ganado</span>
              <span className="text-[13px] font-semibold text-green-200 leading-tight">{ganadoCount} leads</span>
            </div>
            <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/10 px-2 py-1 flex flex-col items-start min-w-[110px]">
              <span className="text-[9px] uppercase tracking-widest text-yellow-200/80">En cotización</span>
              <span className="text-[13px] font-semibold text-yellow-100 leading-tight">{cotizacionCount} leads</span>
            </div>
          </div>
        </div>

        {moveError && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100 shadow-lg">
            <div className="flex items-center justify-between gap-4">
              <span>{moveError}</span>
              <button onClick={() => setMoveError(null)} className="text-xs uppercase tracking-[0.3em] text-red-200 hover:text-red-100">Cerrar</button>
            </div>
          </div>
        )}

        <div className="stealth-scroll overflow-x-auto pb-4">
          <div className="flex min-w-min gap-6 pr-6">
            {orderedStages.map((stage) => {
              const stageLeads = getLeadsInStage(stage.id);
              const dynamicWidth = stageLeads.length * 90 + 260;
              const stageWidth = Math.max(400, Math.min(520, dynamicWidth));
              return (
                <div
                  key={stage.id}
                  className="flex-shrink-0 snap-start"
                  style={{ width: `${stageWidth}px` }}
                  draggable={editOrder}
                  onDragStart={() => editOrder && setDraggedStageId(stage.id)}
                  onDragOver={(e) => editOrder ? e.preventDefault() : undefined}
                  onDrop={() => {
                    if (!editOrder || draggedStageId == null || draggedStageId === stage.id) return;
                    const fromIndex = stages.findIndex((s) => s.id === draggedStageId);
                    const toIndex = stages.findIndex((s) => s.id === stage.id);
                    if (fromIndex < 0 || toIndex < 0) return;
                    const next = [...stages];
                    const [moved] = next.splice(fromIndex, 1);
                    next.splice(toIndex, 0, moved);
                    const reindexed = next.map((s, idx) => ({ ...s, stage_order: idx }));
                    setStages(reindexed);
                    setDraggedStageId(null);
                  }}
                >
                  <div className="rounded-[24px] border border-white/5 bg-white/5 px-5 py-3">
                    <div className="flex items-center justify-between">
                      <div className="text-white/70">
                        <h3 className="flex items-center gap-2 text-base font-medium break-words whitespace-pre-line max-h-[2.6em] leading-tight overflow-hidden">
                          {stage.name.replace(/oportunidad/gi, "").trim()}
                          {universalStageIds.has(stage.id) && (
                            <span className="text-white/30" title="Universal">
                              <Globe className="h-4 w-4" />
                            </span>
                          )}
                        </h3>
                      </div>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/60">
                        {String(stageLeads.length).padStart(2, "0")}
                      </span>
                    </div>
                  </div>

                  <div
                    onDragOver={!editOrder ? (e) => e.preventDefault() : undefined}
                    onDrop={!editOrder ? () => handleDropLead(stage.id) : undefined}
                    className="stealth-scroll mt-2 h-[60vh] space-y-3 overflow-y-auto overflow-x-hidden rounded-[24px] border border-white/5 bg-white/5 px-4 py-4"
                  >
                    {stageLeads.length === 0 ? (
                      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-transparent px-6 py-10 text-center text-sm text-white/40">
                        Arrastra leads aquí
                      </div>
                    ) : (
                      <AnimatePresence>
                        {stageLeads.map((lead) => {
                          const isMoving = movingLeadId === lead.id;
                          return (
                            <motion.div
                              key={lead.id}
                              layoutId={`lead-${lead.id}`}
                              layout
                              draggable
                              transition={{ layout: { type: "spring", bounce: 0.2, duration: 0.3 } }}
                              initial={{ scale: 0.98, opacity: 0.7, y: 10 }}
                              animate={{ scale: 1, opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 30 } }}
                              exit={{ scale: 0.95, opacity: 0, y: 20, transition: { duration: 0.15 } }}
                              onDragStart={() => setDraggedLead(lead)}
                              onClick={() => openLeadDetails(lead)}
                              className={`group rounded-3xl border border-white/10 bg-[#090d14]/80 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-white/30 ${
                                isMoving || editOrder ? "opacity-60 pointer-events-none" : "cursor-pointer"
                              }`}
                            >
                              {renderTemperature(lead)}

                              <div className="flex flex-col gap-1 items-start w-full">
                                <span className="block w-full truncate text-lg font-bold text-white/90 leading-tight">{lead.phone || "Sin teléfono"}</span>
                                <span className="block w-full text-[16px] text-white/80 leading-snug">{lead.name.replace(/oportunidad[:]?/gi, "").trim()}</span>
                                <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-indigo-400/50 bg-indigo-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-50 shadow-sm">
                                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-200" />
                                  {formatLastMessage(lead.lastContactMessageAt)
                                    ? `Último mensaje ${formatLastMessage(lead.lastContactMessageAt)}`
                                    : "Sin último mensaje"}
                                </span>
                              </div>

                              <div className="mt-2 flex items-center gap-2">
                                {lead.replied ? (
                                  <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold">Respondido</span>
                                ) : (
                                  <span className="rounded-full bg-yellow-600 px-2 py-0.5 text-xs font-semibold">Sin respuesta</span>
                                )}
                                {lead.conversationStatus && (
                                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs">{lead.conversationStatus}</span>
                                )}
                                {lead.aiForceOff && (
                                  <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold">IA apagada</span>
                                )}
                              </div>

                              {lead.tags && lead.tags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1 text-white/60">
                                  {lead.tags.slice(0, 2).map((tag) => (
                                    <span key={tag.id} className="rounded-full border border-white/10 bg-transparent px-2 py-0.5 text-[11px]">
                                      {tag.name}
                                    </span>
                                  ))}
                                  {lead.tags.length > 2 && (
                                    <span className="rounded-full border border-white/10 bg-transparent px-2 py-0.5 text-[11px] text-white/40">+{lead.tags.length - 2}</span>
                                  )}
                                </div>
                              )}

                              {editOrder && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLeads((prev) => prev.filter((l) => l.id !== lead.id));
                                    if (selectedLead?.id === lead.id) setSelectedLead(null);
                                  }}
                                  className="mt-3 w-full rounded-xl border border-white/10 px-3 py-2 text-sm text-white/70 hover:text-red-200"
                                >
                                  <Trash2 className="mr-1 inline h-3 w-3" /> Eliminar
                                </button>
                              )}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedLead && (
          <div className="fixed inset-0 z-50 flex">
            <div className="flex-1" onClick={() => setSelectedLead(null)} />
            <div className="w-96 border-l border-white/10 bg-slate-950/95 p-6 shadow-[0_0_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
              <button onClick={() => setSelectedLead(null)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-200">
                ✕
              </button>

              <div className="stealth-scroll h-full space-y-6 overflow-y-auto pr-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Lead seleccionado</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">{selectedLead.name}</h2>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-200">
                    <span className="h-2 w-2 rounded-full bg-blue-400" />
                    {stages.find((stage) => stage.id === selectedLead.stage)?.name ?? "Sin etapa"}
                  </div>
                </div>

                <div className="space-y-3 border-t border-slate-700 pt-6">
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wider text-slate-400">Teléfono</p>
                    <p className="font-medium text-white">{selectedLead.phone || "Sin teléfono"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wider text-slate-400">Último mensaje</p>
                    <p className="font-medium text-white">
                      {formatLastMessage(selectedLead.lastContactMessageAt) ?? "Sin último mensaje"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-700 pt-6">
                  <h3 className="mb-1 text-xs uppercase tracking-wider text-slate-400">Descripción</h3>
                  <div className="border border-indigo-500/30 rounded-lg bg-indigo-950/30 p-3 text-sm">
                    {selectedLeadLoading ? (
                      <p className="text-xs text-slate-300">Cargando...</p>
                    ) : (
                      <p className="text-sm text-white whitespace-pre-line">{selectedLead.description || selectedLead.summary || "Sin descripción"}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-700 pt-6">
                  <p className="mb-3 text-xs uppercase tracking-wider text-slate-400">Cambiar etapa</p>
                  <button onClick={() => setShowModal(true)} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
                    Mostrar más
                  </button>
                </div>

                <button onClick={() => setSelectedLead(null)} className="mt-6 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:border-white/20 hover:bg-white/10">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {showModal && selectedLead && (
          <div className="fixed inset-0 z-60 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
            <div className="relative z-10 w-[720px] max-w-full rounded-2xl bg-slate-950/95 p-6 shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{selectedLead.name}</h3>
                  <p className="text-sm text-white/60">{selectedLead.phone || selectedLead.waJid || "Sin teléfono"}</p>
                </div>
                <div className="flex gap-2">
                  {selectedLead.conversationId && (
                    <button
                      onClick={() => window.open(`/portal/conversations?cid=${selectedLead.conversationId}`, "_blank")}
                      className="rounded-md border border-blue-400/40 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-100"
                    >
                      Ir a conversación
                    </button>
                  )}
                  <button onClick={() => setShowModal(false)} className="text-slate-400">Cerrar</button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">Conversación</p>
                  <p className="font-medium">{selectedLead.conversationStatus ?? "Sin conversación"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">Último mensaje (cliente)</p>
                  <p className="font-medium">{formatLastMessage(selectedLead.lastContactMessageAt) ?? "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">Respondido</p>
                  <p className="font-medium">{selectedLead.replied ? "Sí" : "No"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">IA</p>
                  <p className="font-medium text-red-300">{selectedLead.aiForceOff ? "Apagada" : "Activa"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">Etapa</p>
                  <p className="font-semibold">{selectedLead.stageName ?? stages.find((s) => s.id === selectedLead.stage)?.name ?? "Sin etapa"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">Valor</p>
                  <p className="font-semibold">{selectedLead.dealValue ? `${selectedLead.currency ?? "MXN"} ${selectedLead.dealValue}` : "Sin valor"}</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="border border-slate-800 rounded-lg bg-black/20 p-3">
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Descripción</p>
                  <p className="text-sm text-white whitespace-pre-line">{selectedLead.description || selectedLead.summary || "Sin descripción"}</p>
                </div>
                <div className="border border-blue-800/60 rounded-lg bg-blue-950/20 p-3">
                  <p className="text-xs uppercase tracking-wider text-blue-200 mb-2">Última nota AI</p>
                  <p className="text-sm text-blue-50 whitespace-pre-line">{selectedLead.lastAiAuditNote || "No hay nota AI"}</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="border border-emerald-800/50 rounded-lg bg-emerald-950/20 p-3">
                  <p className="text-xs uppercase tracking-wider text-emerald-200 mb-2">Recordatorios activos</p>
                  {selectedLead.reminders?.length ? (
                    <ul className="space-y-2 text-sm text-emerald-50">
                      {selectedLead.reminders.map((r) => (
                        <li key={r.id} className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          <span className="flex-1">{r.text}</span>
                          <span className="text-xs text-emerald-200">{formatDateTime(r.dueAt)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-emerald-200">Sin recordatorios</p>
                  )}
                </div>

                <div className="border border-blue-700/50 rounded-lg bg-blue-950/20 p-4 flex flex-col gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-blue-200">Conversación</p>
                    <p className="text-sm text-blue-50">{selectedLead.conversationStatus ?? "Sin conversación"}</p>
                  </div>
                  <button
                    onClick={() => selectedLead.conversationId && window.open(`/portal/conversations?cid=${selectedLead.conversationId}`, "_blank")}
                    disabled={!selectedLead.conversationId}
                    className="rounded-md border border-blue-400/50 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-100 disabled:opacity-50"
                  >
                    Ir a la conversación
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        /* Scrollbars sutiles para vista de pipeline */
        .stealth-scroll {
          scrollbar-color: rgba(99, 102, 241, 0.6) transparent;
          scrollbar-width: thin;
        }
        .stealth-scroll::-webkit-scrollbar {
          height: 10px;
          width: 10px;
        }
        .stealth-scroll::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 9999px;
        }
        .stealth-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(120deg, rgba(99, 102, 241, 0.9), rgba(59, 130, 246, 0.9));
          border-radius: 9999px;
          border: 2px solid rgba(5, 6, 8, 0.9);
        }
        .stealth-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(120deg, rgba(124, 58, 237, 1), rgba(37, 99, 235, 1));
        }
      `}</style>
    </div>
  );
}
