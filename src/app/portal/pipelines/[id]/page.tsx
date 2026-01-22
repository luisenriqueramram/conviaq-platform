'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Calendar, Mail, Phone, Plus, Trash2 } from 'lucide-react';

type Lead = {
  id: number;
  name: string;
  email: string;
  phone: string;
  stage: number | null;
  date: string | null;
  tags?: Array<{ id: number; name: string; color: string | null; is_system: boolean }>;
};

type Stage = {
  id: number;
  name: string;
  color: string | null;
  position: number;
};

export default function PipelineFlowPage() {
  const params = useParams();
  const router = useRouter();
  const pipelineId = params.id as string;

  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [pipelineName, setPipelineName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pipelineId) return;

    const fetchPipeline = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/pipelines/${pipelineId}/leads`);
        if (!res.ok) throw new Error('No pudimos cargar el pipeline');
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || 'Ocurrió un error al cargar el pipeline');

        setStages(json.data.stages || []);
        setLeads(json.data.leads || []);
        setPipelineName(json.data.pipelineName || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchPipeline();
  }, [pipelineId]);

  if (!pipelineId) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-400">Pipeline inválido</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 p-12 text-slate-400">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <p>Cargando pipeline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      </div>
    );
  }

  if (!stages.length) {
    return (
      <div className="space-y-2 p-8 text-center">
        <p className="text-lg font-semibold text-white">{pipelineName || 'Pipeline sin nombre'}</p>
        <p className="text-slate-400">Este pipeline todavía no tiene etapas configuradas.</p>
      </div>
    );
  }

  const handleDragStart = (lead: Lead) => setDraggedLead(lead);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (stageId: number) => {
    if (!draggedLead) return;
    setLeads((prev) =>
      prev.map((lead) => (lead.id === draggedLead.id ? { ...lead, stage: stageId } : lead))
    );
    setDraggedLead(null);
  };

  const handleDeleteLead = (id: number) => {
    setLeads((prev) => prev.filter((lead) => lead.id !== id));
    setSelectedLead(null);
  };

  const getLeadsInStage = (stageId: number) => leads.filter((lead) => lead.stage === stageId);

  const totalLeads = leads.length;
  const hottestStage = stages.reduce<{ id: number | null; name: string; count: number }>(
    (acc, stage) => {
      const count = getLeadsInStage(stage.id).length;
      return count > acc.count ? { id: stage.id, name: stage.name, count } : acc;
    },
    { id: null, name: 'Sin actividad', count: 0 }
  );
  const lastMovement = leads.reduce<string | null>((latest, lead) => {
    if (!lead.date) return latest;
    const iso = new Date(lead.date).toISOString();
    return !latest || iso > latest ? iso : latest;
  }, null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto max-w-[1500px] space-y-10 px-8 py-10">
        <div className="rounded-3xl border border-white/5 bg-white/5 p-8 shadow-[0_30px_120px_rgba(14,19,48,0.45)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Pipeline activo</p>
              <h1 className="mt-3 text-4xl font-semibold text-white drop-shadow-sm">
                {pipelineName || 'Pipeline sin nombre'}
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Controla cada oportunidad con la visibilidad completa de tu funnel.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-center">
                <p className="text-xs uppercase tracking-widest text-slate-400">Leads</p>
                <p className="mt-2 text-3xl font-bold text-white">{totalLeads}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-center">
                <p className="text-xs uppercase tracking-widest text-slate-400">Etapas</p>
                <p className="mt-2 text-3xl font-bold text-white">{stages.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-center">
                <p className="text-xs uppercase tracking-widest text-slate-400">Más activo</p>
                <p className="mt-2 text-sm font-semibold text-white">{hottestStage.name}</p>
                <p className="text-xs text-slate-400">{hottestStage.count} lead(s)</p>
              </div>
            </div>
          </div>
          {lastMovement && (
            <div className="mt-6 text-xs text-slate-400">
              Última actualización:{' '}
              {new Date(lastMovement).toLocaleString('es-MX', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </div>
          )}
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="flex min-w-min gap-6">
            {stages.map((stage) => {
              const stageLeads = getLeadsInStage(stage.id);
              const dynamicWidth = stageLeads.length * 90 + 260;
              const stageWidth = Math.max(340, Math.min(420, dynamicWidth)); // clamp columnas para evitar saltos extremos
              return (
                <div key={stage.id} className="flex-shrink-0" style={{ width: `${stageWidth}px` }}>
                  <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-900/90 p-5 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">Etapa</p>
                        <h3 className="mt-2 text-lg font-semibold text-white">{stage.name}</h3>
                      </div>
                      <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-slate-200">
                        {stageLeads.length}
                      </span>
                    </div>
                    <button className="mt-4 w-full rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/40">
                      <Plus className="mr-2 inline h-4 w-4" /> Añadir lead
                    </button>
                  </div>

                  <div
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(stage.id)}
                    className="mt-4 min-h-[420px] space-y-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-inner backdrop-blur-2xl"
                  >
                    {stageLeads.length === 0 ? (
                      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-500">
                        Arrastra leads aquí
                      </div>
                    ) : (
                      stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={() => handleDragStart(lead)}
                          onClick={() => setSelectedLead(lead)}
                          className="group cursor-pointer rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b1120] via-[#0f172a] to-[#0b1120] p-5 shadow-[0_20px_50px_rgba(5,8,20,0.55)] transition hover:-translate-y-1 hover:border-blue-500/60"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Oportunidad</p>
                              <h4 className="mt-1 break-words text-lg font-semibold leading-tight text-white">
                                {lead.name}
                              </h4>
                            </div>
                            <span className="whitespace-nowrap text-xs text-slate-400">
                              {lead.date
                                ? new Date(lead.date).toLocaleDateString('es-MX', {
                                    day: '2-digit',
                                    month: 'short',
                                  })
                                : 'Sin fecha'}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-200">
                            <div className="space-y-1">
                              <p className="text-[11px] uppercase tracking-widest text-slate-500">Correo</p>
                              <div className="flex items-center gap-2 text-[13px] text-white/90">
                                <Mail className="h-3.5 w-3.5 text-white/60" />
                                <span className="break-words leading-tight">
                                  {lead.email || 'Sin correo'}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[11px] uppercase tracking-widest text-slate-500">Teléfono</p>
                              <div className="flex items-center gap-2 text-[13px] text-white/90">
                                <Phone className="h-3.5 w-3.5 text-white/60" />
                                <span className="leading-tight">{lead.phone || 'Sin teléfono'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-slate-300">
                              <Calendar className="h-3 w-3" /> {stage.name}
                            </div>
                            {lead.tags && lead.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {lead.tags.slice(0, 2).map((tag) => (
                                  <span
                                    key={tag.id}
                                    className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[11px] text-white/80"
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                                {lead.tags.length > 2 && (
                                  <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[11px] text-white/60">
                                    +{lead.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLead(lead.id);
                            }}
                            className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 opacity-0 transition group-hover:opacity-100 hover:border-red-500/40 hover:text-red-200"
                          >
                            <Trash2 className="mr-1 inline h-3 w-3" /> Eliminar
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedLead && (
          <div className="fixed right-0 top-0 z-50 h-screen w-96 border-l border-white/10 bg-slate-950/95 p-6 shadow-[0_0_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
            <button
              onClick={() => setSelectedLead(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>

            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Lead seleccionado</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">{selectedLead.name}</h2>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-200">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  {stages.find((stage) => stage.id === selectedLead.stage)?.name ?? 'Sin etapa'}
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-700 pt-6">
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-slate-400">Email</p>
                  <p className="font-medium text-white">{selectedLead.email}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-slate-400">Teléfono</p>
                  <p className="font-medium text-white">{selectedLead.phone}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-slate-400">Fecha agregado</p>
                  <p className="font-medium text-white">{selectedLead.date}</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-700 pt-6">
                <p className="mb-3 text-xs uppercase tracking-wider text-slate-400">Cambiar etapa</p>
                <div className="space-y-2">
                  {stages.map((stage) => (
                    <button
                      key={stage.id}
                      onClick={() => {
                        setLeads((prev) =>
                          prev.map((lead) =>
                            lead.id === selectedLead.id ? { ...lead, stage: stage.id } : lead
                          )
                        );
                        setSelectedLead({ ...selectedLead, stage: stage.id });
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-sm transition ${
                        selectedLead.stage === stage.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {stage.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleDeleteLead(selectedLead.id)}
                className="mt-6 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:border-red-500/60 hover:bg-red-500/20"
              >
                <Trash2 className="mr-2 inline h-4 w-4" /> Eliminar lead
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
