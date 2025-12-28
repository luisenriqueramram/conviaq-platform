"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  GripVertical,
  Mail,
  Phone,
  Building,
  X,
  MessageSquare,
  Bell,
  Brain,
  StickyNote,
} from "lucide-react"

interface PipelineStage {
  id: string
  pipeline_id: string
  name: string
  stage_key: string
  position: number
  color: string | null
  is_final: boolean
}

interface Pipeline {
  id: string
  name: string
  kind: string | null
  is_default: boolean
  created_at: string
  stages: PipelineStage[]
}

interface LeadProduct {
  name: string
  isPrimary?: boolean
}

interface LeadNote {
  id: string
  text: string
  author: "ia" | "user"
  created_at: string
}

interface LeadReminder {
  id: string
  text: string
  due_at: string
  active: boolean
}

interface Lead {
  id: string
  name: string
  company: string
  email: string
  phone: string
  value: string
  stage_key: string
  products?: LeadProduct[]
  summary?: string
  notes?: LeadNote[]
  aiEnabled?: boolean
  reminders?: LeadReminder[]
}

const initialLeads: Lead[] = [
  {
    id: "1",
    name: "Luis Martínez",
    company: "Despacho Durón & Durón",
    email: "cliente1@empresa.com",
    phone: "5214770000001",
    value: "$45,000",
    stage_key: "primer_contacto",
    products: [
      { name: "Asesoría laboral inicial", isPrimary: true },
      { name: "Seguimiento de demanda" },
    ],
    summary:
      "Contacto nuevo interesado en una asesoría laboral por despido injustificado. Viene referido y tiene buena probabilidad de cierre.",
    aiEnabled: true,
    notes: [
      {
        id: "n1",
        text: "Cliente comenta que ya tiene documentos listos (contrato, finiquito).",
        author: "user",
        created_at: new Date().toISOString(),
      },
    ],
    reminders: [
      {
        id: "r1",
        text: "Confirmar envío de lista de documentos requeridos.",
        due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        active: true,
      },
    ],
  },
  {
    id: "2",
    name: "María Pérez",
    company: "Promotoría Troya",
    email: "cliente2@empresa.com",
    phone: "5214770000002",
    value: "$78,000",
    stage_key: "en_atencion",
    products: [{ name: "Paquete Gastos Médicos", isPrimary: true }],
    summary:
      "Interesada en gastos médicos mayores. Está comparando opciones pero percibe valor en el acompañamiento.",
    aiEnabled: true,
  },
  {
    id: "3",
    name: "Carlos Gómez",
    company: "Inmobiliaria Nova",
    email: "cliente3@empresa.com",
    phone: "5214770000003",
    value: "$120,000",
    stage_key: "interesado",
    products: [
      { name: "Chatbot de atención general", isPrimary: true },
      { name: "Módulo CRM básico" },
      { name: "Automatización de citas" },
    ],
    summary:
      "Busca automatizar la atención de leads de inmuebles. Alto volumen, requiere priorización por presupuesto.",
    aiEnabled: false,
  },
  {
    id: "4",
    name: "Ana López",
    company: "Clínica Bienestar",
    email: "cliente4@empresa.com",
    phone: "5214770000004",
    value: "$95,000",
    stage_key: "cotizando",
    products: [{ name: "Panel CONVIAQ + IA agenda", isPrimary: true }],
    summary:
      "Cotización en proceso para automatizar agenda de pacientes y confirmación por WhatsApp.",
    aiEnabled: true,
  },
  {
    id: "5",
    name: "Ricardo Silva",
    company: "Consultoría RS",
    email: "cliente5@empresa.com",
    phone: "5214770000005",
    value: "$180,000",
    stage_key: "ganado",
    products: [{ name: "CRM + IA Premium", isPrimary: true }],
    summary:
      "Cliente ya cerrado. Proyecto integral de CRM, bots y reportes para su consultoría.",
    aiEnabled: true,
  },
]

const STAGE_COLORS = [
  "bg-emerald-500",
  "bg-sky-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-fuchsia-500",
  "bg-pink-500",
]

