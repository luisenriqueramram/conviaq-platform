// src/app/portal/leads/[id]/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2, AlertCircle, Send, Lock, Globe, Bot, User as UserIcon, ChevronDown, ChevronUp } from "lucide-react";
import { useParams } from "next/navigation";

// ...existing code...

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Lead principal
        const res = await fetch(`/api/leads/${leadId}`);
        if (!res.ok) throw new Error("Failed to fetch lead");
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Unknown error");
        setLead(data.data);
        setNotes(data.data.notes || []);
        setReminders(data.data.reminders || []);
        setSelectedStage(data.data.stageId);
        setSelectedTags(data.data.tags || []);
        setLeadName(data.data.name || '');
        setLeadValue(data.data.dealValue ?? '');

        // 2. Metadata (etapas y etiquetas)
        const metaRes = await fetch('/api/config/metadata');
        const metaJson = await metaRes.json();
        if (metaJson.ok) {
          setStages(metaJson.data.stages || []);
          setTags(metaJson.data.tags || []);
        }

        // 3. Timeline (actividad)
        const actRes = await fetch(`/api/leads/${leadId}/activity`);
        const actJson = await actRes.json();
        if (actJson.ok) setActivity(actJson.data || []);

        // 4. Chat (conversaciones)
        const chatRes = await fetch(`/api/leads/${leadId}/conversations`);
        const chatJson = await chatRes.json();
        if (chatJson.ok) setChat(chatJson.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [leadId]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      setSavingNote(true);
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote }),
      });

      if (!res.ok) {
        throw new Error("Failed to save note");
      }

      const data = await res.json();
      if (data.ok) {
        setNotes([data.data, ...notes]);
        setNewNote("");
      } else {
        setError(data.error || "Failed to save note");
  }

  if (error || !lead) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-red-200">Error</p>
          <p className="text-sm text-red-300">{error || "Lead not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="text-xs opacity-60">Lead #{lead.id}</div>
          <h1 className="text-2xl font-semibold text-white">{lead.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {lead.company && (
              <span className="rounded-full bg-neutral-800 px-2 py-1">
                {lead.company}
              </span>
            )}
            {lead.stageName && (
              <span className="rounded-full bg-neutral-800 px-2 py-1">
                Estado: {lead.stageName}
              </span>
            )}
            {lead.pipelineName && (
              <span className="rounded-full border border-neutral-700 px-2 py-1">
                Pipeline: {lead.pipelineName}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href={`/portal/leads/${leadId}/conversations`}
            className="rounded-md border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800"
          >
            Ver conversaciones
          </Link>
        </div>
      </div>


      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sección 1: Datos del Negocio */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-white/10 bg-zinc-900/40 p-4 space-y-4">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Nombre</label>
              <input
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                value={leadName}
                onChange={e => setLeadName(e.target.value)}
                disabled={saving}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Valor ($)</label>
              <input
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                type="number"
                value={leadValue}
                onChange={e => setLeadValue(Number(e.target.value) || '')}
                disabled={saving}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Etapa</label>
              <select
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                value={selectedStage}
                onChange={e => setSelectedStage(Number(e.target.value))}
                disabled={saving}
              >
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>{stage.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Etiquetas</label>
              <div className="relative mt-1">
                <div
                  className="flex flex-wrap gap-1 min-h-[38px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 cursor-pointer"
                  onClick={() => setShowTagDropdown(!showTagDropdown)}
                >
                  {selectedTags.length === 0 && <span className="text-zinc-500 text-xs">Sin etiquetas</span>}
                  {selectedTags.map((tag) => (
                    <span
                      key={tag.id}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${tag.is_system ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}
                    >
                      {tag.is_system ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />} {tag.name}
                      <button
                        type="button"
                        className="ml-1 text-xs text-zinc-400 hover:text-red-400"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
                        }}
                        disabled={saving}
                      >✕</button>
                    </span>
                  ))}
                  <ChevronDown className="w-4 h-4 ml-auto text-zinc-400" />
                </div>
                {showTagDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-zinc-900 border border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {tags.map((tag) => (
                      <div
                        key={tag.id}
                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-zinc-800 ${selectedTags.some(t => t.id === tag.id) ? 'opacity-60' : ''}`}
                        onClick={() => {
                          if (!selectedTags.some(t => t.id === tag.id)) {
                            setSelectedTags([...selectedTags, tag]);
                          }
                        }}
                      >
                        {tag.is_system ? <Globe className="w-4 h-4 text-red-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
                        <span>{tag.name}</span>
                      </div>
                    ))}
                              <button
                                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg disabled:opacity-50"
                                disabled={saving}
                                onClick={async () => {
                                  setSaving(true);
                                  try {
                                    const res = await fetch(`/api/leads/${leadId}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        name: leadName,
                                        dealValue: leadValue,
                                        stageId: selectedStage,
                                        tagIds: selectedTags.map(t => t.id),
                                      }),
                                    });
                                    if (!res.ok) throw new Error('Error al guardar cambios');
                                    // Opcional: recargar datos
                                    window.location.reload();
                                  } catch (e) {
                                    alert('Error al guardar cambios');
                                  } finally {
                                    setSaving(false);
                                  }
                                }}
                              >
                                {saving ? 'Guardando...' : 'Guardar cambios'}
                              </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sección 2: Chat / Contexto */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-white/10 bg-zinc-900/40 p-4 h-full flex flex-col">
            <h2 className="text-sm font-semibold text-white mb-4">Historial de WhatsApp</h2>
            <div className="flex-1 overflow-y-auto space-y-2">
              {chat.length === 0 ? (
                <p className="text-xs text-zinc-500">No hay mensajes</p>
              ) : (
                chat.map((msg) => (
                  <div key={msg.id} className="rounded-lg bg-white/5 p-2 border border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-white">{msg.sender}</span>
                      <span className="text-xs text-zinc-400">{new Date(msg.sent_at).toLocaleString('es-MX')}</span>
                    </div>
                    <p className="text-sm text-white whitespace-pre-line">{msg.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sección 3: Bitácora de Auditoría (Timeline) */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-white/10 bg-zinc-900/40 p-4 h-full flex flex-col">
            <h2 className="text-sm font-semibold text-white mb-4">Bitácora de Auditoría</h2>
            <div className="flex-1 overflow-y-auto space-y-4">
              {activity.length === 0 ? (
                <p className="text-xs text-zinc-500">No hay actividad registrada</p>
              ) : (
                activity.map((item, idx) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="pt-1">
                      {item.performed_by_ai ? <Bot className="w-5 h-5 text-blue-400" /> : <UserIcon className="w-5 h-5 text-amber-400" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">
                          {item.performed_by_ai ? 'IA actualizó el Lead' : 'Acción Humana'}
                        </span>
                        <span className="text-xs text-zinc-400">{new Date(item.created_at).toLocaleString('es-MX')}</span>
                      </div>
                      <div className="text-xs text-zinc-300 mb-1">{item.description}</div>
                      <button
                        className="text-xs text-blue-400 flex items-center gap-1"
                        onClick={() => setShowMeta(showMeta === idx ? null : idx)}
                      >
                        {showMeta === idx ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} Ver detalles técnicos
                      </button>
                      {showMeta === idx && (
                        <pre className="bg-zinc-950 border border-white/10 rounded-lg p-2 mt-2 text-xs text-zinc-200 overflow-x-auto">
                          {JSON.stringify(item.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reminders */}
      <div className="rounded-lg border border-white/10 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-semibold text-white mb-4">Recordatorios</h2>
        {reminders.length === 0 ? (
          <p className="text-xs text-zinc-500">No hay recordatorios activos</p>
        ) : (
          <div className="space-y-2">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="rounded-lg bg-white/5 p-3 border border-white/10 flex items-start justify-between">
                <div>
                  <p className="text-sm text-white">{reminder.text}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Vence: {new Date(reminder.dueAt).toLocaleDateString("es-MX")}
                  </p>
                </div>
              </div>
            ))}
          </div>

        )}
      </div>
    </div>
	);
}

export default LeadDetailPage;

