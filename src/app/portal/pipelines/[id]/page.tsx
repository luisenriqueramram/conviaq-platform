'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Trash2, Phone, Mail, Calendar } from 'lucide-react';


          {stages.map((stage: Stage) => {
            const stageLeads = getLeadsInStage(stage.id);
              const stageWidth = Math.max(stageLeads.length * 110 + 24, 340);
  email: string;
  phone: string;
                <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-900/90 p-5 shadow-xl">
  date: string | null;
  tags?: Array<{ id: number; name: string; color: string | null; is_system: boolean }>;
                      <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">Etapa</p>
                      <h3 className="mt-2 text-lg font-semibold text-white">{stage.name}</h3>

type Stage = {
  id: number;
  name: string;
  color: string | null;
                  <button className="mt-4 w-full rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/40">
                    <Plus className="mr-2 inline h-4 w-4" /> Añadir lead


// El pipeline y leads se obtendrán de la API real


export default function PipelineFlowPage() {
                  className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 backdrop-blur-2xl shadow-inner space-y-3 min-h-[420px]"
  const router = useRouter();
  const pipelineId = params.id as string;

  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [pipelineName, setPipelineName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
                        className="group rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b1120] via-[#0f172a] to-[#0b1120] p-5 shadow-[0_20px_50px_rgba(5,8,20,0.55)] transition hover:-translate-y-1 hover:border-blue-500/60 cursor-pointer"

                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Oportunidad</p>
                            <h4 className="mt-1 text-lg font-semibold leading-tight text-white break-words">{lead.name}</h4>
                          </div>
                          <span className="text-xs text-slate-400 whitespace-nowrap">
                            {lead.date ? new Date(lead.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : 'Sin fecha'}
                          </span>
        setError(null);
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-200">
                          <div className="space-y-1">
                            <p className="text-[11px] uppercase tracking-widest text-slate-500">Correo</p>
                            <div className="flex items-center gap-2 text-[13px] text-white/90">
                              <Mail className="h-3.5 w-3.5 text-white/60" />
                              <span className="break-words leading-tight">{lead.email || 'Sin correo'}</span>
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
    };

    fetchPipeline();
  }, [pipelineId]);

                          className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 opacity-0 transition group-hover:opacity-100 hover:border-red-500/40 hover:text-red-200"
    return (
      <div className="p-8 text-center">
        <p className="text-slate-400">Pipeline inválido</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center gap-4 text-slate-400">
        <div className="h-12 w-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p>Cargando pipeline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      </div>
    );
  }

  if (!stages.length) {
    return (
      <div className="p-8 text-center space-y-2">
        <p className="text-white text-lg font-semibold">{pipelineName || 'Pipeline sin nombre'}</p>
        <p className="text-slate-400">Este pipeline todavía no tiene etapas configuradas.</p>
      </div>
    );
  }

  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (stageIndex: number) => {
    if (draggedLead) {
      setLeads(
        leads.map((lead: Lead) =>
          lead.id === draggedLead.id ? { ...lead, stage: stageIndex } : lead
        )
      );
      setDraggedLead(null);
    }
  };

  const handleDeleteLead = (id: number) => {
    setLeads(leads.filter((lead: Lead) => lead.id !== id));
    setSelectedLead(null);
  };

  const getLeadsInStage = (stageId: number) => {
    return leads.filter((lead: Lead) => lead.stage === stageId);
  };


  const totalLeads = leads.length;
  const hottestStage = stages.reduce<{ id: number | null; name: string; count: number }>(
    (acc, stage) => {
      const count = getLeadsInStage(stage.id).length;
      if (count > acc.count) return { id: stage.id, name: stage.name, count };
      return acc;
    },
    { id: null, name: 'Sin actividad', count: 0 }
  );
  const lastMovement = leads.reduce<string | null>((latest, lead) => {
    if (!lead.date) return latest;
    const iso = new Date(lead.date).toISOString();
    if (!latest || iso > latest) return iso;
    return latest;
  }, null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto max-w-[1500px] space-y-10 px-8 py-10">
        {/* Header */}
        <div className="rounded-3xl border border-white/5 bg-white/5 backdrop-blur-xl p-8 shadow-[0_30px_120px_rgba(14,19,48,0.45)]">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Pipeline activo</p>
              <h1 className="mt-3 text-4xl font-semibold text-white drop-shadow-sm">{pipelineName || 'Pipeline sin nombre'}</h1>
              <p className="mt-2 text-sm text-slate-400">Controla cada oportunidad con la visibilidad completa de tu funnel.</p>
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
              Última actualización: {new Date(lastMovement).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          )}
        </div>

        {/* Kanban Board */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-min">
          {stages.map((stage: Stage) => {
            const stageLeads = getLeadsInStage(stage.id);
              const stageWidth = Math.max(stageLeads.length * 120 + 32, 360);
            return (
              <div key={stage.id} className="flex-shrink-0" style={{ width: `${stageWidth}px` }}>
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-900/70 p-5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-400">Etapa</p>
                      <h3 className="mt-1 font-semibold text-white">{stage.name}</h3>
                    </div>
                    <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-slate-200">
                      {stageLeads.length}
                    </span>
                  </div>
                  <button className="mt-4 w-full rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:border-white/30">
                    <Plus className="mr-2 inline h-4 w-4" /> Añadir lead
                  </button>
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(stage.id)}
                  className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 backdrop-blur-lg shadow-inner space-y-3 min-h-[420px]"
                >
                  {stageLeads.length === 0 ? (
                    <div className="h-full rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-slate-500">
                      Arrastra leads aquí
                    </div>
                  ) : (
                    stageLeads.map((lead: Lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => handleDragStart(lead)}
                        onClick={() => setSelectedLead(lead)}
                        className="group rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-900/60 p-4 shadow-[0_15px_40px_rgba(5,9,22,0.45)] transition hover:-translate-y-1 hover:border-blue-500/60 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-base font-semibold text-white">{lead.name}</h4>
                          <span className="text-xs text-slate-500">{lead.date ? new Date(lead.date).toLocaleDateString('es-MX') : 'Sin fecha'}</span>
                        </div>
                        <div className="mt-3 space-y-1 text-xs text-slate-400">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{lead.email || 'Sin correo'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            <span>{lead.phone || 'Sin teléfono'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>{stage.name}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLead(lead.id);
                          }}
                          className="mt-3 w-full rounded-xl border border-transparent bg-white/5 px-3 py-1.5 text-xs text-slate-300 opacity-0 transition group-hover:opacity-100 hover:border-red-500/40 hover:text-red-300"
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

      {/* Side Panel - Lead Details */}
      {selectedLead && (
        <div className="fixed right-0 top-0 z-50 h-screen w-96 border-l border-white/10 bg-slate-950/95 p-6 shadow-[0_0_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
          <button
            onClick={() => setSelectedLead(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
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
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Email</p>
                <p className="text-white font-medium">{selectedLead.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Teléfono</p>
                <p className="text-white font-medium">{selectedLead.phone}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Fecha agregado</p>
                <p className="text-white font-medium">{selectedLead.date}</p>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-700 pt-6">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Cambiar etapa</p>
              <div className="space-y-2">
                {stages.map((stage) => (
                  <button
                    key={stage.id}
                    onClick={() => {
                      setLeads(
                        leads.map((l: Lead) =>
                          l.id === selectedLead!.id ? { ...l, stage: stage.id } : l
                        )
                      );
                      setSelectedLead({ ...selectedLead!, stage: stage.id });
                    }}
                    className={`w-full px-3 py-2 rounded-lg text-sm transition ${
                      selectedLead!.stage === stage.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
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
              <Trash2 className="h-4 w-4 inline mr-2" />
              Eliminar lead
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