export function CRMView() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [currentPipelineId, setCurrentPipelineId] = useState<string | null>(null)
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  useEffect(() => {
    const loadPipelines = async () => {
      try {
        const res = await fetch("/api/pipelines")
        if (!res.ok) {
          throw new Error("No se pudo cargar el pipeline")
        }
        const data = await res.json()
        const list = (data?.pipelines ?? []) as Pipeline[]
        setPipelines(list)
        if (list.length > 0) {
          setCurrentPipelineId(list[0].id)
        }
      } catch (err) {
        console.error(err)
        setError("Error cargando pipeline")
      } finally {
        setLoading(false)
      }
    }

    loadPipelines()
  }, [])

  const currentPipeline =
    pipelines.find((p) => p.id === currentPipelineId) ?? pipelines[0]

  const stages = currentPipeline?.stages ?? []

  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (stageKey: string) => {
    if (draggedLead) {
      setLeads((prevLeads) =>
        prevLeads.map((lead) =>
          lead.id === draggedLead.id ? { ...lead, stage_key: stageKey } : lead,
        ),
      )
      // Aquí luego haremos POST /api/leads/[id]/stage
      setDraggedLead(null)
    }
  }

  const getLeadsByStage = (stageKey: string) =>
    leads.filter((lead) => lead.stage_key === stageKey)

  const handleOpenDetails = (lead: Lead) => {
    setSelectedLead(lead)
    setShowDetailsModal(true)
  }

  const handleCloseDetails = () => {
    setShowDetailsModal(false)
    setSelectedLead(null)
  }

  const handleToggleAI = () => {
    if (!selectedLead) return
    const newValue = !selectedLead.aiEnabled
    const updatedLead = { ...selectedLead, aiEnabled: newValue }

    setSelectedLead(updatedLead)
    setLeads((prev) =>
      prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)),
    )
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Cargando pipeline…</p>
      </div>
    )
  }

  if (error || !currentPipeline) {
    return (
      <div className="p-8">
        <p className="text-destructive">
          Hubo un problema cargando el pipeline.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="p-6 space-y-6 bg-[color:var(--bg-app)] min-h-screen">
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-balance">
                Pipeline de clientes
              </h1>
              <p className="text-xs md:text-sm text-[color:var(--text-muted)] mt-1">
                Gestiona a tus leads y clientes a través de un flujo visual,
                listo para automatizaciones con IA.
              </p>
              <p className="text-[11px] text-[color:var(--text-muted)] mt-1">
                Pipeline actual:{" "}
                <span className="font-medium">{currentPipeline.name}</span>
              </p>
            </div>
          </div>
        </header>

        <section className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage, index) => {
            const stageLeads = getLeadsByStage(stage.stage_key)
            const totalValue = stageLeads.reduce((sum, lead) => {
              const value = Number.parseInt(lead.value.replace(/[$,]/g, ""))
              return sum + (Number.isNaN(value) ? 0 : value)
            }, 0)

            const colorClass = STAGE_COLORS[index % STAGE_COLORS.length]

            return (
              <div
                key={stage.id}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage.stage_key)}
                className="flex flex-col min-w-[260px] max-w-xs bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] rounded-xl"
              >
                <div className="px-3 py-3 border-b border-[color:var(--border-subtle)]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${colorClass}`}
                      />
                      <h3 className="text-xs font-semibold text-pretty">
                        {stage.name}
                      </h3>
                      <Badge
                        variant="secondary"
                        className="text-[10px] border-none bg-[color:var(--bg-surface-soft)] text-[color:var(--text-muted)]"
                      >
                        {stageLeads.length}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-[color:var(--text-muted)]">
                      {(totalValue / 1000).toFixed(0)}K
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-3 space-y-3 max-h-[calc(100vh-220px)]">
                  {stageLeads.map((lead) => (
                    <Card
                      key={lead.id}
                      className="border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-soft)]/80 hover:bg-[color:var(--bg-surface-soft)] transition-shadow shadow-sm hover:shadow-conviaq-glow"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm text-pretty">
                              {lead.name}
                            </CardTitle>
                            <div className="flex items-center gap-1 text-[11px] text-[color:var(--text-muted)] mt-1">
                              <Building className="w-3 h-3" />
                              <span className="truncate">{lead.company}</span>
                            </div>
                          </div>
                          {/* Handler de drag: solo arrastrable aquí */}
                          <button
                            type="button"
                            className="flex flex-col items-center justify-center px-1 py-1 text-[color:var(--text-muted)] cursor-grab active:cursor-grabbing"
                            draggable
                            onDragStart={() => handleDragStart(lead)}
                          >
                            <GripVertical className="w-3 h-3" />
                          </button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 pt-0">
                        <div className="flex items-center gap-2 text-[11px] text-[color:var(--text-muted)]">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[color:var(--text-muted)]">
                          <Phone className="w-3 h-3" />
                          <span>{lead.phone}</span>
                        </div>

                        {lead.products && lead.products.length > 0 && (
                          <div className="mt-1">
                            <p className="text-[10px] text-[color:var(--text-muted)] mb-1 uppercase tracking-[0.14em]">
                              Producto / servicio
                            </p>
                            <div className="flex items-center gap-1 flex-wrap">
                              {lead.products.map((p, idx) => {
                                  if (idx === 0) {
                                  const extra = (lead.products?.length ?? 0) - 1
                                  return (
                                    <React.Fragment key={p.name}>
                                      <Badge className="text-[10px] border-none bg-[color:var(--brand-primary-soft)] text-[color:var(--brand-primary)]">
                                        {p.name}
                                      </Badge>
                                      {extra > 0 && (
                                        <span className="text-[10px] text-[color:var(--text-muted)]">
                                          +{extra} más
                                        </span>
                                      )}
                                    </React.Fragment>
                                  )
                                }
                                return null
                              })}
                            </div>
                          </div>
                        )}

                        <div className="pt-2 border-t border-[color:var(--border-subtle)] flex items-center justify-between gap-2">
                          <span className="font-semibold text-[13px] text-[color:var(--brand-primary)]">
                            {lead.value}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(lead)}
                            className="text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded-full border border-[color:var(--border-subtle)] text-[color:var(--text-muted)] hover:border-[color:var(--brand-primary)] hover:text-[color:var(--brand-primary)] transition"
                          >
                            Ver detalles
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Bloque al final del pipeline para etapas nuevas / administrar */}
          <div className="min-w-[220px] max-w-xs flex flex-col items-stretch justify-center border border-dashed border-[color:var(--border-subtle)] rounded-xl bg-[color:var(--bg-surface-soft)]/40 px-4 py-4">
            <p className="text-xs font-medium mb-2">
              Administración del pipeline
            </p>
            <p className="text-[11px] text-[color:var(--text-muted)] mb-3">
              Agrega nuevas etapas o reordena el flujo para adaptarlo a cada
              negocio.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="text-[11px] px-3 py-1.5 rounded-md border border-[color:var(--border-subtle)] text-[color:var(--brand-primary)] hover:bg-[color:var(--brand-primary-soft)] transition text-left"
              >
                + Agregar etapa
              </button>
              <button
                type="button"
                className="text-[11px] px-3 py-1.5 rounded-md border border-[color:var(--border-subtle)] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-surface)] transition text-left"
              >
                ⇅ Reordenar etapas
              </button>
            </div>
            <p className="text-[10px] text-[color:var(--text-muted)] mt-3">
              Más adelante aquí conectamos guardado en BD y automatizaciones.
            </p>
          </div>
        </section>
      </div>

      {/* MODAL DE DETALLES */}
      {showDetailsModal && selectedLead && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleCloseDetails}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="px-6 py-4 border-b border-[color:var(--border-subtle)] flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{selectedLead.name}</h2>
                  {selectedLead.aiEnabled && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-primary-soft)] px-2 py-0.5 text-[10px] text-[color:var(--brand-primary)]">
                      <Brain className="w-3 h-3" />
                      IA activa
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[color:var(--text-muted)]">
                  {selectedLead.company} · {selectedLead.email || "Sin correo"} ·{" "}
                  {selectedLead.phone || "Sin teléfono"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    // Aquí luego hacemos link real a /portal/conversations
                    const url = `/portal/conversations?phone=${encodeURIComponent(
                      selectedLead.phone,
                    )}`
                    window.location.href = url
                  }}
                  className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full border border-[color:var(--border-subtle)] text-[color:var(--brand-primary)] hover:bg-[color:var(--brand-primary-soft)] transition"
                >
                  <MessageSquare className="w-3 h-3" />
                  Ver mensajes
                </button>
                <button
                  type="button"
                  onClick={handleToggleAI}
                  className="inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full border border-[color:var(--border-subtle)] text-[color:var(--text-muted)] hover:border-[color:var(--brand-primary)] hover:text-[color:var(--brand-primary)] transition"
                >
                  <Brain className="w-3 h-3" />
                  {selectedLead.aiEnabled ? "Desactivar IA" : "Activar IA"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseDetails}
                  className="p-1.5 rounded-full hover:bg-black/20"
                >
                  <X className="w-4 h-4 text-[color:var(--text-muted)]" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Columna izquierda: campos clave y edición rápida */}
              <div className="space-y-4 md:col-span-2">
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    Información del lead
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] text-[color:var(--text-muted)]">
                        Nombre del contacto
                      </p>
                      <p className="font-medium">{selectedLead.name}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[color:var(--text-muted)]">
                        Empresa / negocio
                      </p>
                      <p>{selectedLead.company || "Sin empresa"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[color:var(--text-muted)]">
                        Teléfono
                      </p>
                      <p>{selectedLead.phone || "Sin teléfono"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[color:var(--text-muted)]">
                        Correo electrónico
                      </p>
                      <p>{selectedLead.email || "Sin correo"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[color:var(--text-muted)]">
                        Valor estimado
                      </p>
                      <p className="font-semibold text-[color:var(--brand-primary)]">
                        {selectedLead.value}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[color:var(--text-muted)]">
                        Estado (etapa actual)
                      </p>
                      <p>{selectedLead.stage_key}</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    Productos / servicios
                  </h3>
                  {selectedLead.products && selectedLead.products.length > 0 ? (
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {selectedLead.products.map((p, idx) => (
                        <span
                          key={`${p.name}-${idx}`}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] ${
                            p.isPrimary
                              ? "border-[color:var(--brand-primary)] text-[color:var(--brand-primary)] bg-[color:var(--brand-primary-soft)]"
                              : "border-[color:var(--border-subtle)] text-[color:var(--text-muted)]"
                          }`}
                        >
                          {p.isPrimary && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--brand-primary)]" />
                          )}
                          {p.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[color:var(--text-muted)]">
                      Sin productos asignados todavía.
                    </p>
                  )}
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)] flex items-center gap-1">
                    <Brain className="w-3 h-3" />
                    Resumen inteligente
                  </h3>
                  <p className="text-[11px] text-[color:var(--text-muted)]">
                    Aquí podemos guardar el resumen generado por la IA para que
                    el titular tenga siempre el contexto más importante sin
                    leer toda la conversación.
                  </p>
                  <div className="border border-[color:var(--border-subtle)] rounded-lg bg-black/20 p-3 text-sm">
                    {selectedLead.summary
                      ? selectedLead.summary
                      : "Aún no hay resumen guardado para este lead."}
                  </div>
                </section>
              </div>

              {/* Columna derecha: notas, recordatorios, IA */}
              <div className="space-y-4">
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)] flex items-center gap-1">
                    <StickyNote className="w-3 h-3" />
                    Notas internas
                  </h3>
                  <p className="text-[11px] text-[color:var(--text-muted)]">
                    Notas rápidas del titular o del equipo. Después podemos
                    guardar quién escribió cada nota.
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedLead.notes && selectedLead.notes.length > 0 ? (
                      selectedLead.notes.map((note) => (
                        <div
                          key={note.id}
                          className="border border-[color:var(--border-subtle)] rounded-lg bg-black/20 px-2.5 py-2"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                              {note.author === "ia" ? "IA" : "Titular"}
                            </span>
                            <span className="text-[10px] text-[color:var(--text-muted)]">
                              {new Date(note.created_at).toLocaleString(
                                "es-MX",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>
                          <p className="text-[11px]">{note.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-[color:var(--text-muted)]">
                        Aún no hay notas guardadas.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="mt-1 inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full border border-[color:var(--border-subtle)] text-[color:var(--text-muted)] hover:border-[color:var(--brand-primary)] hover:text-[color:var(--brand-primary)] transition"
                  >
                    + Agregar nota
                  </button>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)] flex items-center gap-1">
                    <Bell className="w-3 h-3" />
                    Recordatorios
                  </h3>
                  {selectedLead.reminders && selectedLead.reminders.length > 0 ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {selectedLead.reminders.map((reminder) => (
                        <div
                          key={reminder.id}
                          className="border border-[color:var(--border-subtle)] rounded-lg bg-black/20 px-2.5 py-2 flex items-center justify-between gap-2"
                        >
                          <div>
                            <p className="text-[11px]">{reminder.text}</p>
                            <p className="text-[10px] text-[color:var(--text-muted)]">
                              Para:{" "}
                              {new Date(reminder.due_at).toLocaleString(
                                "es-MX",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </p>
                          </div>
                          <span className="text-[10px] text-[color:var(--text-muted)]">
                            {reminder.active ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[color:var(--text-muted)]">
                      Sin recordatorios aún.
                    </p>
                  )}
                  <button
                    type="button"
                    className="mt-1 inline-flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-full border border-[color:var(--border-subtle)] text-[color:var(--text-muted)] hover:border-[color:var(--brand-primary)] hover:text-[color:var(--brand-primary)] transition"
                  >
                    + Programar recordatorio
                  </button>
                </section>
              </div>
            </div>

            {/* Aquí luego podemos meter historial de cambios, IA vs titular, etc. */}
            <footer className="px-6 py-3 border-t border-[color:var(--border-subtle)] text-[10px] text-[color:var(--text-muted)] flex items-center justify-between">
              <span>
                Más adelante aquí podemos mostrar historial de cambios de etapa
                (IA vs titular) y eventos importantes.
              </span>
              <button
                type="button"
                onClick={handleCloseDetails}
                className="text-[11px] px-3 py-1.5 rounded-full border border-[color:var(--border-subtle)] hover:bg-black/30"
              >
                Cerrar
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
