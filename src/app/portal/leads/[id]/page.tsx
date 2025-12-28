// src/app/portal/leads/[id]/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2, AlertCircle, Send } from "lucide-react";
import { useParams } from "next/navigation";

type Lead = {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  dealValue?: number;
  currency: string;
  stageName?: string;
  pipelineName?: string;
  summaryText?: string;
};

type Note = {
  id: number;
  content: string;
  authorType: string;
  authorId?: number;
  createdAt: string;
};

type Reminder = {
  id: number;
  text: string;
  dueAt: string;
  active: boolean;
  createdAt: string;
};

export default function LeadDetailPage() {
  const params = useParams();
  const leadId = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/leads/${leadId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch lead");
        }
        const data = await res.json();
        if (data.ok) {
          setLead(data.data);
          setNotes(data.data.notes || []);
          setReminders(data.data.reminders || []);
        } else {
          setError(data.error || "Unknown error");
        }
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mx-auto" />
          <p className="text-zinc-400">Cargando lead...</p>
        </div>
      </div>
    );
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
        {/* Details Panel */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-white/10 bg-zinc-900/40 p-4 space-y-4">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Email</p>
              <p className="mt-1 text-sm text-white">{lead.email || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Teléfono</p>
              <p className="mt-1 text-sm text-white">{lead.phone || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Valor del Trato</p>
              <p className="mt-1 text-sm text-white">
                {lead.dealValue ? `$${lead.dealValue.toLocaleString()}` : "-"} {lead.currency}
              </p>
            </div>
          </div>
        </div>

        {/* Notes Panel */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-white/10 bg-zinc-900/40 p-4">
            <h2 className="text-sm font-semibold text-white mb-4">Notas</h2>

            {/* New Note Input */}
            <div className="space-y-3 mb-6 pb-6 border-b border-white/10">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Agregar una nota..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
                rows={3}
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim() || savingNote}
                className="inline-flex items-center gap-2 text-xs font-medium text-white bg-blue-600/80 hover:bg-blue-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                {savingNote ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    Guardar nota
                  </>
                )}
              </button>
            </div>

            {/* Notes List */}
            <div className="space-y-3">
              {notes.length === 0 ? (
                <p className="text-xs text-zinc-500">No hay notas aún</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="rounded-lg bg-white/5 p-3 border border-white/10">
                    <p className="text-sm text-white">{note.content}</p>
                    <p className="mt-2 text-xs text-zinc-500">
                      {new Date(note.createdAt).toLocaleDateString("es-MX", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
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
