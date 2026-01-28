"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Lead = { id: number; name: string; phone?: string | null; email?: string | null; stage?: number | null };
type Stage = { id: number; name: string };

export default function PipelineFlowPage() {
  const params = useParams();
  const pipelineId = params?.id as string | undefined;

  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (!pipelineId) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/pipelines/${pipelineId}/leads`);
        if (!mounted) return;
        const json = await res.json().catch(() => null);
        setStages(json?.data?.stages || []);
        setLeads(json?.data?.leads || []);
      } catch (e) {
        if (!mounted) return;
        setError(String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [pipelineId]);

  if (!pipelineId) return <div className="p-8">Pipeline inválido</div>;
  if (loading) return <div className="p-8">Cargando pipeline...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  const getLeadsInStage = (stageId: number) => leads.filter(l => l.stage === stageId);

  return (
    <div className="min-h-screen bg-[#050608] text-white p-6">
      <div className="mx-auto max-w-[1200px]">
        <h1 className="text-2xl mb-4">Pipeline {pipelineId}</h1>

        <div className="overflow-x-auto">
          <div className="flex gap-6">
            {stages.map(s => (
              <div key={s.id} className="min-w-[300px]">
                <div className="rounded-lg bg-white/5 p-3 mb-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-sm text-white/60">{getLeadsInStage(s.id).length}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {getLeadsInStage(s.id).map(lead => (
                    <div key={lead.id} className="rounded-lg bg-[#090d14]/80 p-3 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-xs text-white/60">{lead.phone || lead.email || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedLead(null)} />
            <div className="relative z-10 w-[720px] max-w-full rounded-lg bg-slate-950 p-6">
              <h2 className="text-xl font-semibold">{selectedLead.name}</h2>
              <p className="text-sm text-white/60">{selectedLead.phone || selectedLead.email}</p>
              <div className="mt-4">
                <button onClick={() => setSelectedLead(null)} className="px-3 py-2 bg-white/5 rounded">Cerrar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Lead = { id: number; name: string; phone?: string | null; email?: string | null; stage?: number | null };
type Stage = { id: number; name: string };

export default function PipelineFlowPage() {
  const params = useParams();
  const pipelineId = params?.id as string | undefined;

  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (!pipelineId) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/pipelines/${pipelineId}/leads`);
        if (!mounted) return;
        const json = await res.json().catch(() => null);
        setStages(json?.data?.stages || []);
        setLeads(json?.data?.leads || []);
      } catch (e) {
        if (!mounted) return;
        setError(String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [pipelineId]);

  if (!pipelineId) return <div className="p-8">Pipeline inválido</div>;
  if (loading) return <div className="p-8">Cargando pipeline...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  const getLeadsInStage = (stageId: number) => leads.filter(l => l.stage === stageId);

  return (
    <div className="min-h-screen bg-[#050608] text-white p-6">
      <div className="mx-auto max-w-[1200px]">
        <h1 className="text-2xl mb-4">Pipeline {pipelineId}</h1>

        <div className="overflow-x-auto">
          <div className="flex gap-6">
            {stages.map(s => (
              <div key={s.id} className="min-w-[300px]">
                <div className="rounded-lg bg-white/5 p-3 mb-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-sm text-white/60">{getLeadsInStage(s.id).length}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {getLeadsInStage(s.id).map(lead => (
                    <div key={lead.id} className="rounded-lg bg-[#090d14]/80 p-3 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-xs text-white/60">{lead.phone || lead.email || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedLead(null)} />
            <div className="relative z-10 w-[720px] max-w-full rounded-lg bg-slate-950 p-6">
              <h2 className="text-xl font-semibold">{selectedLead.name}</h2>
              <p className="text-sm text-white/60">{selectedLead.phone || selectedLead.email}</p>
              <div className="mt-4">
                <button onClick={() => setSelectedLead(null)} className="px-3 py-2 bg-white/5 rounded">Cerrar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Lead = { id: number; name: string; phone?: string | null; email?: string | null; stage?: number | null };
type Stage = { id: number; name: string };

export default function PipelineFlowPage() {
  const params = useParams();
  const pipelineId = params?.id as string | undefined;

  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (!pipelineId) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/pipelines/${pipelineId}/leads`);
        const json = await res.json().catch(() => null);
        if (!mounted) return;
        setStages(json?.data?.stages || []);
        setLeads(json?.data?.leads || []);
      } catch (e) {
        if (!mounted) return;
        setError(String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [pipelineId]);

  if (!pipelineId) return <div className="p-8">Pipeline inválido</div>;
  if (loading) return <div className="p-8">Cargando pipeline...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  const getLeadsInStage = (stageId: number) => leads.filter(l => l.stage === stageId);

  return (
    <div className="min-h-screen bg-[#050608] text-white p-6">
      <div className="mx-auto max-w-[1200px]">
        <h1 className="text-2xl mb-4">Pipeline {pipelineId}</h1>

        <div className="overflow-x-auto">
          <div className="flex gap-6">
            {stages.map(s => (
              <div key={s.id} className="min-w-[300px]">
                <div className="rounded-lg bg-white/5 p-3 mb-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-sm text-white/60">{getLeadsInStage(s.id).length}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {getLeadsInStage(s.id).map(lead => (
                    <div key={lead.id} className="rounded-lg bg-[#090d14]/80 p-3 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-xs text-white/60">{lead.phone || lead.email || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedLead(null)} />
            <div className="relative z-10 w-[720px] max-w-full rounded-lg bg-slate-950 p-6">
              <h2 className="text-xl font-semibold">{selectedLead.name}</h2>
              <p className="text-sm text-white/60">{selectedLead.phone || selectedLead.email}</p>
              <div className="mt-4">
                <button onClick={() => setSelectedLead(null)} className="px-3 py-2 bg-white/5 rounded">Cerrar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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
  tags?: Array<{ id: number; name: string }>;
  confidence?: number;
};

type Stage = {
  id: number;
  name: string;
  color?: string | null;
  stage_order?: number | null;
};

export default function PipelineFlowPage() {
  const params = useParams();
  const pipelineId = params?.id as string | undefined;

  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (!pipelineId) return;
    let mounted = true;
    const fetchPipeline = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/pipelines/${pipelineId}/leads`);
        if (!res.ok) throw new Error("failed");
        const json = await res.json();
        if (!mounted) return;
        setStages(json?.data?.stages || []);
        setLeads(json?.data?.leads || []);
      } catch (e) {
        if (!mounted) return;
        setError(String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchPipeline();

const getInitials = (value: string) => {
  if (!value) return '•';
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? '')
    .join('')
    .padEnd(2, '•');
};

const formatShortDate = (value: string | null) => {
  if (!value) return 'Sin fecha';
  try {
    return new Date(value).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  } catch (err) {
    return 'Sin fecha';
  }
};

export default function PipelineFlowPage() {
  const params = useParams();
  const pipelineId = params.id as string;

  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeadLoading, setSelectedLeadLoading] = useState(false);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movingLeadId, setMovingLeadId] = useState<number | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [orderSaving, setOrderSaving] = useState(false);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [editOrder, setEditOrder] = useState(false);
  const [draggedStageId, setDraggedStageId] = useState<number | null>(null);
  const [universalStageIds, setUniversalStageIds] = useState<Set<number>>(new Set());
  // Nuevo: stages filtrados y ordenados según stage_order
  const orderedStages = React.useMemo(() => {
    // Solo mostrar stages que tienen stage_order definido (los que aparecen en la tabla de stage_order)
    return stages
      .filter(s => typeof (s as any).stage_order === 'number')
      .sort((a, b) => ((a as any).stage_order ?? 9999) - ((b as any).stage_order ?? 9999));
  }, [stages]);

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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchPipeline();
  }, [pipelineId]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch('/api/config/metadata');
        if (!res.ok) return;
        const json = await res.json();
        const stagesMeta: Array<{ id: number; name: string; color: string; position: number; t_order: number }>
          = json?.data?.stages || [];
        const universalIds = new Set<number>(
          stagesMeta.filter((s) => s.t_order === 0).map((s) => s.id)
        );
        setUniversalStageIds(universalIds);
      } catch (e) {
        // silencio
      }
    };
    fetchMetadata();
  }, []);

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
        <p className="text-lg font-semibold text-white">Pipeline</p>
        <p className="text-slate-400">Este pipeline todavía no tiene etapas configuradas.</p>
      </div>
    );
  }

  const handleDragStartLead = (lead: Lead) => setDraggedLead(lead);
  const handleDragOverLead = (e: React.DragEvent) => e.preventDefault();

  const persistStageChange = async (
    leadId: number,
    nextStageId: number,
    previousStageId: number | null
  ) => {
    setMoveError(null);
    setMovingLeadId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: nextStageId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'No pudimos actualizar el lead.');
      }
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : 'Movimiento no guardado.');
      setLeads((prev) =>
        prev.map((lead) => (lead.id === leadId ? { ...lead, stage: previousStageId } : lead))
      );
      setSelectedLead((current) =>
        current && current.id === leadId ? { ...current, stage: previousStageId } : current
      );
    } finally {
      setMovingLeadId(null);
    }
  };

  // Change lead stage with mapping: if target stage belongs to another pipeline (eg universal),
  // try to find an equivalent local stage by stage_key or name. If not found, show error.
  const changeLeadStage = async (leadId: number, targetStage: any) => {
    const previous = leads.find(l => l.id === leadId)?.stage ?? null;

    // Allow using the target stage id directly (server will accept universal stages or map/create equivalents)
    const useStageId: number = targetStage.id;

    // Optimistic UI update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: useStageId } : l));
    setSelectedLead((current) => current && current.id === leadId ? { ...current, stage: useStageId } : current);

    // Persist
    await persistStageChange(leadId, useStageId, previous);
  };

  const handleDropLead = (stageId: number) => {
    if (!draggedLead || editOrder) return;
    const leadId = draggedLead.id;
    const previousStage = draggedLead.stage;
    // Map stageId to actual pipeline-local stage if needed
    const targetStage = stages.find(s => s.id === stageId) as any;
    setDraggedLead(null);
    if (!targetStage) {
      setMoveError('Etapa no encontrada');
      setTimeout(() => setMoveError(null), 3000);
      return;
    }
    changeLeadStage(leadId, targetStage);
  };

  // Fetch full lead details and open drawer
  const [showModal, setShowModal] = useState(false);

  const openLeadDetails = async (leadShort: Lead) => {
    try {
      setSelectedLeadLoading(true);
      setSelectedLead(leadShort); // optimistic
      const res = await fetch(`/api/leads/${leadShort.id}`);
      if (!res.ok) return;
      const json = await res.json().catch(() => null);
      if (!json?.ok) return;
      const full = json.data;
      // Merge and ensure fields exist
      setSelectedLead((prev) => ({ ...(prev ?? {}), ...full } as any));
    } catch (e) {
      // ignore
    } finally {
      setSelectedLeadLoading(false);
    }
  };

  const getLeadsInStage = (stageId: number) => {
    return leads
      .filter((lead) => lead.stage === stageId)
      .sort((a, b) => {
        // Primero por confidence descendente
        const confA = typeof a.confidence === 'number' ? a.confidence : -1;
        const confB = typeof b.confidence === 'number' ? b.confidence : -1;
        if (confB !== confA) return confB - confA;
        // Luego por fecha descendente
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
    { id: null, name: 'Sin actividad', count: 0 }
  );

  const saveStageOrder = async () => {
    setOrderMessage(null);
    setOrderSaving(true);
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/stages/order`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageIds: stages.map((s) => s.id) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'No pudimos guardar el orden.');
      }
      setOrderMessage('Orden guardado');
      setEditOrder(false);
    } catch (err) {
      setOrderMessage(err instanceof Error ? err.message : 'Error al guardar el orden');
    } finally {
      setOrderSaving(false);
      setTimeout(() => setOrderMessage(null), 4000);
    }
  };

  const handleStageDragStart = (stageId: number) => {
    if (!editOrder) return;
    setDraggedStageId(stageId);
  };

  const handleStageDrop = (targetStageId: number) => {
    if (!editOrder || draggedStageId == null) return;
    if (draggedStageId === targetStageId) return;
    const fromIndex = stages.findIndex((s) => s.id === draggedStageId);
    const toIndex = stages.findIndex((s) => s.id === targetStageId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...stages];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setStages(next);
    setDraggedStageId(null);
  };

  return (
    <div className="min-h-screen bg-[#050608] text-white text-[15px]">
      <div className="mx-auto max-w-[1380px] space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
            <button className="rounded-xl border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/80 hover:text-white">
              + Registrar lead
            </button>
            {!editOrder && (
              <>
                <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 flex flex-col items-start min-w-[100px]">
                  <span className="text-[9px] uppercase tracking-widest text-white/35">Más activo</span>
                  <span className="text-[13px] font-medium text-white/80 leading-tight">{hottestStage.name}</span>
                  <span className="text-[10px] text-white/45">{hottestStage.count}</span>
                </div>
                <div className="rounded-xl border border-green-400/30 bg-green-500/10 px-2 py-1 flex flex-col items-start min-w-[100px]">
                  <span className="text-[9px] uppercase tracking-widest text-green-300/80">Ganado 30 días</span>
                  <span className="text-[13px] font-semibold text-green-200 leading-tight">$12,500</span>
                </div>
                <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/10 px-2 py-1 flex flex-col items-start min-w-[100px]">
                  <span className="text-[9px] uppercase tracking-widest text-yellow-200/80">En cotización</span>
                  <span className="text-[13px] font-semibold text-yellow-100 leading-tight">$8,200</span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!editOrder && (
              <button
                onClick={() => setEditOrder(true)}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/70 hover:text-white"
              >
                Editar orden
              </button>
            )}
            {editOrder && (
              <>
                <button
                  onClick={saveStageOrder}
                  disabled={orderSaving}
                  className="rounded-xl border border-blue-400/40 bg-blue-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-blue-200 hover:text-blue-100 disabled:opacity-50"
                >
                  {orderSaving ? 'Guardando…' : 'Guardar orden'}
                </button>
                <button
                  onClick={() => { setEditOrder(false); setDraggedStageId(null); }}
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/70 hover:text-white"
                >
                  Cancelar
                </button>
              </>
            )}
            {orderMessage && (
              <span className="text-xs text-white/50">{orderMessage}</span>
            )}
          </div>
        </div>

        {moveError && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100 shadow-lg">
            <div className="flex items-center justify-between gap-4">
              <span>{moveError}</span>
              <button
                onClick={() => setMoveError(null)}
                className="text-xs uppercase tracking-[0.3em] text-red-200 hover:text-red-100"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

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
                  onDragStart={() => handleStageDragStart(stage.id)}
                  onDragOver={(e) => editOrder ? e.preventDefault() : undefined}
                  onDrop={() => editOrder ? handleStageDrop(stage.id) : undefined}
                >
                  <div className="rounded-[24px] border border-white/5 bg-white/5 px-5 py-3">
                    <div className="flex items-center justify-between">
                      <div className="text-white/70">
                        <h3 className="flex items-center gap-2 text-base font-medium break-words whitespace-pre-line max-h-[2.6em] leading-tight overflow-hidden">
                          {stage.name.replace(/oportunidad/gi, '').trim()}
                          {universalStageIds.has(stage.id) ? (
                            <span className="text-white/30" title="Universal">
                              <Globe className="h-4 w-4" />
                            </span>
                          ) : null}
                        </h3>
                      </div>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/60">
                        {String(stageLeads.length).padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  <div
                    onDragOver={!editOrder ? handleDragOverLead : undefined}
                    onDrop={!editOrder ? (() => handleDropLead(stage.id)) : undefined}
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
                              draggable={true}
                              transition={{ layout: { type: 'spring', bounce: 0.25, duration: 0.35 } }}
                              initial={{ scale: 0.98, opacity: 0.7, y: 10 }}
                              animate={{ scale: 1, opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } }}
                              exit={{ scale: 0.95, opacity: 0, y: 20, transition: { duration: 0.15 } }}
                              onDragStart={() => handleDragStartLead(lead)}
                              onClick={() => openLeadDetails(lead)}
                              className={`group rounded-3xl border border-white/10 bg-[#090d14]/80 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-white/30 ${
                                isMoving || editOrder ? 'opacity-60 pointer-events-none' : 'cursor-pointer'
                              }`}
                            >

                            {/* Temperatura visual */}

                            {(() => {
                              // Buscar la etapa actual del lead
                              const stage = stages.find(s => s.id === lead.stage);
                              const isGanado = stage && stage.is_final && /ganado/i.test(stage.name);
                              if (isGanado) {
                                return (
                                  <div className="mb-1 flex items-center gap-2 rounded-xl px-2 py-1 text-xs font-semibold text-white/90 border border-green-400/40 bg-gradient-to-r from-green-500/80 to-green-700/80">
                                    🏆 <span>Ganado</span>
                                  </div>
                                );
                              }
                              let tempColor = 'bg-slate-900 border-white/10';
                              let tempText = '';
                              let tempEmoji = '';
                              if (lead.confidence >= 80) {
                                tempColor = 'bg-gradient-to-r from-orange-500/80 to-red-600/80 border-orange-400/40';
                                tempText = '¡HOT!';
                                tempEmoji = '🔥';
                              } else if (lead.confidence >= 60) {
                                tempColor = 'bg-gradient-to-r from-yellow-400/80 to-orange-400/80 border-yellow-300/40';
                                tempText = 'Tibio';
                                tempEmoji = '🌤️';
                              } else if (lead.confidence >= 30) {
                                tempColor = 'bg-gradient-to-r from-blue-400/80 to-sky-500/80 border-blue-300/40';
                                tempText = 'Frío';
                                tempEmoji = '🧊';
                              }
                              return (
                                <div className={`mb-1 flex items-center gap-2 rounded-xl px-2 py-1 text-xs font-semibold text-white/90 border ${tempColor}`}> 
                                  {tempEmoji} <span>{tempText}</span> <span className="ml-1 text-white/60">{lead.confidence ?? '--'}%</span>
                                </div>
                              );
                            })()}

                            <div className="flex flex-col gap-1 items-start w-full">
                              <span className="block w-full truncate text-lg font-bold text-white/90 leading-tight">{lead.phone || 'Sin teléfono'}</span>
                              <span className="block w-full text-[16px] text-white/80 leading-snug">{lead.name.replace(/oportunidad[:]?/gi, '').trim()}</span>
                              <span className="block w-full text-right text-[10px] text-white/40">{formatShortDate(lead.date)}</span>
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
                                  <span
                                    key={tag.id}
                                    className="rounded-full border border-white/10 bg-transparent px-2 py-0.5 text-[11px]"
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                                {lead.tags.length > 2 && (
                                  <span className="rounded-full border border-white/10 bg-transparent px-2 py-0.5 text-[11px] text-white/40">
                                    +{lead.tags.length - 2}
                                  </span>
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
              <button
                onClick={() => setSelectedLead(null)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>

              <div className="stealth-scroll h-full space-y-6 overflow-y-auto pr-2">
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
                  <p className="mb-1 text-xs uppercase tracking-wider text-slate-400">Teléfono</p>
                  <p className="font-medium text-white">{selectedLead.phone || 'Sin teléfono'}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-slate-400">Correo</p>
                  <p className="font-medium text-white">{selectedLead.email || 'Sin correo'}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-slate-400">Fecha agregado</p>
                  <p className="font-medium text-white">{selectedLead.date}</p>
                </div>
              </div>

              {/* Resumen inteligente (IA) */}
              <div className="space-y-2 border-t border-slate-700 pt-6">
                <h3 className="mb-1 text-xs uppercase tracking-wider text-slate-400">Resumen inteligente</h3>
                <div className="border border-slate-800 rounded-lg bg-black/20 p-3 text-sm">
                  {selectedLeadLoading ? (
                    <p className="text-xs text-slate-400">Cargando resumen...</p>
                  ) : (
                    <p className="text-sm text-white whitespace-pre-line">{(selectedLead as any)?.summary || (selectedLead as any)?.description || 'Aún no hay resumen guardado para este lead.'}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-700 pt-6">
                <p className="mb-3 text-xs uppercase tracking-wider text-slate-400">Cambiar etapa</p>
                <div>
                  <button
                    onClick={() => setShowModal(true)}
                    className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Mostrar más
                  </button>
                </div>
              </div>

              <button
                onClick={() => setSelectedLead(null)}
                className="mt-6 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:border-white/20 hover:bg-white/10"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

    {showModal && selectedLead && (
          <div className="fixed inset-0 z-60 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
            <div className="relative z-10 w-[720px] max-w-full rounded-2xl bg-slate-950/95 p-6 shadow-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{selectedLead.name}</h3>
                  <p className="text-sm text-white/60">{selectedLead.phone || selectedLead.waJid || 'Sin teléfono'}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-slate-400">Cerrar</button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400">Conversación</p>
                  <p className="font-medium">{selectedLead.conversationStatus ?? 'Sin conversación'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Último mensaje (cliente)</p>
                  <p className="font-medium">{selectedLead.lastContactMessageAt ? new Date(selectedLead.lastContactMessageAt).toLocaleString('es-MX') : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Respondido</p>
                  <p className="font-medium">{selectedLead.replied ? 'Sí' : 'No'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">IA</p>
                  <p className="font-medium text-red-400">{selectedLead.aiForceOff ? 'Apagada' : 'Activa'}</p>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-800 pt-4">
                <h4 className="text-sm text-slate-400">Última nota AI</h4>
                <p className="mt-2 text-sm text-white/80">{(selectedLead as any).lastAiAuditNote || 'No hay nota AI'}</p>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={async () => {
                    const res = await fetch(`/api/leads/${selectedLead.id}/activity`);
                    if (!res.ok) return;
                    const json = await res.json();
                    if (!json?.ok) return;
                    const items = json.data;
                    // show simple list
                    alert(items.map((i: any) => `${i.activity_type}: ${i.description || ''}`).join('\n\n'));
                  }}
                  className="rounded-md bg-slate-800 px-3 py-2 text-sm text-white"
                >
                  Mostrar notas
                </button>
                <button onClick={() => setShowModal(false)} className="rounded-md border px-3 py-2 text-sm">Cerrar</button>
              </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
