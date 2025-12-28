"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Check, AlertCircle, Wifi, WifiOff, QrCode, Settings, Copy, Eye, EyeOff } from "lucide-react";

type ChannelAccount = {
  id: number;
  tenant_id: number;
  channel_type: string;
  provider: string;
  account_label: string | null;
  account_type: string | null;
  phone_e164: string | null;
  is_default: boolean;
  is_active: boolean;
  provider_account_id: string | null;
  created_at: string;
};

type StatusUi = "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "NO_ACCOUNT" | "NO_INSTANCE";

async function apiFetch(url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers: { ...(init.headers || {}) },
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return { res, json };
}

export default function WhatsAppConnectPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const [acc, setAcc] = useState<ChannelAccount | null>(null);
  const [status, setStatus] = useState<StatusUi>("DISCONNECTED");
  const [qr, setQr] = useState<string | null>(null);

  const [alwaysOnline, setAlwaysOnline] = useState(true);
  const [rejectCalls, setRejectCalls] = useState(true);
  const [rejectCallsMsg, setRejectCallsMsg] = useState("No puedo tomar llamadas. Escríbeme por WhatsApp.");
  const [markReadStatus, setMarkReadStatus] = useState(false);

  const hasInstance = useMemo(() => !!acc?.provider_account_id, [acc?.provider_account_id]);
  const isConnected = status === "CONNECTED";

  const loadAccount = async () => {
    setLoading(true);
    const { res, json } = await apiFetch("/api/channels/whatsapp");
    if (res.status === 401) return (window.location.href = "/login");

    setAcc(json?.data ?? null);
    setLoading(false);
  };

  const refreshStatus = async () => {
    const { res, json } = await apiFetch("/api/channels/whatsapp/status");
    if (res.status === 401) return (window.location.href = "/login");

    const s = (json?.data?.status ?? "DISCONNECTED") as StatusUi;
    setStatus(s);
  };

  const loadQr = async () => {
    setQr(null); // Clear immediately
    setShowQrModal(true); // Show modal while loading
    const { res, json } = await apiFetch("/api/channels/whatsapp/qr");
    if (res.status === 401) return (window.location.href = "/login");

    if (res.ok && json?.ok) setQr(json?.data?.qr ?? null);
    else setQr(null);
  };

  const saveSettings = async () => {
    setBusy(true);
    setSaveMessage(null);
    const { res, json } = await apiFetch("/api/channels/whatsapp/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        always_online: alwaysOnline,
        reject_calls: rejectCalls,
        reject_calls_message: rejectCallsMsg,
        mark_read_messages: false, // Always false
        mark_read_status: markReadStatus,
      }),
    });

    if (res.status === 401) return (window.location.href = "/login");

    if (res.ok && json?.ok) {
      setSaveMessage({ type: "success", text: "Configuración guardada correctamente" });
    } else {
      setSaveMessage({ type: "error", text: "Error al guardar configuración" });
    }
    setBusy(false);
    setTimeout(() => setSaveMessage(null), 4000);
  };

  // init
  useEffect(() => {
    (async () => {
      await loadAccount();
    })();
  }, []);

  // cuando ya hay account/instance, checa status y trae QR si no está conectado
  useEffect(() => {
    if (!hasInstance) {
      setStatus(acc ? "NO_INSTANCE" : "NO_ACCOUNT");
      return;
    }

    refreshStatus();
    // si no está conectado, intentamos QR
    // (si ya está conectado, no lo pedimos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInstance]);

  // polling suave cuando está “connecting”
  useEffect(() => {
    if (!hasInstance) return;
    if (status !== "CONNECTING") return;

    const t = setInterval(refreshStatus, 2500);
    return () => clearInterval(t);
  }, [hasInstance, status]);

  // limpiar QR y modal cuando se conecta
  useEffect(() => {
    if (status === "CONNECTED") {
      setQr(null);
      setShowQrModal(false);
    }
  }, [status]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">WhatsApp Integration</h1>
          <p className="text-sm text-zinc-400 mt-2">
            Powered by Evolution API • ~95% availability
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-zinc-500">
              <div className="animate-spin mb-3">⟳</div>
              Cargando configuración…
            </div>
          </div>
        ) : !acc ? (
          <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <div className="text-red-200">No hay cuenta de WhatsApp registrada</div>
            <div className="text-xs text-red-400 mt-2">
              Configura una cuenta en el panel de administración primero.
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Status Card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 backdrop-blur-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Estado de conexión</div>
                  <div className="flex items-center gap-2 mt-3">
                    {isConnected ? (
                      <>
                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-lg font-semibold text-emerald-400">Conectado</span>
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span className="text-lg font-semibold text-amber-200">
                          {status === "CONNECTING" ? "Conectando..." : "Desconectado"}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {!isConnected && (
                    <button
                      onClick={loadQr}
                      className="h-10 px-4 rounded-lg border border-blue-500/40 bg-blue-500/10 text-blue-300 text-xs font-medium hover:bg-blue-500/20 flex items-center gap-2"
                    >
                      <QrCode className="w-4 h-4" />
                      Escanear QR
                    </button>
                  )}
                  <button
                    onClick={refreshStatus}
                    className="h-10 px-4 rounded-lg border border-zinc-700 bg-zinc-800/30 text-zinc-300 text-xs font-medium hover:bg-zinc-800/50"
                  >
                    Refrescar
                  </button>
                </div>
              </div>

              {/* Account Info */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-zinc-800">
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wide">Instancia</div>
                  <div className="text-sm font-mono text-zinc-200 mt-1">
                    {acc?.provider_account_id || <span className="text-zinc-500">—</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wide">Número</div>
                  <div className="text-sm font-mono text-zinc-200 mt-1">
                    {acc?.phone_e164 || <span className="text-zinc-500">—</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wide">Etiqueta</div>
                  <div className="text-sm text-zinc-200 mt-1 truncate">
                    {acc?.account_label || <span className="text-zinc-500">—</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Settings Card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 backdrop-blur-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-zinc-400" />
                <div className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Configuración</div>
              </div>

              <div className="space-y-4">
                {/* Always Online */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-900/50 transition">
                  <div>
                    <div className="text-sm font-medium text-zinc-200">Siempre en línea</div>
                    <div className="text-xs text-zinc-500 mt-1">Estado visible para contactos</div>
                  </div>
                  <label className="relative flex cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alwaysOnline}
                      onChange={(e) => setAlwaysOnline(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-zinc-700 peer-checked:bg-emerald-600 rounded-full transition"></div>
                    <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 peer-checked:translate-x-4 transition"></div>
                  </label>
                </div>

                {/* Reject Calls */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-900/50 transition">
                  <div>
                    <div className="text-sm font-medium text-zinc-200">Rechazar llamadas</div>
                    <div className="text-xs text-zinc-500 mt-1">Bloquea llamadas de voz/video</div>
                  </div>
                  <label className="relative flex cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rejectCalls}
                      onChange={(e) => setRejectCalls(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-zinc-700 peer-checked:bg-red-600 rounded-full transition"></div>
                    <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 peer-checked:translate-x-4 transition"></div>
                  </label>
                </div>

                {/* Reject Call Message */}
                {rejectCalls && (
                  <div className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800/50">
                    <label className="text-sm font-medium text-zinc-200">Mensaje automático</label>
                    <input
                      type="text"
                      value={rejectCallsMsg}
                      onChange={(e) => setRejectCallsMsg(e.target.value)}
                      className="w-full mt-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500/50"
                      placeholder="Ej: No puedo recibir llamadas en este momento"
                    />
                  </div>
                )}

                {/* Locked Settings Info */}
                <div className="mt-6 pt-6 border-t border-zinc-800">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Configuraciones fijas</div>
                      <div className="text-xs text-zinc-400 mt-2 space-y-1">
                        <div>• Ignorar grupos: <span className="text-emerald-300">Habilitado</span></div>
                        <div>• Marcar como leídos: <span className="text-emerald-300">Deshabilitado</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                disabled={!hasInstance || busy}
                onClick={saveSettings}
                className="w-full mt-6 h-11 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {busy ? "Guardando configuración..." : "Guardar cambios"}
              </button>

              {/* Save Message Toast */}
              {saveMessage && (
                <div className={`mt-3 p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                  saveMessage.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border border-red-500/30 text-red-300"
                }`}>
                  {saveMessage.type === "success" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  {saveMessage.text}
                </div>
              )}
            </div>

            {/* Info Card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 backdrop-blur-sm p-6">
              <div className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-4">Información</div>
              <ul className="text-xs text-zinc-400 space-y-2">
                <li className="flex gap-2">
                  <span className="text-zinc-600">•</span>
                  <span>Disponibilidad ~95%: depende de Meta, tu internet y que el teléfono esté activo</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-zinc-600">•</span>
                  <span>Si se desconecta: genera un nuevo QR y escanea para reconectar</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-zinc-600">•</span>
                  <span>Webhooks y auto-healing con n8n (próximamente)</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* QR Modal */}
        {showQrModal && !isConnected && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <QrCode className="w-6 h-6" />
                  Escanea para conectar
                </h2>
                <button
                  onClick={() => setShowQrModal(false)}
                  className="p-1 hover:bg-zinc-800 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {qr ? (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-xl inline-block">
                    <img src={qr} alt="QR Code" className="w-64 h-64" />
                  </div>
                  <p className="text-sm text-zinc-400 text-center">
                    Abre WhatsApp en tu teléfono → Configuración → Dispositivos vinculados → Vincular un dispositivo
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={loadQr}
                      className="flex-1 h-10 rounded-lg border border-zinc-700 bg-zinc-800/30 text-zinc-300 text-sm font-medium hover:bg-zinc-800/50 flex items-center justify-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Regenerar
                    </button>
                    <button
                      onClick={() => setShowQrModal(false)}
                      className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                    >
                      Ya escaneé
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin text-zinc-600 mb-3">⟳</div>
                  <p className="text-sm text-zinc-400">Generando código QR…</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
