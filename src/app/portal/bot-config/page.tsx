"use client";

import { useEffect, useMemo, useState } from "react";

type BotProfile = {
  id: number;
  tenant_id: number;
  ai_enabled: boolean;
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

function Toggle({ value, onChange, label, desc }: { value: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
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
          "h-10 w-20 flex items-center rounded-full border-2 transition-all duration-300 relative shadow-lg group focus:outline-none",
          value
            ? "bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600 border-blue-400/70"
            : "bg-zinc-800 border-zinc-700"
        )}
        style={{ boxShadow: value ? '0 2px 16px 0 rgba(56,189,248,0.25)' : '0 1px 4px 0 rgba(0,0,0,0.15)' }}
        aria-pressed={value}
      >
        <span
          className={cn(
            "absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white shadow-md transition-all duration-300",
            value ? "translate-x-10 bg-gradient-to-br from-blue-400 to-blue-600" : "bg-zinc-300"
          )}
        />
        <span className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold transition-all duration-300 select-none",
          value ? "opacity-0" : "opacity-100 text-zinc-500"
        )}>OFF</span>
        <span className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold transition-all duration-300 select-none",
          value ? "opacity-100 text-blue-100" : "opacity-0"
        )}>ON</span>
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
  // Solo sección general
  const [tab] = useState<TabKey>("general");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [profile, setProfile] = useState<BotProfile | null>(null);
  const [tenantRuntime, setTenantRuntime] = useState<TenantRuntime | null>(null);

  // -----------------------
  // GENERAL (definitivo)
  // -----------------------
  // Eliminado: nombre del bot

  // IA GLOBAL: true = fuerza off (apaga respuestas)
  const [tenantAiForceOff, setTenantAiForceOff] = useState(false);

  // IA DEL BOT (perfil)
  const [botAiEnabled, setBotAiEnabled] = useState(true);

  // Cooldown config (tenant-level config, aplica cuando humano manda outbound)
  const [cooldownEnabled, setCooldownEnabled] = useState(false);
  const [cooldownMinutes, setCooldownMinutes] = useState<number>(10);

  // Eliminado: personalización, prompt, reglas, conocimiento

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
        // Snapshot solo de general
        const snap = JSON.stringify({
          general: {
            tenantAiForceOff: !!rt?.ai_force_off,
            botAiEnabled: !!p?.ai_enabled,
            cooldownEnabled: enabled,
            cooldownMinutes:
              Number.isFinite(rt?.human_outbound_cooldown_minutes)
                ? (rt?.human_outbound_cooldown_minutes ?? 10)
                : 10,
          },
        });
        setInitialSnapshot(snap);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Eliminado: policies y personalización

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      general: {
        tenantAiForceOff,
        botAiEnabled,
        cooldownEnabled,
        cooldownMinutes,
      },
    });
  }, [tenantAiForceOff, botAiEnabled, cooldownEnabled, cooldownMinutes]);

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
      // 2) Guardar solo IA del bot
      const res = await fetch("/api/bot-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_enabled: botAiEnabled,
        }),
      });
      const json = await res.json();
      const p: BotProfile = json?.data?.profile;
      setProfile(p);
      setSavedAt(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
      setInitialSnapshot(currentSnapshot);
    } finally {
      setSaving(false);
    }
  };

    return (
      <div className="min-h-screen w-full bg-zinc-950/95 p-8 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Controles de IA</h1>
            <span className="inline-block px-3 py-1 rounded-full text-xs border border-blue-500/25 bg-blue-500/10 text-blue-200 font-semibold">
              {effectiveAiReadable}
            </span>
          </div>
          <button
            onClick={saveAll}
            disabled={loading || saving || !isDirty}
            className={cn(
              "relative h-12 px-8 rounded-full font-bold text-base transition-all duration-300 overflow-hidden group border-2",
              "bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600 border-blue-400/70 text-white shadow-lg",
              "hover:from-blue-600 hover:to-cyan-500 hover:scale-105 active:scale-95",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <span className="relative z-10">{saving ? "Guardando…" : "Guardar cambios"}</span>
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/10" />
          </button>
        </div>
        {isDirty ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">
            <span className="font-semibold text-white">Nota:</span> Los cambios <span className="font-semibold">no se guardan</span> hasta que presiones <span className="font-semibold">“Guardar cambios”</span>.
          </div>
        ) : null}
        {loading ? (
          <div className="text-sm text-zinc-500">Cargando configuración…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {/* IA Global */}
            <div className="rounded-3xl bg-gradient-to-br from-zinc-900/90 to-zinc-800/80 border border-blue-900/30 shadow-xl p-8 flex flex-col gap-4 min-h-[220px]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-lg font-bold text-white mb-1">IA Global: {tenantAiForceOff ? 'OFF' : 'ON'}</div>
                  <div className="text-zinc-400 text-sm">Apaga/enciende RESPUESTAS del bot para toda la cuenta. El resto del sistema sigue funcionando.</div>
                </div>
                <Toggle
                  value={!tenantAiForceOff}
                  onChange={(v) => setTenantAiForceOff(!v)}
                  label={''}
                />
              </div>
              <div className="text-xs text-zinc-500 mt-2">Úsalo como “apagado de emergencia” sin cambiar configuraciones del bot.</div>
            </div>
            {/* IA del Bot */}
            <div className="rounded-3xl bg-gradient-to-br from-zinc-900/90 to-zinc-800/80 border border-blue-900/30 shadow-xl p-8 flex flex-col gap-4 min-h-[220px]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-lg font-bold text-white mb-1">IA del Bot {botAiEnabled ? 'ON' : 'OFF'}</div>
                  <div className="text-zinc-400 text-sm">Apaga/enciende solo este asistente. No afecta la configuración global.</div>
                </div>
                <Toggle
                  value={botAiEnabled}
                  onChange={setBotAiEnabled}
                  label={''}
                />
              </div>
              <div className="text-xs text-zinc-500 mt-2">El AI Guard (cooldown/conversación) sigue aplicando.</div>
            </div>
            {/* Cooldown automático */}
            <div className="rounded-3xl bg-gradient-to-br from-zinc-900/90 to-zinc-800/80 border border-blue-900/30 shadow-xl p-8 flex flex-col gap-4 min-h-[220px]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-lg font-bold text-white mb-1">Cooldown automático</div>
                  <div className="text-zinc-400 text-sm">Si un humano envía un mensaje, la IA se pausa temporalmente (por conversación).</div>
                </div>
                <Toggle
                  value={cooldownEnabled}
                  onChange={setCooldownEnabled}
                  label={''}
                />
              </div>
              {cooldownEnabled ? (
                <div className="mt-4 flex flex-col gap-2">
                  <Field label="Duración del cooldown" hint="Se guarda en minutos (DB). Si eliges “Permanente”, mandamos 0 minutos para que lo trates como bloqueo manual.">
                    <select
                      value={String(cooldownMinutes)}
                      onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                      className={cn(
                        "w-full rounded-xl border border-white/10 bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-200",
                        "outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30"
                      )}
                    >
                      {COOLDOWN_OPTIONS.map((o) => (
                        <option key={o.label} value={String(o.minutes)}>{o.label}</option>
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
                <div className="mt-3 text-[11px] text-zinc-500">OFF por defecto. La IA no se pausa automáticamente cuando un humano escribe.</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
}
