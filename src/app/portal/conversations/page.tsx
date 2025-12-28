'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

type Conversation = {
  id: number | string;
  channel_type: string;
  channel_identifier: string | null;
  status: string;
  started_at: string;
  last_message_at: string | null;
  contact_name: string | null;
  contact_phone: string | null;
};

type MessagePart =
  | { type: 'text'; text: string }
  | {
      type: 'image';
      media: { url: string; mime?: string; caption?: string | null };
    }
  | { type: 'audio'; media: { url: string; mime?: string } }
  | { type: 'file'; media: { url: string; mime?: string } };

type Message = {
  id: number | string;
  direction: 'inbound' | 'outbound' | string;
  sender_type?: 'ai' | 'human' | 'unknown' | string;
  created_at: string;
  parts: MessagePart[];
  metadata?: any;
};

type RuntimeState = { force_off: boolean; disabled_until: string | null };
const DEFAULT_RUNTIME: RuntimeState = { force_off: false, disabled_until: null };

function pickConversations(json: any): Conversation[] {
  if (json?.ok && Array.isArray(json?.data?.items)) return json.data.items;
  if (Array.isArray(json?.conversations)) return json.conversations;
  return [];
}

function pickMessages(json: any): Message[] {
  if (Array.isArray(json?.messages)) return json.messages;
  return [];
}

/**
 * Acepta varios shapes para evitar crashes:
 * - { ok:true, ai:{ force_off, disabled_until } }
 * - { ok:true, data:{ ai:{...} } }
 * - { ok:true, data:{ force_off, disabled_until } }
 */
function pickRuntime(json: any): RuntimeState {
  const ai = json?.ai ?? json?.data?.ai ?? json?.data ?? null;
  return {
    force_off: !!ai?.force_off,
    disabled_until: ai?.disabled_until ?? null,
  };
}

/**
 * Fetch “autenticado” para TODA tu app:
 * - no cache
 * - manda cookies (login activo)
 * - intenta parsear JSON (si falla, json=null)
 */
async function apiFetch(url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    cache: 'no-store',
    credentials: 'include',
    headers: {
      ...(init.headers || {}),
    },
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return { res, json };
}

function timeLabel(dateISO: string) {
  const d = new Date(dateISO);
  const now = new Date();

  const dayKey = (x: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(x);

  const dk = dayKey(d);
  const nk = dayKey(now);

  const toNoonUTC = (yyyy_mm_dd: string) => {
    const [y, m, dd] = yyyy_mm_dd.split('-').map(Number);
    return Date.UTC(y, m - 1, dd, 12, 0, 0);
  };

  const diffDays = Math.round((toNoonUTC(nk) - toNoonUTC(dk)) / 86400000);

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: diffDays > 365 ? 'numeric' : undefined,
  }).format(d);
}

