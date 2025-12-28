"use client";

import { useEffect, useMemo, useState } from "react";

type BotProfile = {
  id: number;
  tenant_id: number;
  name: string;
  ai_enabled: boolean;
  tone: string | null;
  attitude: string | null;
  purpose: string | null;
  use_custom_prompt: boolean;
  custom_prompt: string | null;
  policies: any;
  config_version: number;
  updated_at: string;
};

type TenantRuntime = {
  ai_force_off: boolean;
  ai_disabled_until: string | null;
  ai_disabled_reason: string | null;

  // cooldown config (ya existe en tu schema)
  human_outbound_ai_behavior: string; // "cooldown" | "none" | ...
  human_outbound_cooldown_minutes: number; // minutos (int)
};

type TabKey = "general" | "personalizacion" | "conocimiento";

function cn(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

function parseLines(text: string) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function SpotlightCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  return (
    <div
      onMouseMove={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 backdrop-blur-xl",
        "shadow-[0_10px_40px_-14px_rgba(0,0,0,0.75)]",
        "transition-colors hover:border-blue-500/30",
        className
      )}
    >
      {/* noise */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
        }}
      />
      {/* spotlight */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 hover:opacity-100"
        style={{
          background: `radial-gradient(800px circle at ${pos.x}px ${pos.y}px, rgba(255,255,255,0.06), transparent 40%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </div>
      {children}
      {hint ? <div className="text-[11px] text-zinc-500">{hint}</div> : null}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-200",
        "placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30",
        props.className
      )}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full min-h-[120px] rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-200",
        "placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30",
        props.className
      )}
    />
  );
}

function Toggle({
  value,
  onChange,
  label,
  desc,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white truncate">{label}</div>
        {desc ? <div className="text-[11px] text-zinc-500">{desc}</div> : null}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          "h-8 w-14 rounded-full border transition relative",
          value ? "bg-blue-500/20 border-blue-500/40" : "bg-zinc-900/60 border-white/10"
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-full transition",
            value ? "left-7 bg-blue-500" : "left-1 bg-zinc-600"
          )}
        />
      </button>
    </div>
  );
}

function Tabs({ tab, setTab }: { tab: TabKey; setTab: (t: TabKey) => void }) {
  const items: Array<{ key: TabKey; label: string; desc: string }> = [
    { key: "general", label: "General", desc: "Controles básicos" },
    { key: "personalizacion", label: "Personalización", desc: "Modo guiado o prompt" },
    { key: "conocimiento", label: "Conocimiento", desc: "Base del negocio" },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {items.map((it) => {
        const active = tab === it.key;
        return (
          <button
            key={it.key}
            onClick={() => setTab(it.key)}
            className={cn(
              "px-4 py-2 rounded-2xl border text-left transition",
              active
                ? "border-blue-500/35 bg-blue-500/10 text-white"
                : "border-white/10 bg-zinc-950/30 text-zinc-300 hover:bg-white/5"
            )}
          >
            <div className="text-sm font-semibold">{it.label}</div>
            <div className="text-[11px] text-zinc-500">{it.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

const COOLDOWN_OPTIONS: Array<{ label: string; minutes: number }> = [
  { label: "5 min", minutes: 5 },
  { label: "10 min", minutes: 10 },
  { label: "15 min", minutes: 15 },
  { label: "20 min", minutes: 20 },
  { label: "30 min", minutes: 30 },
  { label: "1 hr", minutes: 60 },
  { label: "2 hrs", minutes: 120 },
  { label: "3 hrs", minutes: 180 },
  { label: "6 hrs", minutes: 360 },
  { label: "24 hrs", minutes: 1440 },
  { label: "48 hrs", minutes: 2880 },
  // IMPORTANTE: "Permanente" lo mandamos como 0 minutos.
  // Tu WF outbound puede interpretarlo como:
  // -> en vez de ai_disabled_until, setear ai_force_off=true para esa conversación.
  { label: "Permanente (hasta reactivar)", minutes: 0 },
];

export default function BotConfigPage() {
  const [tab, setTab] = useState<TabKey>("general");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [profile, setProfile] = useState<BotProfile | null>(null);
  const [tenantRuntime, setTenantRuntime] = useState<TenantRuntime | null>(null);

  // -----------------------
  // GENERAL (definitivo)
  // -----------------------
  const [botName, setBotName] = useState("Default");

  // IA GLOBAL: true = fuerza off (apaga respuestas)
  const [tenantAiForceOff, setTenantAiForceOff] = useState(false);

  // IA DEL BOT (perfil)
  const [botAiEnabled, setBotAiEnabled] = useState(true);

  // Cooldown config (tenant-level config, aplica cuando humano manda outbound)
  const [cooldownEnabled, setCooldownEnabled] = useState(false);
  const [cooldownMinutes, setCooldownMinutes] = useState<number>(10);

  // -----------------------
  // PERSONALIZACIÓN
  // -----------------------
  const [mode, setMode] = useState<"guided" | "prompt">("guided");

  // Guided fields
  const [tone, setTone] = useState("");
  const [attitude, setAttitude] = useState("");
  const [purpose, setPurpose] = useState("");

  const [procedures, setProcedures] = useState("");
  const [canDo, setCanDo] = useState("");
  const [cannotDo, setCannotDo] = useState("");
  const [escalation, setEscalation] = useState("");
  const [limitations, setLimitations] = useState("");

  // Prompt
  const [customPrompt, setCustomPrompt] = useState("");

  // Rules (para ambos modos)
  const [avoidPhrases, setAvoidPhrases] = useState("");
  const [preferredPhrases, setPreferredPhrases] = useState("");
  const [alwaysDo, setAlwaysDo] = useState("");
  const [neverDo, setNeverDo] = useState("");

  // -----------------------
  // CONOCIMIENTO
  // -----------------------
  const [knowledgeRaw, setKnowledgeRaw] = useState("");

  // Snapshot inicial para detectar cambios (dirty)
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const [resProfile, resRuntime] = await Promise.all([
          fetch("/api/bot-profile", { cache: "no-store" }),
          fetch("/api/tenant-runtime", { cache: "no-store" }),
        ]);

        const pj = await resProfile.json();
        const rj = await resRuntime.json();

        const p: BotProfile = pj?.data?.profile;
        const rt: TenantRuntime = rj?.data;

        setProfile(p);
        setTenantRuntime(rt);

        // Hydrate GENERAL
        setBotName(p?.name ?? "Default");
        setBotAiEnabled(!!p?.ai_enabled);
        setTenantAiForceOff(!!rt?.ai_force_off);

        const behavior = (rt?.human_outbound_ai_behavior ?? "none").toLowerCase();
        const enabled = behavior === "cooldown";
        setCooldownEnabled(enabled);
        setCooldownMinutes(
          Number.isFinite(rt?.human_outbound_cooldown_minutes)
            ? (rt?.human_outbound_cooldown_minutes ?? 10)
            : 10
        );

        // Hydrate PERSONALIZACIÓN
        const usePrompt = !!p?.use_custom_prompt;
        setMode(usePrompt ? "prompt" : "guided");
        setCustomPrompt(p?.custom_prompt ?? "");

        setTone(p?.tone ?? "");
        setAttitude(p?.attitude ?? "");
        setPurpose(p?.purpose ?? "");

        const pol = p?.policies ?? {};
        const cfg = pol?.config ?? {};
        const vibes = pol?.vibes ?? {};
        const styleRules = vibes?.style_rules ?? {};
        const behaviorPol = pol?.behavior ?? {};
        const guided = pol?.guided ?? {};

        setProcedures(guided?.procedures ?? "");
        setCanDo(guided?.can_do ?? "");
        setCannotDo(guided?.cannot_do ?? "");
        setEscalation(guided?.escalation ?? "");
        setLimitations(guided?.limitations ?? "");

        setAvoidPhrases((styleRules?.avoid_phrases ?? []).join("\n"));
        setPreferredPhrases((styleRules?.preferred_phrases ?? []).join("\n"));
        setAlwaysDo((behaviorPol?.always_do ?? []).join("\n"));
        setNeverDo((behaviorPol?.never_do ?? []).join("\n"));

        // Knowledge
        const kb = pol?.knowledge ?? {};
        setKnowledgeRaw(kb?.raw_text ?? "");

        // Snapshot inicial
        const snap = JSON.stringify({
          general: {
            botName: p?.name ?? "Default",
            tenantAiForceOff: !!rt?.ai_force_off,
            botAiEnabled: !!p?.ai_enabled,
            cooldownEnabled: enabled,
            cooldownMinutes:
              Number.isFinite(rt?.human_outbound_cooldown_minutes)
                ? (rt?.human_outbound_cooldown_minutes ?? 10)
                : 10,
          },
          personalization: {
            mode: usePrompt ? "prompt" : "guided",
            tone: p?.tone ?? "",
            attitude: p?.attitude ?? "",
            purpose: p?.purpose ?? "",
            procedures: guided?.procedures ?? "",
            canDo: guided?.can_do ?? "",
            cannotDo: guided?.cannot_do ?? "",
            escalation: guided?.escalation ?? "",
            limitations: guided?.limitations ?? "",
            customPrompt: p?.custom_prompt ?? "",
            rules: {
              avoidPhrases: (styleRules?.avoid_phrases ?? []).join("\n"),
              preferredPhrases: (styleRules?.preferred_phrases ?? []).join("\n"),
              alwaysDo: (behaviorPol?.always_do ?? []).join("\n"),
              neverDo: (behaviorPol?.never_do ?? []).join("\n"),
            },
          },
          knowledge: {
            raw: kb?.raw_text ?? "",
          },
        });

        setInitialSnapshot(snap);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const policies = useMemo(() => {
    return {
      // guardamos explícito el modo elegido, para que tu agente lo lea fácil
      config: {
        mode, // "guided" | "prompt"
      },
      vibes: {
        tone, // redundante intencional: también va en columna, pero lo dejamos aquí para snapshot
        style_rules: {
          avoid_phrases: parseLines(avoidPhrases),
          preferred_phrases: parseLines(preferredPhrases),
        },
      },
      behavior: {
        always_do: parseLines(alwaysDo),
        never_do: parseLines(neverDo),
      },
      guided: {
        procedures: procedures.trim(),
        can_do: canDo.trim(),
        cannot_do: cannotDo.trim(),
        escalation: escalation.trim(),
        limitations: limitations.trim(),
      },
      knowledge: {
        raw_text: knowledgeRaw,
        source: "external_or_manual",
      },
    };
  }, [
    mode,
    tone,
    avoidPhrases,
    preferredPhrases,
    alwaysDo,
    neverDo,
    procedures,
    canDo,
    cannotDo,
    escalation,
    limitations,
    knowledgeRaw,
  ]);

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      general: {
        botName,
        tenantAiForceOff,
        botAiEnabled,
        cooldownEnabled,
        cooldownMinutes,
      },
      personalization: {
        mode,
        tone,
        attitude,
        purpose,
        procedures,
        canDo,
        cannotDo,
        escalation,
        limitations,
        customPrompt,
        rules: { avoidPhrases, preferredPhrases, alwaysDo, neverDo },
      },
      knowledge: { raw: knowledgeRaw },
    });
  }, [
    botName,
    tenantAiForceOff,
    botAiEnabled,
    cooldownEnabled,
    cooldownMinutes,
    mode,
    tone,
    attitude,
    purpose,
    procedures,
    canDo,
    cannotDo,
    escalation,
    limitations,
    customPrompt,
    avoidPhrases,
    preferredPhrases,
    alwaysDo,
    neverDo,
    knowledgeRaw,
  ]);

  const isDirty = useMemo(() => {
    if (!initialSnapshot) return false;
    return currentSnapshot !== initialSnapshot;
  }, [currentSnapshot, initialSnapshot]);

  const globalAiOn = !tenantAiForceOff;
  const effectiveAiReadable =
    globalAiOn && botAiEnabled ? "Operativa (sujeta a Guard/cooldown)" : "Bloqueada";

  const saveAll = async () => {
    try {
      setSaving(true);

      // 1) Guardar runtime del tenant (global + cooldown config)
      await fetch("/api/tenant-runtime", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_force_off: tenantAiForceOff,
          ai_disabled_reason: "manual",
          human_outbound_ai_behavior: cooldownEnabled ? "cooldown" : "none",
          human_outbound_cooldown_minutes: cooldownEnabled ? Number(cooldownMinutes) : 0,
        }),
      });

      // 2) Guardar bot profile
      const use_custom_prompt = mode === "prompt";

      const res = await fetch("/api/bot-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: botName,
          ai_enabled: botAiEnabled,

          // columnas (core vibes)
          tone,
          attitude,
          purpose,

          // modo + prompt
          use_custom_prompt,
          custom_prompt: customPrompt,

          // policies (extended)
          policies,
        }),
      });

      const json = await res.json();
      const p: BotProfile = json?.data?.profile;
      setProfile(p);

      setSavedAt(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));

      // actualizar snapshot para que deje de mostrar "pendiente"
      setInitialSnapshot(currentSnapshot);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 pt-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-white tracking-tight">Bot Config</h1>
            <span className="px-3 py-1 rounded-full text-[11px] border border-blue-500/25 bg-blue-500/10 text-blue-200">
              {effectiveAiReadable}
            </span>
          </div>
          <p className="text-zinc-500 mt-1 font-medium">
            Configuración por secciones. Control real (sin mezclar cosas).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {profile ? (
            <div className="text-[11px] text-zinc-500">
              v{profile.config_version} ·{" "}
              {savedAt ? `guardado ${savedAt}` : isDirty ? "cambios pendientes" : "sin cambios"}
            </div>
          ) : null}

          <button
            onClick={saveAll}
            disabled={loading || saving || !isDirty}
            className={cn(
              "h-10 px-4 rounded-full border text-sm font-semibold transition",
              "border-blue-500/30 bg-blue-500/15 text-blue-100 hover:bg-blue-500/20",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>

      {/* Banner: solo cuando hay cambios */}
      {isDirty ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">
          <span className="font-semibold text-white">Nota:</span> Los cambios{" "}
          <span className="font-semibold">no se guardan</span> hasta que presiones{" "}
          <span className="font-semibold">“Guardar cambios”</span>.
        </div>
      ) : null}

      <Tabs tab={tab} setTab={setTab} />

      {loading ? (
        <div className="text-sm text-zinc-500">Cargando configuración…</div>
      ) : (
        <>
          {/* -------------------- GENERAL -------------------- */}
          {tab === "general" && (
            <div className="grid gap-6 lg:grid-cols-3">
              <SpotlightCard className="p-6 lg:col-span-1">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Básico
                    </div>
                    <div className="text-lg font-semibold text-white mt-1">Identidad</div>
                  </div>
                  <div className="h-10 w-10 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-200">
                    🤖
                  </div>
                </div>

                <div className="space-y-4">
                  <Field
                    label="Nombre del bot"
                    hint="Esto es identidad. No cambia la lógica; sirve para UI, logging y contexto."
                  >
                    <Input
                      value={botName}
                      onChange={(e) => setBotName(e.target.value)}
                      placeholder="Ej. Convi-Bot"
                    />
                  </Field>
                </div>
              </SpotlightCard>

              <SpotlightCard className="p-6 lg:col-span-2">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Operación
                    </div>
                    <div className="text-lg font-semibold text-white mt-1">IA (controles)</div>
                  </div>

                  <div className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase border border-white/10 bg-white/5 text-zinc-200">
                    runtime + bot profile
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <SpotlightCard className="p-5 bg-zinc-950/30">
                    <Toggle
                      value={!tenantAiForceOff}
                      onChange={(v) => setTenantAiForceOff(!v)}
                      label={!tenantAiForceOff ? "IA Global: ON" : "IA Global: OFF"}
                      desc="Apaga/enciende RESPUESTAS del bot para toda la cuenta. El resto del sistema sigue funcionando."
                    />
                    <div className="mt-3 text-[11px] text-zinc-500">
                      Úsalo como “apagado de emergencia” sin cambiar configuraciones del bot.
                    </div>
                  </SpotlightCard>

                  <SpotlightCard className="p-5 bg-zinc-950/30">
                    <Toggle
                      value={botAiEnabled}
                      onChange={setBotAiEnabled}
                      label={botAiEnabled ? "IA del Bot: ON" : "IA del Bot: OFF"}
                      desc="Apaga/enciende solo este asistente. No afecta la configuración global."
                    />
                    <div className="mt-3 text-[11px] text-zinc-500">
                      El AI Guard (cooldown/conversación) sigue aplicando.
                    </div>
                  </SpotlightCard>
                </div>

                <div className="mt-6 grid md:grid-cols-2 gap-6">
                  <SpotlightCard className="p-5 bg-zinc-950/30 md:col-span-2">
                    <div className="flex items-start justify-between gap-6">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">Cooldown automático</div>
                        <div className="text-[11px] text-zinc-500 mt-1">
                          Si un humano envía un mensaje, la IA se pausa temporalmente (por conversación).
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCooldownEnabled((v) => !v)}
                        className={cn(
                          "h-8 w-14 rounded-full border transition relative shrink-0",
                          cooldownEnabled
                            ? "bg-blue-500/20 border-blue-500/40"
                            : "bg-zinc-900/60 border-white/10"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-full transition",
                            cooldownEnabled ? "left-7 bg-blue-500" : "left-1 bg-zinc-600"
                          )}
                        />
                      </button>
                    </div>

                    {cooldownEnabled ? (
                      <div className="mt-4 grid md:grid-cols-2 gap-4">
                        <Field
                          label="Duración del cooldown"
                          hint="Se guarda en minutos (DB). Si eliges “Permanente”, mandamos 0 minutos para que lo trates como bloqueo manual."
                        >
                          <select
                            value={String(cooldownMinutes)}
                            onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                            className={cn(
                              "w-full rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-200",
                              "outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30"
                            )}
                          >
                            {COOLDOWN_OPTIONS.map((o) => (
                              <option key={o.label} value={String(o.minutes)}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-[11px] text-zinc-300">
                          <div className="font-semibold text-white mb-1">Qué pasa cuando aplica:</div>
                          <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                            <li>La IA NO responde en esa conversación durante el tiempo elegido.</li>
                            <li>No cambia tu configuración; solo bloquea temporalmente.</li>
                            <li>Cuando vence el tiempo, se reactiva sola (sin cron).</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-[11px] text-zinc-500">
                        OFF por defecto. La IA no se pausa automáticamente cuando un humano escribe.
                      </div>
                    )}
                  </SpotlightCard>
                </div>
              </SpotlightCard>
            </div>
          )}

          {/* -------------------- PERSONALIZACIÓN -------------------- */}
          {tab === "personalizacion" && (
            <div className="space-y-6">
              <SpotlightCard className="p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Modo de configuración
                    </div>
                    <div className="text-lg font-semibold text-white mt-1">
                      Guiado o Prompt
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1">
                      Elige una forma de configurar. Se guarda para que el agente sepa qué usar.
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
                    <button
                      onClick={() => setMode("guided")}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-semibold transition",
                        mode === "guided"
                          ? "bg-blue-500/20 text-white border border-blue-500/30"
                          : "text-zinc-300 hover:bg-white/5"
                      )}
                    >
                      Modo guiado
                    </button>
                    <button
                      onClick={() => setMode("prompt")}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-semibold transition",
                        mode === "prompt"
                          ? "bg-blue-500/20 text-white border border-blue-500/30"
                          : "text-zinc-300 hover:bg-white/5"
                      )}
                    >
                      Modo prompt
                    </button>
                  </div>
                </div>
              </SpotlightCard>

              {mode === "guided" ? (
                <div className="grid gap-6 lg:grid-cols-3">
                  <SpotlightCard className="p-6 lg:col-span-1">
                    <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      VIBES
                    </div>
                    <div className="text-lg font-semibold text-white mt-1">
                      Identidad del asistente
                    </div>

                    <div className="mt-4 space-y-4">
                      <Field label="Tono" hint="Ej. profesional, directo, empático, técnico…">
                        <Input value={tone} onChange={(e) => setTone(e.target.value)} />
                      </Field>

                      <Field label="Actitud" hint="Ej. calmado, resolutivo, cercano…">
                        <Input value={attitude} onChange={(e) => setAttitude(e.target.value)} />
                      </Field>

                      <Field label="Propósito principal" hint="Qué debe lograr siempre.">
                        <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} />
                      </Field>
                    </div>
                  </SpotlightCard>

                  <div className="lg:col-span-2 space-y-6">
                    <SpotlightCard className="p-6">
                      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Procedimientos
                      </div>
                      <div className="text-lg font-semibold text-white mt-1">Cómo debe operar</div>
                      <div className="mt-4">
                        <Textarea
                          value={procedures}
                          onChange={(e) => setProcedures(e.target.value)}
                          placeholder="Ej. 1) Saluda y confirma nombre 2) Identifica servicio 3) Califica 4) Agenda 5) Confirma…"
                          className="min-h-[180px]"
                        />
                      </div>
                    </SpotlightCard>

                    <div className="grid md:grid-cols-2 gap-6">
                      <SpotlightCard className="p-6">
                        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                          Alcance
                        </div>
                        <div className="text-lg font-semibold text-white mt-1">Qué sí / qué no</div>
                        <div className="mt-4 space-y-4">
                          <Field label="Qué SÍ puede hacer">
                            <Textarea value={canDo} onChange={(e) => setCanDo(e.target.value)} />
                          </Field>
                          <Field label="Qué NO puede hacer">
                            <Textarea value={cannotDo} onChange={(e) => setCannotDo(e.target.value)} />
                          </Field>
                        </div>
                      </SpotlightCard>

                      <SpotlightCard className="p-6">
                        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                          Escalamiento
                        </div>
                        <div className="text-lg font-semibold text-white mt-1">Cuándo pasar a humano</div>
                        <div className="mt-4 space-y-4">
                          <Field label="Reglas para escalar">
                            <Textarea value={escalation} onChange={(e) => setEscalation(e.target.value)} />
                          </Field>
                          <Field label="Limitaciones / políticas">
                            <Textarea value={limitations} onChange={(e) => setLimitations(e.target.value)} />
                          </Field>
                        </div>
                      </SpotlightCard>
                    </div>
                  </div>
                </div>
              ) : (
                <SpotlightCard className="p-6">
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Prompt principal
                  </div>
                  <div className="text-lg font-semibold text-white mt-1">Custom Prompt</div>
                  <div className="text-[11px] text-zinc-500 mt-1">
                    Este modo usa tu prompt como base. Las reglas de abajo pueden aplicarse como “apéndice” si así lo decides en el agente.
                  </div>

                  <div className="mt-4">
                    <Textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Pega aquí el prompt principal del bot…"
                      className="min-h-[280px]"
                    />
                  </div>
                </SpotlightCard>
              )}

              {/* REGLAS (para ambos modos) */}
              <div className="grid md:grid-cols-2 gap-6">
                <SpotlightCard className="p-6">
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Reglas de lenguaje
                  </div>
                  <div className="text-lg font-semibold text-white mt-1">Cómo escribe</div>

                  <div className="mt-4 space-y-4">
                    <Field label="Frases a evitar (1 por línea)">
                      <Textarea value={avoidPhrases} onChange={(e) => setAvoidPhrases(e.target.value)} />
                    </Field>
                    <Field label="Frases preferidas (1 por línea)">
                      <Textarea value={preferredPhrases} onChange={(e) => setPreferredPhrases(e.target.value)} />
                    </Field>
                  </div>
                </SpotlightCard>

                <SpotlightCard className="p-6">
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Reglas de comportamiento
                  </div>
                  <div className="text-lg font-semibold text-white mt-1">Cómo decide</div>

                  <div className="mt-4 space-y-4">
                    <Field label="Siempre hacer (1 por línea)">
                      <Textarea value={alwaysDo} onChange={(e) => setAlwaysDo(e.target.value)} />
                    </Field>
                    <Field label="Nunca hacer (1 por línea)">
                      <Textarea value={neverDo} onChange={(e) => setNeverDo(e.target.value)} />
                    </Field>
                  </div>
                </SpotlightCard>
              </div>
            </div>
          )}

          {/* -------------------- CONOCIMIENTO -------------------- */}
          {tab === "conocimiento" && (
            <SpotlightCard className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Base de conocimientos
                  </div>
                  <div className="text-lg font-semibold text-white mt-1">
                    Información del negocio
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">
                    Aquí va la info base. Luego lo conectamos a vector DB por proyecto.
                  </div>
                </div>

                <div className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase border border-white/10 bg-white/5 text-zinc-200">
                  placeholder (vector después)
                </div>
              </div>

              <div className="mt-4">
                <Textarea
                  value={knowledgeRaw}
                  onChange={(e) => setKnowledgeRaw(e.target.value)}
                  placeholder="Horarios, servicios, políticas, precios base, ubicaciones, FAQ, etc…"
                  className="min-h-[320px]"
                />
              </div>
            </SpotlightCard>
          )}
        </>
      )}
    </div>
  );
}
