// src/app/portal/leads/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2, AlertCircle } from "lucide-react";

type Lead = {
  id: number;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  dealValue?: number;
  currency: string;
  stageName?: string;
  pipelineName?: string;
  updatedAt: string;
};

const getStatusColor = (stageName?: string) => {
  if (!stageName) return "bg-zinc-500/20 text-zinc-300 border-zinc-500/30";
  
  const lower = stageName.toLowerCase();
  if (lower.includes("nuevo")) return "bg-blue-500/20 text-blue-300 border-blue-500/30";
  if (lower.includes("contactado") || lower.includes("contact")) return "bg-purple-500/20 text-purple-300 border-purple-500/30";
  if (lower.includes("calificado") || lower.includes("qualified")) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  if (lower.includes("cierre") || lower.includes("closed")) return "bg-red-500/20 text-red-300 border-red-500/30";
  return "bg-zinc-500/20 text-zinc-300 border-zinc-500/30";
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/leads?limit=50");
      if (!res.ok) throw new Error("Failed to fetch leads");
      const data: any = await res.json();
      if (data.ok) {
        setLeads(data.data.leads || []);
      } else {
        setError(data.error || "Unknown error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleNewLead = async () => {
    const name = window.prompt("Nombre del lead:");
    if (!name) return;

    try {
      setLoading(true);
      setError(null);

      // Get pipelines to pick a pipeline and stage
      const pRes = await fetch("/api/pipelines");
      if (!pRes.ok) throw new Error("No pipelines available");
      const pJson: any = await pRes.json();
      const pipeline = pJson?.data?.items?.[0];
      const pipelineId = pipeline?.id;
      const stageId = pipeline?.stages?.[0]?.id;
      if (!pipelineId || !stageId) throw new Error("No pipeline or stage found");

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pipelineId, stageId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to create lead");

      // Refresh list
      await fetchLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full text-zinc-200 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Leads</h1>
          <p className="mt-2 text-sm text-zinc-500">Gestiona y da seguimiento a tus contactos</p>
        </div>
        <button onClick={handleNewLead} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium px-4 py-2 hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg shadow-blue-500/20">
          <Plus className="w-4 h-4" />
          Nuevo Lead
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-200">Error</p>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="rounded-xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl overflow-hidden p-12 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mx-auto" />
            <p className="text-zinc-400">Cargando leads...</p>
          </div>
        </div>
      )}

      {/* Leads Table */}
      {!loading && leads.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-zinc-900/60">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Nombre</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Empresa</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Teléfono</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Etapa</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Valor</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-white">{lead.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-zinc-400">{lead.company || "-"}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-zinc-400 truncate">{lead.email || "-"}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-zinc-400">{lead.phone || "-"}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium border ${getStatusColor(lead.stageName)}`}>
                      {lead.stageName || "Sin etapa"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-zinc-400">
                      {lead.dealValue ? `$${lead.dealValue.toLocaleString()}` : "-"} {lead.currency}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/portal/leads/${lead.id}`}
                      className="inline-flex text-xs font-medium text-zinc-400 hover:text-white border border-white/10 bg-white/5 px-3 py-2 rounded-lg hover:bg-blue-600/20 hover:border-blue-500/30 transition-all"
                    >
                      Detalles
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && leads.length === 0 && !error && (
        <div className="rounded-xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl overflow-hidden p-12 text-center">
          <p className="text-zinc-400 mb-4">No hay leads disponibles</p>
          <button className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium px-4 py-2 hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg shadow-blue-500/20">
            <Plus className="w-4 h-4" />
            Crear primer lead
          </button>
        </div>
      )}
    </div>
  );
}