function ConversationsPageContent() {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);

  const [runtime, setRuntime] = useState<RuntimeState | null>(null);
  const [runtimeBusy, setRuntimeBusy] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const limit = 50;
  const [offset, setOffset] = useState(0);
  const [canLoadMore, setCanLoadMore] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [statuses, setStatuses] = useState<string[]>([]);

  const messagesWrapRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const prefetchCacheRef = useRef<Map<number, Message[]>>(new Map());

  const shouldAutoScrollRef = useRef(true);
  const justSelectedRef = useRef(false);

  const selectedConversation = useMemo(() => {
    if (selectedConversationId == null) return null;
    return conversations.find((c) => Number(c.id) === selectedConversationId) ?? null;
  }, [conversations, selectedConversationId]);

  const scrollToBottom = (smooth = false) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end',
    });
  };

  const sortAsc = (arr: Message[]) =>
    [...arr].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  // 1) Cargar lista de conversaciones
  useEffect(() => {
    const ac = new AbortController();

    const load = async () => {
      try {
        setLoadingConvos(true);

        const qs = new URLSearchParams();
        qs.set('limit', String(limit));
        qs.set('offset', '0');

        if (search.trim()) qs.set('search', search.trim());
        if (statusFilter) qs.set('status', statusFilter);

        const { res, json } = await apiFetch(`/api/conversations?${qs.toString()}`, {
          signal: ac.signal,
        });

        if (res.status === 401) {
          // sesión caída → login
          window.location.href = '/login';
          return;
        }

        if (!res.ok || !json?.ok) {
          setConversations([]);
          setOffset(0);
          return;
        }

        setConversations(pickConversations(json));
        setOffset(0);
      } catch (e: any) {
        // Error manejado silenciosamente
      } finally {
        setLoadingConvos(false);
      }
    };

    const t = setTimeout(load, 300);
    return () => {
      ac.abort();
      clearTimeout(t);
    };
  }, [search, statusFilter]);

  // Auto-select conversation from URL param ?cid=...
  useEffect(() => {
    const cid = searchParams.get('cid');
    if (cid && conversations.length > 0) {
      const cidNum = Number(cid);
      if (!isNaN(cidNum) && conversations.some(c => Number(c.id) === cidNum)) {
        setSelectedConversationId(cidNum);
      }
    }
  }, [searchParams, conversations]);

  // 2) Cargar statuses (filtro)
  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const { res, json } = await apiFetch('/api/conversations/statuses', { signal: ac.signal });

        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }

        if (res.ok && json?.ok && Array.isArray(json?.data?.statuses)) {
          setStatuses(json.data.statuses);
          return;
        }
      } catch (e: any) {
        // Error manejado silenciosamente
      }
    })();

    return () => ac.abort();
  }, []);

  // 3) Cargar runtime AI cuando cambie conversación
  useEffect(() => {
    const ac = new AbortController();

    if (!selectedConversationId) {
      setRuntime(null);
      return () => ac.abort();
    }

    (async () => {
      try {
        setRuntimeBusy(true);

        const { res, json } = await apiFetch(
          `/api/conversations/${selectedConversationId}/runtime`,
          { signal: ac.signal }
        );

        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }

        if (!res.ok || !json?.ok) {
          if (!ac.signal.aborted) {
            // aquí NO spameamos demasiado; solo dejamos un log claro
            setRuntime(DEFAULT_RUNTIME);
          }
          return;
        }

        if (!ac.signal.aborted) setRuntime(pickRuntime(json));
      } catch (e: any) {
        if (!ac.signal.aborted) setRuntime(DEFAULT_RUNTIME);
      } finally {
        if (!ac.signal.aborted) setRuntimeBusy(false);
      }
    })();

    return () => ac.abort();
  }, [selectedConversationId]);

  // 4) Cargar mensajes al seleccionar conversación
  useEffect(() => {
    if (!selectedConversationId) return;

    setMessages([]);
    setOffset(0);
    setCanLoadMore(true);
    justSelectedRef.current = true;
    shouldAutoScrollRef.current = true;

    const loadFirst = async () => {
      try {
        setLoadingMsgs(true);

        const cached = prefetchCacheRef.current.get(Number(selectedConversationId));
        if (cached && cached.length > 0) {
          const items = sortAsc(cached);
          setMessages(items);
          setCanLoadMore(items.length >= limit);
        } else {
          const { res, json } = await apiFetch(
            `/api/conversations/${selectedConversationId}/messages?limit=${limit}&offset=0`
          );

          if (res.status === 401) {
            window.location.href = '/login';
            return;
          }

          const items = sortAsc(pickMessages(json));
          setMessages(items);
          setCanLoadMore(items.length >= limit);
        }

        // Forzar scroll al final con doble llamada para asegurar
        requestAnimationFrame(() => {
          scrollToBottom(false);
          setTimeout(() => scrollToBottom(false), 100);
        });
      } finally {
        setLoadingMsgs(false);
      }
    };

    loadFirst();
  }, [selectedConversationId]);

  // 5) Refresh en background (cada 5s)
  useEffect(() => {
    if (!selectedConversationId) return;

    const tick = async () => {
      try {
        const { res, json } = await apiFetch(
          `/api/conversations/${selectedConversationId}/messages?limit=${limit}&offset=0`
        );

        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }

        const incoming = sortAsc(pickMessages(json));

        setMessages((prev) => {
          const prevIds = new Set(prev.map((m) => String(m.id)));
          const merged = [...prev];
          for (const m of incoming) {
            if (!prevIds.has(String(m.id))) merged.push(m);
          }
          merged.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          return merged;
        });

        const el = messagesWrapRef.current;
        if (!el) return;

        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;

        if (nearBottom || justSelectedRef.current || shouldAutoScrollRef.current) {
          justSelectedRef.current = false;
          requestAnimationFrame(() => scrollToBottom(false));
        }
      } catch {
        // silencio
      }
    };

    const interval = setInterval(tick, 5000);
    return () => clearInterval(interval);
  }, [selectedConversationId]);

  // 5.1) Autoscroll al abrir conversación o cuando llegan mensajes nuevos
  useEffect(() => {
    if (!selectedConversationId) return;
    // Al abrir o cuando está cerca del fondo, fuerza scroll al último mensaje
    if (justSelectedRef.current || shouldAutoScrollRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom(false);
        justSelectedRef.current = false;
      });
    }
  }, [messages, selectedConversationId]);

  // 6) cargar más antiguos (offset) cuando subes arriba
  const loadOlder = async () => {
    const el = messagesWrapRef.current;
    if (!el) return;
    if (!selectedConversationId) return;
    if (!canLoadMore) return;
    if (loadingMsgs) return;

    const nextOffset = offset + limit;

    try {
      setLoadingMsgs(true);

      const prevScrollHeight = el.scrollHeight;

      const { res, json } = await apiFetch(
        `/api/conversations/${selectedConversationId}/messages?limit=${limit}&offset=${nextOffset}`
      );

      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }

      const older = sortAsc(pickMessages(json));

      setMessages((prev) => {
        const prevIds = new Set(prev.map((m) => String(m.id)));
        const merged = [...older.filter((m) => !prevIds.has(String(m.id))), ...prev];
        merged.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        return merged;
      });

      setOffset(nextOffset);
      setCanLoadMore(older.length >= limit);

      requestAnimationFrame(() => {
        const newScrollHeight = el.scrollHeight;
        el.scrollTop = newScrollHeight - prevScrollHeight;
      });
    } finally {
      setLoadingMsgs(false);
    }
  };

  // 7) Toggle IA (PATCH runtime)
  const toggleAI = async () => {
    if (!selectedConversationId) return;

    const current = runtime ?? DEFAULT_RUNTIME;
    const next = !current.force_off;

    try {
      setRuntimeBusy(true);

      // optimista
      setRuntime({ ...current, force_off: next });

      const { res, json } = await apiFetch(`/api/conversations/${selectedConversationId}/runtime`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_off: next, reason: 'manual' }),
      });

      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }

      if (!res.ok || !json?.ok) {
        setRuntime(current); // revertimos
        return;
      }

      setRuntime(pickRuntime(json));
    } catch (e) {
      setRuntime((prev) => prev ?? DEFAULT_RUNTIME);
    } finally {
      setRuntimeBusy(false);
    }
  };

  // 8) Enviar mensaje desde UI
  const sendMessage = async (text: string) => {
    if (!selectedConversationId) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    // Optimista: añadir mensaje localmente
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    const optimistic: Message = {
      id: tempId,
      direction: 'outbound',
      sender_type: 'human',
      created_at: now,
      parts: [{ type: 'text', text: trimmed }],
    };

    setMessages((prev) => [...prev, optimistic]);
    setMessageText('');
    shouldAutoScrollRef.current = true;
    requestAnimationFrame(() => scrollToBottom(true));

    try {
      setSending(true);
      const res = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });

      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        // fallback: mostrar error y no reemplazar optimistic
        alert('Error al enviar mensaje');
        // remove optimistic
        setMessages((prev) => prev.filter((m) => String(m.id) !== tempId));
        return;
      }

      const created: Message = json.message;

      // Reemplazar mensaje temporal por el real
      setMessages((prev) => prev.map((m) => (String(m.id) === tempId ? created : m)));
      requestAnimationFrame(() => scrollToBottom(true));
    } catch (e) {
      console.error('sendMessage error', e);
      setMessages((prev) => prev.filter((m) => String(m.id).startsWith('temp-') === false));
      alert('Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden">
      {/* Left: lista */}
      <aside className="w-[360px] border-r border-zinc-800 bg-zinc-950/40 h-full flex flex-col overflow-hidden">
        {/* header fijo */}
        <div className="p-4 border-b border-zinc-800 shrink-0">
          <div className="text-sm font-semibold">Conversaciones</div>
          <div className="text-xs text-zinc-500">WhatsApp</div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-3 w-full rounded-xl bg-zinc-900/60 border border-zinc-800 px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600"
            placeholder="Buscar por nombre, teléfono o WhatsApp…"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-2 w-full rounded-xl bg-zinc-900/60 border border-zinc-800 px-3 py-2 text-xs text-zinc-300"
          >
            <option value="">Status: Todos</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvos ? (
            <div className="p-2 space-y-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-4 py-3 border-b border-zinc-900/60">
                  <div className="space-y-2">
                    <div className="h-3 w-40 bg-zinc-800/60 rounded animate-pulse" />
                    <div className="h-2.5 w-28 bg-zinc-900/60 rounded animate-pulse" />
                    <div className="h-2.5 w-20 bg-zinc-900/50 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-xs text-zinc-500">Aún no hay conversaciones.</div>
          ) : (
            conversations.map((c) => {
              const idNum = Number(c.id);
              const selected = idNum === selectedConversationId;

              return (
                <button
                  key={String(c.id)}
                  onClick={() => {
                    shouldAutoScrollRef.current = true;
                    justSelectedRef.current = true;
                    setSelectedConversationId(idNum);
                  }}
                  onMouseEnter={async () => {
                    try {
                      const convId = Number(c.id);
                      if (!prefetchCacheRef.current.has(convId)) {
                        const { res, json } = await apiFetch(`/api/conversations/${convId}/messages?limit=${limit}&offset=0`);
                        if (res.ok) {
                          const items = pickMessages(json);
                          prefetchCacheRef.current.set(convId, items);
                        }
                      }
                    } catch (_) {}
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-zinc-900/60 hover:bg-zinc-900/40 transition ${
                    selected ? 'bg-zinc-900/60' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {c.contact_name || c.contact_phone || `Conversación #${c.id}`}
                      </div>

                      <div className="text-[11px] text-zinc-500 truncate">
                        {c.contact_phone ? c.contact_phone : c.channel_identifier ?? ''}
                      </div>

                      <div className="text-[11px] text-zinc-600 truncate">{c.status}</div>
                    </div>

                    {c.last_message_at && (
                      <div className="text-[11px] text-zinc-500 shrink-0">
                        {timeLabel(c.last_message_at)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Right: chat */}
      <section className="flex-1 flex flex-col bg-zinc-950/20">
        {/* header */}
        <div className="h-14 px-5 border-b border-zinc-800 flex items-center justify-between">
          {selectedConversation ? (
            <div className="min-w-0 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {(selectedConversation.contact_name || selectedConversation.contact_phone || 'C')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">
                  {selectedConversation.contact_name || selectedConversation.contact_phone || 'Cliente sin nombre'}
                </div>
                <div className="text-[11px] text-zinc-500 truncate flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"></span>
                  {selectedConversation.channel_type === 'whatsapp' ? 'WhatsApp' : selectedConversation.channel_type}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-500 flex items-center gap-2">
              <span className="text-zinc-600">←</span> Selecciona una conversación para comenzar
            </div>
          )}

          <div className="flex items-center gap-2">
            <button className="px-3 h-8 rounded-full border border-zinc-800 text-xs text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200 transition-colors">
              Detalles
            </button>
            <button className="px-3 h-8 rounded-full border border-zinc-800 text-xs text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200 transition-colors">
              Clasificar
            </button>

            <button
              disabled={!selectedConversationId || runtimeBusy}
              onClick={toggleAI}
              className={`px-3 h-8 rounded-full border text-xs font-medium hover:bg-zinc-900/40 disabled:opacity-60 disabled:cursor-not-allowed transition-all ${
                (runtime ?? DEFAULT_RUNTIME).force_off
                  ? 'border-red-500/40 text-red-200 hover:border-red-500/60'
                  : 'border-emerald-500/40 text-emerald-200 hover:border-emerald-500/60'
              }`}
            >
              {(runtime ?? DEFAULT_RUNTIME).force_off ? 'Asistente: OFF' : 'Asistente: ON'}
            </button>
          </div>
        </div>

        {/* messages */}
        <div
          ref={messagesWrapRef}
          onScroll={() => {
            const el = messagesWrapRef.current;
            if (!el) return;

            const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
            shouldAutoScrollRef.current = distanceFromBottom < 120;

            if (el.scrollTop <= 40) {
              loadOlder();
            }
          }}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-2 bg-gradient-to-b from-zinc-950 to-black"
        >
          {!selectedConversationId ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-sm space-y-3">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 mb-2">
                  <svg className="w-8 h-8 text-blue-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm text-zinc-400 font-medium">Selecciona una conversación para comenzar</p>
                <p className="text-xs text-zinc-600">Gestiona tus oportunidades de venta desde un solo lugar</p>
              </div>
            </div>
          ) : loadingMsgs && messages.length === 0 ? (
            <div className="px-6 py-4 space-y-3">
              {[0,1,2,3].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-3 py-2 ${i % 2 === 0 ? 'bg-zinc-800' : 'bg-emerald-500/12 border border-emerald-500/30'}`}>
                    <div className="space-y-2">
                      <div className="h-3 w-52 bg-zinc-700/50 rounded animate-pulse" />
                      <div className="h-3 w-36 bg-zinc-800/40 rounded animate-pulse" />
                    </div>
                    <div className="mt-1 flex items-center justify-end">
                      <div className="h-2 w-16 bg-zinc-700/40 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-sm space-y-2">
                <p className="text-sm text-zinc-400">Aún no hay mensajes en esta conversación</p>
                <p className="text-xs text-zinc-600">Envía el primer mensaje para comenzar la interacción</p>
              </div>
            </div>
          ) : (
            <>
              {canLoadMore && (
                <div className="text-center text-[11px] text-zinc-600 mb-3">
                  Desliza hacia arriba para cargar mensajes anteriores
                </div>
              )}

              <div className="space-y-2">
                {messages.map((m, idx) => {
                  const isClient = m.direction === 'inbound';
                  const bubble = isClient
                    ? 'bg-zinc-800 text-zinc-50 rounded-bl-md'
                    : 'bg-emerald-500/12 text-emerald-50 border border-emerald-500/30 rounded-br-md';

                  const currentDay = timeLabel(m.created_at);
                  const prevDay = idx > 0 ? timeLabel(messages[idx - 1].created_at) : null;
                  const showDivider = idx === 0 || currentDay !== prevDay;

                  const outboundBadge =
                    m.direction === 'outbound'
                      ? m.sender_type === 'ai'
                        ? 'IA'
                        : m.sender_type === 'human'
                          ? 'Humano'
                          : 'Unknown'
                      : null;

                  const inboundAiEnabled =
                    m.direction === 'inbound' ? m.metadata?.ai?.effective_enabled : null;

                  const inboundBadge =
                    m.direction === 'inbound' && typeof inboundAiEnabled === 'boolean'
                      ? inboundAiEnabled
                        ? 'IA: ON'
                        : 'IA: OFF'
                      : null;

                  return (
                    <div key={String(m.id)} className="space-y-2">
                      {showDivider && (
                        <div className="flex justify-center py-2">
                          <div className="px-3 py-1 rounded-full text-[11px] text-zinc-300/80 bg-zinc-900/60 border border-zinc-800">
                            {currentDay}
                          </div>
                        </div>
                      )}

                      <div className={`flex ${isClient ? 'justify-start' : 'justify-end'}`}>
                        <div
                          className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm leading-snug ${bubble}`}
                        >
                          <div className="space-y-2">
                            {m.parts?.map((p, i) => {
                              if (p.type === 'text') {
                                return (
                                  <div key={i} className="whitespace-pre-line">
                                    {p.text}
                                  </div>
                                );
                              }

                              if (p.type === 'image') {
                                return (
                                  <Image
                                    key={i}
                                    src={p.media.url}
                                    alt={p.media.caption ?? 'imagen'}
                                    width={260}
                                    height={260}
                                    unoptimized
                                    className="h-auto w-[260px] rounded-xl border border-white/10 object-contain"
                                    onLoad={() => {
                                      if (shouldAutoScrollRef.current) {
                                        requestAnimationFrame(() => scrollToBottom(false));
                                      }
                                    }}
                                  />
                                );
                              }

                              if (p.type === 'audio') {
                                const mime = p.media.mime || 'audio/ogg';
                                const sourceType =
                                  mime === 'audio/opus' ? 'audio/ogg; codecs=opus' : mime;

                                return (
                                  <audio key={i} controls preload="metadata" className="w-[260px]">
                                    <source src={p.media.url} type={sourceType} />
                                  </audio>
                                );
                              }

                              if (p.type === 'file') {
                                return (
                                  <a
                                    key={i}
                                    href={p.media.url}
                                    target="_blank"
                                    className="text-xs underline text-zinc-300"
                                  >
                                    Descargar archivo
                                  </a>
                                );
                              }

                              return (
                                <div
                                  key={i}
                                  className="text-xs italic text-zinc-400/70 bg-zinc-900/20 rounded px-2 py-1 border border-zinc-800/40"
                                >
                                  Próximamente se mostrarán otros tipos de mensajes
                                </div>
                              );
                            })}
                          </div>

                          <div className="mt-1 flex items-center justify-end gap-2">
                            {outboundBadge && (
                              <span className="px-2 py-[2px] rounded-full text-[10px] border border-white/10 bg-black/20 opacity-80">
                                {outboundBadge}
                              </span>
                            )}

                            {inboundBadge && (
                              <span className="px-2 py-[2px] rounded-full text-[10px] border border-white/10 bg-black/20 opacity-80">
                                {inboundBadge}
                              </span>
                            )}

                            <span className="text-[10px] opacity-60">
                              {new Date(m.created_at).toLocaleTimeString('es-MX', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={bottomRef} />
              </div>
            </>
          )}
        </div>

        {/* input */}
        <div className="h-14 px-5 border-t border-zinc-800 bg-zinc-950/40 flex items-center gap-3">
          <button
            type="button"
            className="h-9 w-9 rounded-full border border-zinc-800 text-zinc-400 hover:bg-zinc-900/40"
            title="Adjuntar (próximamente)"
          >
            +
          </button>
          <input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (messageText.trim()) sendMessage(messageText);
              }
            }}
            disabled={!selectedConversationId}
            className="flex-1 h-10 rounded-full bg-zinc-900/60 border border-zinc-800 px-4 text-xs text-zinc-300 placeholder:text-zinc-600 resize-none focus:border-blue-500/30 focus:outline-none transition-colors"
            placeholder={selectedConversationId ? 'Escribe tu mensaje... (Enter para enviar)' : 'Selecciona una conversación para responder'}
          />
          <button
            onClick={() => sendMessage(messageText)}
            disabled={!selectedConversationId || sending || !messageText.trim()}
            className={`h-10 px-4 rounded-full border text-xs font-medium transition-all ${
              !selectedConversationId || sending || !messageText.trim()
                ? 'bg-blue-600/20 border-blue-500/30 text-blue-300 opacity-50 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-600 shadow-lg shadow-blue-500/20'
            }`}
          >
            {sending ? 'Enviando...' : 'Enviar mensaje'}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ConversationsPageContent />
    </Suspense>
  );
}
