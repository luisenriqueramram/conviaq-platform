'use client';

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import Link from 'next/link';

export default function PipelinesPage() {
  const [pipelines, setPipelines] = useState([
    {
      id: 1,
      name: 'Ventas',
      stages: ['Prospecto', 'Contactado', 'Propuesta', 'Negociación', 'Cerrado'],
      color: 'from-blue-400 to-blue-600',
      leads: 12,
    },
    {
      id: 2,
      name: 'Soporte',
      stages: ['Nuevo', 'En progreso', 'Pendiente cliente', 'Resuelto'],
      color: 'from-green-400 to-green-600',
      leads: 5,
    },
  ]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newPipelineForm, setNewPipelineForm] = useState({ name: '', stages: '' });

  const handleAddPipeline = () => {
    if (newPipelineForm.name && newPipelineForm.stages) {
      const stages = newPipelineForm.stages.split(',').map((s) => s.trim());
      setPipelines([
        ...pipelines,
        {
          id: Date.now(),
          name: newPipelineForm.name,
          stages,
          color: 'from-purple-400 to-purple-600',
          leads: 0,
        },
      ]);
      setNewPipelineForm({ name: '', stages: '' });
      setIsCreating(false);
    }
  };

  const handleDeletePipeline = (id: number) => {
    setPipelines(pipelines.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">Pipelines</h1>
          <p className="text-slate-400 mt-2">Gestiona y organiza tus flujos de trabajo</p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          <Plus className="h-5 w-5" />
          Nuevo Pipeline
        </button>
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 backdrop-blur">
          <h3 className="text-lg font-semibold text-white mb-4">Crear nuevo pipeline</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">Nombre del pipeline</label>
              <input
                type="text"
                placeholder="Ej: Ventas B2B"
                value={newPipelineForm.name}
                onChange={(e) => setNewPipelineForm({ ...newPipelineForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">
                Etapas (separadas por comas)
              </label>
              <input
                type="text"
                placeholder="Ej: Prospecto, Contactado, Propuesta, Cerrado"
                value={newPipelineForm.stages}
                onChange={(e) => setNewPipelineForm({ ...newPipelineForm, stages: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddPipeline}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Crear
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewPipelineForm({ name: '', stages: '' });
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pipelines Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {pipelines.map((pipeline) => (
          <div
            key={pipeline.id}
            className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 backdrop-blur hover:border-slate-600 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${pipeline.color} mb-3`} />
                <h3 className="text-xl font-semibold text-white">{pipeline.name}</h3>
              </div>
              <div className="flex gap-2">
                <button className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeletePipeline(pipeline.id)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-red-900 text-slate-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-slate-400 mb-2">Etapas ({pipeline.stages.length})</p>
              <div className="flex flex-wrap gap-2">
                {pipeline.stages.map((stage, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium"
                  >
                    {stage}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
              <div>
                <p className="text-sm text-slate-400">Leads</p>
                <p className="text-xl font-semibold text-white">{pipeline.leads}</p>
              </div>
              <Link href={`/portal/pipelines/${pipeline.id}`}>
                <button className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors">
                  Ver flujo
                </button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {pipelines.length === 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-12 text-center backdrop-blur">
          <p className="text-slate-400 mb-4">No hay pipelines creados aún</p>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            <Plus className="h-4 w-4" />
            Crear el primero
          </button>
        </div>
      )}
    </div>
  );
}
