'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, Plus, Trash2, User, Phone, Mail, Calendar } from 'lucide-react';

type Lead = {
  id: number;
  name: string;
  email: string;
  phone: string;
  stage: number;
  date: string;
};

type Pipeline = {
  id: number;
  name: string;
  color: string;
  stages: string[];
  leads: Lead[];
};

const pipelineData: Record<string, Pipeline> = {
  '1': {
    id: 1,
    name: 'Ventas',
    color: 'from-blue-400 to-blue-600',
    stages: ['Prospecto', 'Contactado', 'Propuesta', 'Negociación', 'Cerrado'],
    leads: [
      { id: 1, name: 'Juan García', email: 'juan@empresa.com', phone: '+34 612 345 678', stage: 0, date: '2025-12-20' },
      { id: 2, name: 'María López', email: 'maria@empresa.com', phone: '+34 623 456 789', stage: 1, date: '2025-12-19' },
      { id: 3, name: 'Carlos Rodríguez', email: 'carlos@empresa.com', phone: '+34 634 567 890', stage: 2, date: '2025-12-18' },
      { id: 4, name: 'Ana Martínez', email: 'ana@empresa.com', phone: '+34 645 678 901', stage: 0, date: '2025-12-21' },
      { id: 5, name: 'David Sánchez', email: 'david@empresa.com', phone: '+34 656 789 012', stage: 1, date: '2025-12-17' },
      { id: 6, name: 'Laura Fernández', email: 'laura@empresa.com', phone: '+34 667 890 123', stage: 3, date: '2025-12-16' },
      { id: 7, name: 'Pedro González', email: 'pedro@empresa.com', phone: '+34 678 901 234', stage: 2, date: '2025-12-15' },
      { id: 8, name: 'Sofia Díaz', email: 'sofia@empresa.com', phone: '+34 689 012 345', stage: 4, date: '2025-12-14' },
    ],
  },
  '2': {
    id: 2,
    name: 'Soporte',
    color: 'from-green-400 to-green-600',
    stages: ['Nuevo', 'En progreso', 'Pendiente cliente', 'Resuelto'],
    leads: [
      { id: 1, name: 'Ticket #001', email: 'support@empresa.com', phone: 'Normal', stage: 1, date: '2025-12-21' },
      { id: 2, name: 'Ticket #002', email: 'support@empresa.com', phone: 'Urgente', stage: 0, date: '2025-12-22' },
      { id: 3, name: 'Ticket #003', email: 'support@empresa.com', phone: 'Normal', stage: 2, date: '2025-12-20' },
      { id: 4, name: 'Ticket #004', email: 'support@empresa.com', phone: 'Normal', stage: 3, date: '2025-12-19' },
      { id: 5, name: 'Ticket #005', email: 'support@empresa.com', phone: 'Urgente', stage: 1, date: '2025-12-18' },
    ],
  },
};

export default function PipelineFlowPage() {
  const params = useParams();
  const router = useRouter();
  const pipelineId = params.id as string;
  const pipeline = pipelineData[pipelineId];

  const [leads, setLeads] = useState<Lead[]>(pipeline?.leads || []);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

  if (!pipeline) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-400">Pipeline no encontrado</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
        >
          Volver
        </button>
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

  const getLeadsInStage = (stageIndex: number) => {
    return leads.filter((lead: Lead) => lead.stage === stageIndex);
  };

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="text-blue-400 hover:text-blue-300 text-sm mb-2 flex items-center gap-1"
          >
            ← Volver a pipelines
          </button>
          <h1 className="text-4xl font-bold text-white">{pipeline.name}</h1>
          <p className="text-slate-400 mt-2">Gestiona el flujo de leads a través de las etapas</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-white">{leads.length}</p>
          <p className="text-slate-400">Total de leads</p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-min">
          {pipeline.stages.map((stage: string, stageIndex: number) => {
            const stageLeads = getLeadsInStage(stageIndex);
            const stageWidth = Math.max(stageLeads.length * 100 + 20, 350);

            return (
              <div key={stageIndex} className="flex-shrink-0" style={{ width: `${stageWidth}px` }}>
                {/* Stage Header */}
                <div className="rounded-t-xl bg-slate-800 border border-b-0 border-slate-700 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-white">{stage}</h3>
                    <span className="px-2 py-1 rounded-full bg-slate-700 text-slate-300 text-xs font-medium">
                      {stageLeads.length}
                    </span>
                  </div>
                  <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors">
                    <Plus className="h-4 w-4" />
                    Agregar
                  </button>
                </div>

                {/* Stage Cards Container */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(stageIndex)}
                  className="rounded-b-xl border border-slate-700 bg-slate-900/50 backdrop-blur p-4 space-y-3 min-h-[500px]"
                >
                  {stageLeads.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                      Arrastra leads aquí
                    </div>
                  ) : (
                    stageLeads.map((lead: Lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => handleDragStart(lead)}
                        onClick={() => setSelectedLead(lead)}
                        className="p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-blue-500 cursor-move transition-colors group"
                      >
                        <h4 className="font-semibold text-white text-sm mb-1">{lead.name}</h4>
                        <div className="space-y-1 text-xs text-slate-400">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            <span>{lead.phone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>{lead.date}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLead(lead.id);
                          }}
                          className="mt-2 w-full px-2 py-1 rounded bg-slate-700 hover:bg-red-900 text-slate-400 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="h-3 w-3 inline mr-1" /> Eliminar
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
        <div className="fixed right-0 top-0 h-screen w-96 bg-slate-900 border-l border-slate-700 shadow-2xl p-6 overflow-y-auto z-50">
          <button
            onClick={() => setSelectedLead(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
          >
            ✕
          </button>

          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{selectedLead.name}</h2>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/50 border border-blue-700">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-blue-300 text-sm">{pipeline.stages[selectedLead.stage]}</span>
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
                {pipeline.stages.map((stage: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setLeads(
                        leads.map((l: Lead) =>
                          l.id === selectedLead!.id ? { ...l, stage: idx } : l
                        )
                      );
                      setSelectedLead({ ...selectedLead!, stage: idx });
                    }}
                    className={`w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedLead!.stage === idx
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {stage}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleDeleteLead(selectedLead.id)}
              className="w-full px-4 py-2 rounded-lg bg-red-900/50 hover:bg-red-900 text-red-400 border border-red-700 transition-colors mt-6"
            >
              <Trash2 className="h-4 w-4 inline mr-2" />
              Eliminar lead
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
