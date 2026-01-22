"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Bot, ChevronDown, ChevronUp, Globe, Loader2, Lock, User as UserIcon } from "lucide-react";
import { useParams } from "next/navigation";
import type { Activity, ChatMessage, Lead, Note, Reminder, Tag } from "@/types/lead";

const LeadDetailPage = () => {
  const params = useParams<{ id: string }>();
  const leadIdParam = params?.id;
  const leadId = Array.isArray(leadIdParam) ? leadIdParam[0] : leadIdParam ?? "";

  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [activity, setActivity] = useState<Activity[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [stages, setStages] = useState<Array<{ id: number; name: string }>>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedStage, setSelectedStage] = useState<number | undefined>(undefined);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [leadName, setLeadName] = useState("");
  const [leadValue, setLeadValue] = useState<number | "">("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [showMeta, setShowMeta] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTagIds = useMemo(() => new Set(selectedTags.map((tag) => tag.id)), [selectedTags]);

  useEffect(() => {
    if (!leadId) {
      setError("Lead inválido");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/leads/${leadId}`);
        if (!res.ok) throw new Error("Failed to fetch lead");
        const payload = await res.json();
        if (!payload.ok) throw new Error(payload.error || "Unknown error");

        const leadData = payload.data as Lead & { notes?: Note[]; reminders?: Reminder[] };
        setLead(leadData);
        setNotes(leadData.notes || []);
        setReminders(leadData.reminders || []);
        setSelectedStage(leadData.stageId ?? undefined);
        setSelectedTags(leadData.tags || []);
        setLeadName(leadData.name || "");
        setLeadValue(typeof leadData.dealValue === "number" ? leadData.dealValue : "");

        const metaRes = await fetch("/api/config/metadata");
        const metaJson = await metaRes.json();
        if (metaJson.ok) {
          setStages(metaJson.data.stages || []);
          setTags(metaJson.data.tags || []);
        }

        const actRes = await fetch(`/api/leads/${leadId}/activity`);
        const actJson = await actRes.json();
        if (actJson.ok) setActivity(actJson.data || []);

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

  const handleSaveChanges = async () => {
    if (!leadId) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadName,
          dealValue: leadValue === "" ? null : Number(leadValue),
          stageId: selectedStage,
          tagIds: selectedTags.map((tag) => tag.id),
        }),
      });

      if (!res.ok) throw new Error("Error al guardar cambios");
      const payload = await res.json();
      if (!payload.ok) throw new Error(payload.error || "Error al guardar cambios");
      if (payload.data) {
        setLead(payload.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!leadId || !newNote.trim()) return;
    try {
      setSavingNote(true);
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote }),
      });

      if (!res.ok) throw new Error("Failed to save note");
      const payload = await res.json();
      if (!payload.ok) throw new Error(payload.error || "Failed to save note");
      setNotes((prev) => [payload.data, ...prev]);
      setNewNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando lead...
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-red-200">Error</p>
          <p className="text-sm text-red-300">{error || "Lead no encontrado"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="text-xs opacity-60">Lead #{lead.id}</div>
          <h1 className="text-2xl font-semibold text-white">{lead.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {lead.company && <span className="rounded-full bg-neutral-800 px-2 py-1">{lead.company}</span>}
            {lead.stageName && <span className="rounded-full bg-neutral-800 px-2 py-1">Estado: {lead.stageName}</span>}
            {lead.pipelineName && (
              <span className="rounded-full border border-neutral-700 px-2 py-1">Pipeline: {lead.pipelineName}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <Link href={`/portal/leads/${leadId}/conversations`} className="rounded-md border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800">
            Ver conversaciones
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-white/10 bg-zinc-900/40 p-4 space-y-4">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Nombre</label>
              <input
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                disabled={saving}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Valor ($)</label>
              <input
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                type="number"
                value={leadValue}
                onChange={(e) => {
                  const value = e.target.value;
                  setLeadValue(value === "" ? "" : Number(value));
                }}
                disabled={saving}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Etapa</label>
              <select
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                value={selectedStage}
                onChange={(e) => setSelectedStage(Number(e.target.value))}
                disabled={saving}
              >
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Etiquetas</label>
              <div className="relative mt-1">
                <div
                  className="flex flex-wrap gap-1 min-h-[38px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 cursor-pointer"
                  onClick={() => setShowTagDropdown((prev) => !prev)}
                >
                  {selectedTags.length === 0 && <span className="text-zinc-500 text-xs">Sin etiquetas</span>}
                  {selectedTags.map((tag) => (
                    <span
                      key={tag.id}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                        tag.is_system ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {tag.is_system ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />} {tag.name}
                      <button
                        type="button"
                        className="ml-1 text-xs text-zinc-400 hover:text-red-400"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedTags((current) => current.filter((t) => t.id !== tag.id));
                        }}
                        disabled={saving}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <ChevronDown className="w-4 h-4 ml-auto text-zinc-400" />
                </div>

                {showTagDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-zinc-900 border border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-800 ${selectedTagIds.has(tag.id) ? "opacity-60" : ""}`}
                        type="button"
                        onClick={() => {
                          if (!selectedTagIds.has(tag.id)) {
                            setSelectedTags((current) => [...current, tag]);
                          }
                        }}
                      >
                        {tag.is_system ? <Globe className="w-4 h-4 text-red-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
                        <span>{tag.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              onClick={handleSaveChanges}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>

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
                      <span className="text-xs text-zinc-400">{new Date(msg.sent_at).toLocaleString("es-MX")}</span>
                    </div>
                    <p className="text-sm text-white whitespace-pre-line">{msg.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

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
                          {item.performed_by_ai ? "IA actualizó el Lead" : "Acción Humana"}
                        </span>
                        <span className="text-xs text-zinc-400">{new Date(item.created_at).toLocaleString("es-MX")}</span>
                      </div>
                      <div className="text-xs text-zinc-300 mb-1">{item.description}</div>
                      <button className="text-xs text-blue-400 flex items-center gap-1" onClick={() => setShowMeta(showMeta === idx ? null : idx)}>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Notas internas</h2>
            <span className="text-xs text-zinc-500">{notes.length} guardadas</span>
          </div>
          <textarea
            className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Registrar contacto, acuerdos, objeciones..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <div className="mt-3 flex justify-end">
            <button
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50"
              onClick={handleAddNote}
              disabled={savingNote || !newNote.trim()}
            >
              {savingNote ? "Guardando..." : "Agregar nota"}
            </button>
          </div>
          <div className="mt-4 max-h-64 space-y-3 overflow-y-auto">
            {notes.length === 0 ? (
              <p className="text-xs text-zinc-500">Sin notas por ahora</p>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>{note.authorType === "ai" ? "IA" : "Humano"}</span>
                    <span>{new Date(note.createdAt).toLocaleString("es-MX")}</span>
                  </div>
                  <p className="mt-2 text-sm text-white whitespace-pre-line">{note.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

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
                    <p className="mt-1 text-xs text-zinc-500">Vence: {new Date(reminder.dueAt).toLocaleDateString("es-MX")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadDetailPage;

