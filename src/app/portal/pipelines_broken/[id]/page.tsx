"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, Loader2 } from "lucide-react";

type Lead = {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  stage?: number | null;
  date?: string | null;
  replied?: boolean;
  conversationStatus?: string | null;
  aiForceOff?: boolean;
  waJid?: string | null;
  tags?: Array<{ id: number; name: string }>;
  confidence?: number | null;
  lastContactMessageAt?: string | null;
};

type Stage = {
  id: number;
  name: string;
  color?: string | null;
  stage_order?: number | null;
};

type StageMetadata = {
  id: number;
  t_order?: number | null;
};

const getInitials = (value?: string | null) => {
  if (!value) return "..";
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("")
    .padEnd(2, ".");
};

const formatShortDate = (value?: string | null) => {
  if (!value) return "Sin fecha";
  try {
    return new Date(value).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
  } catch {
    return "Sin fecha";
  }
};

export default function PipelineFlowPage() {
  const params = useParams();
  const pipelineId = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;

  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeadLoading, setSelectedLeadLoading] = useState(false);
  const [updatingLeadId, setUpdatingLeadId] = useState<number | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [showStagePicker, setShowStagePicker] = useState(false);
  const [universalStageIds, setUniversalStageIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!pipelineId) return;
    const fetchPipeline = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/pipelines/${pipelineId}/leads`);
        if (!res.ok) throw new Error("No pudimos cargar el pipeline");
        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error || "Error desconocido");
        setStages(json.data?.stages || []);
        setLeads(json.data?.leads || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar pipeline");
      } finally {
        setLoading(false);
      }
    };

    fetchPipeline();
  }, [pipelineId]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch("/api/config/metadata");
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        const stageMeta = Array.isArray(json?.data?.stages) ? (json.data.stages as StageMetadata[]) : [];
        if (!stageMeta.length) return;
        const universalIds = new Set<number>(stageMeta.filter((stage) => stage.t_order === 0).map((stage) => stage.id));
        setUniversalStageIds(universalIds);
      } catch {
        // ignore metadata errors
      }
    };

    fetchMetadata();
  }, []);

  const orderedStages = useMemo(() => {
    if (!stages.length) return [];
    return [...stages].sort((a, b) => {
      const orderA = typeof a.stage_order === "number" ? a.stage_order : Number.MAX_SAFE_INTEGER;
      const orderB = typeof b.stage_order === "number" ? b.stage_order : Number.MAX_SAFE_INTEGER;
      if (orderA === orderB) return a.name.localeCompare(b.name);
      return orderA - orderB;
    });
  }, [stages]);

  const getLeadsInStage = (stageId: number) => {
    return leads
      .filter((lead) => lead.stage === stageId)
      .sort((a, b) => {
        const confA = typeof a.confidence === "number" ? a.confidence : -1;
        const confB = typeof b.confidence === "number" ? b.confidence : -1;
        if (confA !== confB) return confB - confA;
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
  };

  const openLeadDetails = async (lead: Lead) => {
    setSelectedLeadLoading(true);
    setSelectedLead(lead);
    try {
      const res = await fetch(`/api/leads/${lead.id}`);
      if (!res.ok) return;
      const json = await res.json().catch(() => null);
      if (!json?.ok) return;
      setSelectedLead((prev) => ({ ...(prev ?? {}), ...json.data } as Lead));
    } catch {
      // ignoring detail errors keeps drawer usable with cached data
    } finally {
      setSelectedLeadLoading(false);
    }
  };

  const persistStageChange = async (leadId: number, nextStageId: number, previousStageId: number | null) => {
    setUpdatingLeadId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: nextStageId }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "No pudimos actualizar el lead");
      }
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : "Movimiento no guardado");
      setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, stage: previousStageId } : lead)));
      setSelectedLead((current) => (current && current.id === leadId ? { ...current, stage: previousStageId } : current));
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const changeLeadStage = async (leadId: number, stageId: number) => {
    const previous = leads.find((lead) => lead.id === leadId)?.stage ?? null;
    setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, stage: stageId } : lead)));
    setSelectedLead((current) => (current && current.id === leadId ? { ...current, stage: stageId } : current));
    await persistStageChange(leadId, stageId, previous);
  };

  if (!pipelineId) {
    return (
      <div className="p-10 text-center text-slate-400">
        <p>Pipeline invalido</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 p-12 text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin text-white/70" />
        <p>Cargando pipeline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      </div>
    );
  }

  if (!orderedStages.length) {
    return (
      <div className="p-10 text-center text-slate-400">
        <p>Este pipeline todavia no tiene etapas configuradas.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050608] text-white">
      <div className="mx-auto max-w-[1400px] space-y-6 px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">Pipeline</p>
            <h1 className="text-2xl font-semibold text-white/90">{pipelineId}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/70">
            <span>Leads totales {leads.length}</span>
            <span className="text-white/20">|</span>
            <span>Etapas {orderedStages.length}</span>
          </div>
        </header>

        {moveError && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            <div className="flex items-center justify-between">
              <span>{moveError}</span>
              <button onClick={() => setMoveError(null)} className="text-xs uppercase tracking-[0.3em] text-red-200">
                Cerrar
              </button>
            </div>
          </div>
        )}

        <div className="stealth-scroll overflow-x-auto pb-6">
          <div className="flex min-w-min gap-5 pr-6">
            {orderedStages.map((stage) => {
              const stageLeads = getLeadsInStage(stage.id);
              const minWidth = Math.max(360, stageLeads.length * 90 + 240);
              return (
                <div key={stage.id} className="flex-shrink-0" style={{ width: `${minWidth}px` }}>
                  <div className="rounded-[24px] border border-white/5 bg-white/5 px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white/80 break-words whitespace-pre-line">
                          {stage.name}
                        </p>
                        {universalStageIds.has(stage.id) && (
                          <span className="mt-1 inline-flex items-center gap-1 text-xs text-white/40">
                            <Globe className="h-3 w-3" /> Universal
                          </span>
                        )}
                      </div>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
                        {String(stageLeads.length).padStart(2, "0")}
                      </span>
                    </div>
                  </div>

                  <div className="stealth-scroll mt-3 h-[62vh] space-y-3 overflow-y-auto rounded-[24px] border border-white/5 bg-white/5 px-4 py-4">
                    <AnimatePresence>
                      {stageLeads.length === 0 && (
                        <motion.div
                          key="empty"
                          initial={{ opacity: 0.4 }}
                          animate={{ opacity: 0.9 }}
                          exit={{ opacity: 0 }}
                          className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 text-center text-sm text-white/40"
                        >
                          Sin leads en esta etapa
                        </motion.div>
                      )}

                      {stageLeads.map((lead) => {
                        const isUpdating = updatingLeadId === lead.id;
                        return (
                          <motion.button
                            key={lead.id}
                            type="button"
                            layoutId={`lead-${lead.id}`}
                            layout
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ layout: { duration: 0.2 } }}
                            onClick={() => openLeadDetails(lead)}
                            className={`group w-full rounded-3xl border border-white/10 bg-[#090d14]/80 p-4 text-left shadow-[0_12px_30px_rgba(0,0,0,0.45)] transition ${
                              isUpdating ? "opacity-60" : "hover:-translate-y-1 hover:border-white/30"
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs text-white/50">
                              <span>{formatShortDate(lead.date)}</span>
                              {typeof lead.confidence === "number" && (
                                <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px]">
                                  {lead.confidence}%
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white/80">
                                {getInitials(lead.name)}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-white/90">{lead.name}</p>
                                <p className="text-xs text-white/50">{lead.phone || lead.email || "Sin contacto"}</p>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/60">
                              {lead.replied ? (
                                <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-green-200">Respondido</span>
                              ) : (
                                <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-yellow-100">Sin respuesta</span>
                              )}
                              {lead.conversationStatus && (
                                <span className="rounded-full border border-white/10 px-2 py-0.5">{lead.conversationStatus}</span>
                              )}
                              {lead.aiForceOff && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-red-200">IA apagada</span>}
                              {lead.tags?.slice(0, 2).map((tag) => (
                                <span key={tag.id} className="rounded-full border border-white/10 px-2 py-0.5">
                                  {tag.name}
                                </span>
                              ))}
                              {lead.tags && lead.tags.length > 2 && (
                                <span className="rounded-full border border-white/10 px-2 py-0.5">+{lead.tags.length - 2}</span>
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedLead && (
          <motion.div
            key="drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex"
          >
            <button className="flex-1 bg-black/40" onClick={() => setSelectedLead(null)} aria-label="Cerrar" />
            <motion.aside
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              transition={{ type: "spring", stiffness: 200, damping: 30 }}
              className="flex w-full max-w-md flex-col border-l border-white/10 bg-slate-950/95 p-6 text-sm shadow-[0_0_60px_rgba(0,0,0,0.65)] backdrop-blur"
            >
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Lead seleccionado</p>
                  <h2 className="mt-2 text-2xl text-white">{selectedLead.name}</h2>
                  <p className="text-sm text-white/60">
                    {selectedLead.phone || selectedLead.email || selectedLead.waJid || "Sin contacto"}
                  </p>
                </div>
                <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-slate-200">
                  ✕
                </button>
              </div>

              <div className="space-y-3 border-t border-slate-800 pt-4">
                <div>
                  <p className="mb-1 text-xs uppercase tracking-[0.3em] text-slate-500">Etapa</p>
                  <p className="text-base font-semibold text-white">{stages.find((stage) => stage.id === selectedLead.stage)?.name || "Sin etapa"}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-[0.3em] text-slate-500">Conversacion</p>
                  <p className="text-white/80">{selectedLead.conversationStatus || "Sin conversacion"}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-[0.3em] text-slate-500">Ultimo contacto</p>
                  <p className="text-white/80">{selectedLead.lastContactMessageAt ? new Date(selectedLead.lastContactMessageAt).toLocaleString("es-MX") : "-"}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3 border-t border-slate-800 pt-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Actualizar etapa</p>
                <button
                  onClick={() => setShowStagePicker((value) => !value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white/80 hover:border-white/20"
                >
                  {showStagePicker ? "Ocultar etapas" : "Seleccionar etapa"}
                </button>
                {showStagePicker && (
                  <div className="max-h-60 space-y-2 overflow-y-auto pr-2">
                    {orderedStages.map((stage) => (
                      <button
                        key={stage.id}
                        disabled={updatingLeadId === selectedLead.id}
                        onClick={() => changeLeadStage(selectedLead.id, stage.id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                          selectedLead.stage === stage.id
                            ? "border-blue-400 bg-blue-500/10 text-blue-100"
                            : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
                        } ${updatingLeadId === selectedLead.id ? "opacity-60" : ""}`}
                      >
                        {stage.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedLead.tags && selectedLead.tags.length > 0 && (
                <div className="mt-6 space-y-2 border-t border-slate-800 pt-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Etiquetas</p>
                  <div className="flex flex-wrap gap-2 text-xs text-white/70">
                    {selectedLead.tags.map((tag) => (
                      <span key={tag.id} className="rounded-full border border-white/10 px-3 py-1">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-6">
                <button
                  onClick={() => setSelectedLead(null)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:border-white/30 hover:bg-white/10"
                >
                  Cerrar
                </button>
              </div>

              {selectedLeadLoading && (
                <div className="mt-4 flex items-center gap-2 text-xs text-white/50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Actualizando informacion
                </div>
              )}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
