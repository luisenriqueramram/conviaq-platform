"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  Users,
  MessagesSquare,
  CalendarDays,
  Bell,
  LineChart,
  Bot,
  Settings,
  Home,
  Search,
  ChevronRight,
  MessageSquare,
  Zap,
  GitBranch,
  LogOut,
  Menu,
  X,
} from "lucide-react";

type PortalLayoutProps = { children: React.ReactNode };

const navItems = [
  { href: "/portal", label: "Centro de Control", icon: LayoutGrid },
  { href: "/portal/leads", label: "Leads", icon: Users },
  { href: "/portal/conversations", label: "Conversaciones", icon: MessagesSquare },
  { href: "/portal/pipelines", label: "Pipeline de Ventas", icon: GitBranch },
  { href: "/portal/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/portal/reminders", label: "Seguimientos", icon: Bell },
  { href: "/portal/metrics", label: "Analítica", icon: LineChart },
];

const secondaryItems = [
  { href: "/portal/channels/whatsapp", label: "Conectar WhatsApp", icon: MessageSquare },
  { href: "/portal/bot-config", label: "Asistente IA", icon: Bot },
  { href: "/portal/settings", label: "Configuración", icon: Settings },
];

const superAdminItem = { href: "/superadmin/tenants", label: "Superadmin", icon: Settings };

function isActivePath(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/portal") return pathname === "/portal";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [q, setQ] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [highlighted, setHighlighted] = useState<number>(-1);
  const [suggestions, setSuggestions] = useState<Array<{
    id: string;
    title: string;
    type: string;
    href: string;
  }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [visibleNavItems, setVisibleNavItems] = useState(navItems);
  const [visibleSecondaryItems, setVisibleSecondaryItems] = useState(secondaryItems);
  const [customModules, setCustomModules] = useState<Array<{slug: string; name: string; icon?: string; route: string}>>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoadingModules, setIsLoadingModules] = useState(true); // Nuevo estado
  // When true hides the Leads item for all users except plan 10 (full access)
  const hideLeadsGlobally = true;
  const searchRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === "k";
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Live search suggestions
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (q.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      setHighlighted(-1);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        if (res.ok) {
          const data = await res.json() as { data: Array<{id: string; title: string; type: string; href: string}> };
          setSuggestions(
            data.data?.slice(0, 8).map((item) => ({
              id: item.id,
              title: item.title,
              type: item.type,
              href: item.href,
            })) ?? []
          );
          setShowSuggestions(true);
          setHighlighted(0);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [q]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        !searchRef.current?.contains(e.target as Node) &&
        !suggestionsRef.current?.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Load user plan/features and filter nav items accordingly
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/me');
        if (!res.ok) return;
        const json = await res.json();
        const planId: number | null = json?.plan?.id ?? null;
        const isPlan10 = planId === 10;
        const isSuper = Boolean(json?.is_superadmin);

        let hasEvolution = true;
        try {
          const waRes = await fetch('/api/channels/whatsapp/status');
          if (waRes.ok) {
            const waJson = await waRes.json();
            const reason = waJson?.data?.reason ?? waJson?.reason ?? null;
            if (reason === 'NO_INSTANCE') {
              hasEvolution = false;
            }
          }
        } catch {
          hasEvolution = true;
        }

        // Load custom modules
        const modulesRes = await fetch('/api/tenant/custom-modules');
        if (modulesRes.ok) {
          const modulesData = await modulesRes.json();
          if (modulesData.ok && modulesData.modules) {
            setCustomModules(modulesData.modules);
          }
        }

        if (!mounted) return;

        // Plan mapping as requested:
        // plan 1: resumen (no metrics data), conversaciones, pantalla personalizada, configuracion, conectar cuenta
        // plan 2: same as 1 + bot-config
        // plan 3: same as 2 + calendario
        // plan 4: everything

        const mainByPlan: Record<number, string[]> = {
          1: ['/portal', '/portal/conversations'],
          2: ['/portal', '/portal/conversations'],
          3: ['/portal', '/portal/conversations', '/portal/calendar'],
          4: navItems.map((i) => i.href),
          10: navItems.map((i) => i.href),
        };

        const secondaryByPlan: Record<number, string[]> = {
          1: ['/portal/channels/whatsapp', '/portal/settings'],
          2: ['/portal/channels/whatsapp', '/portal/settings', '/portal/bot-config'],
          3: ['/portal/channels/whatsapp', '/portal/settings', '/portal/bot-config'],
          4: secondaryItems.map((i) => i.href),
          10: [...secondaryItems.map((i) => i.href), superAdminItem.href],
        };

        const allowedMain = planId && mainByPlan[Number(planId)] ? mainByPlan[Number(planId)] : navItems.map((i) => i.href);
        let allowedSecondary = planId && secondaryByPlan[Number(planId)] ? secondaryByPlan[Number(planId)] : secondaryItems.map((i) => i.href);
        if (isSuper && !allowedSecondary.includes(superAdminItem.href)) {
          allowedSecondary = [...allowedSecondary, superAdminItem.href];
        }

        const filtered = navItems.filter((item) => {
          if (hideLeadsGlobally && !isPlan10 && item.href === '/portal/leads') return false;
          return allowedMain.includes(item.href);
        });

        const baseSecondary = isPlan10 || isSuper ? [...secondaryItems, superAdminItem] : secondaryItems;
        const filteredSecondary = baseSecondary
          .filter((it) => allowedSecondary.includes(it.href))
          .filter((it) => (it.href === '/portal/channels/whatsapp' ? hasEvolution : true));

        setVisibleNavItems(filtered);
        setVisibleSecondaryItems(filteredSecondary);
        setIsLoadingModules(false); // Marcar como cargado
      } catch (e) {
        setVisibleNavItems(navItems);
        setVisibleSecondaryItems(secondaryItems);
        setIsLoadingModules(false); // Marcar como cargado incluso si hay error
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Scroll progress tracking for content area
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      const pct = max > 0 ? Math.min(100, Math.max(0, (el.scrollTop / max) * 100)) : 0;
      setScrollProgress(pct);
    };
    el.addEventListener('scroll', onScroll);
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [contentRef]);

  // Spotlight (mouse-follow) para tarjetas con data-spotlight="card"
useEffect(() => {
  const handler = (e: MouseEvent) => {
    const cards = document.querySelectorAll<HTMLElement>("[data-spotlight='card']");
    if (!cards.length) return;

    requestAnimationFrame(() => {
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
        card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
      });
    });
  };

  document.addEventListener("mousemove", handler);
  return () => document.removeEventListener("mousemove", handler);
}, []);


  const currentLabel =
    navItems.find((x) => isActivePath(pathname, x.href))?.label ??
    secondaryItems.find((x) => isActivePath(pathname, x.href))?.label ??
    "Portal";

  // Mostrar loading screen mientras valida módulos
  if (isLoadingModules) {
    return (
      <div className="min-h-dvh bg-bg text-text flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-accent/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm text-textSecondary">Validando permisos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg text-text selection:bg-accent selection:text-white">
      {/* Glows */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-[-20%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-accent/20 blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[40vw] w-[40vw] rounded-full bg-accentDark/20 blur-[150px] mix-blend-screen" />
      </div>

      <div className="relative flex h-dvh w-full">
        {/* MOBILE MENU BUTTON */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="fixed top-3 left-3 z-[60] lg:hidden p-2 rounded-xl bg-surface/90 backdrop-blur-md border border-border text-white hover:bg-surface transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* MOBILE OVERLAY */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-[55] lg:hidden backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* SIDEBAR */}
        <aside
          className={cn(
            "group/sidebar flex h-full flex-col overflow-hidden",
            // Desktop: hover to expand
            "lg:w-[84px] lg:hover:w-64",
            // Mobile: full width drawer from left
            "w-72 fixed lg:relative inset-y-0 left-0 z-[56]",
            "bg-surface/60 backdrop-blur-xl border-r border-border",
            "py-6 transition-all duration-300 lg:duration-500",
            "ease-[cubic-bezier(0.2,0,0,1)]",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          {/* Brand */}
          <div className="mb-10 flex h-10 items-center px-6 shrink-0">
            <div className="min-w-[32px] h-8 w-8 rounded-xl bg-gradient-to-tr from-accent to-accentDark ring-1 ring-white/20 shadow-[0_0_20px_rgba(59,130,246,0.35)] grid place-items-center text-white font-bold">
              C
            </div>

            <div
              className={cn(
                "ml-4 leading-tight",
                "opacity-100 translate-x-0 lg:opacity-0 lg:-translate-x-2",
                "lg:group-hover/sidebar:opacity-100 lg:group-hover/sidebar:translate-x-0",
                "transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] whitespace-nowrap"
              )}
            >
              <div className="text-white font-semibold tracking-tight">CONVIAQ</div>
              <div className="text-[11px] text-zinc-500">CRM · Portal</div>
            </div>
          </div>

          {/* NAV */}
          <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visibleNavItems.map((it) => {
              const active = isActivePath(pathname, it.href);
              const Icon = it.icon;
              return (
                <NavItem
                  key={it.href}
                  href={it.href}
                  label={it.label}
                  active={active}
                  icon={<Icon className="h-5 w-5" />}
                  onClick={() => setMobileMenuOpen(false)}
                />
              );
            })}

            {/* Custom Modules Section */}
            {customModules.length > 0 && (
              <>
                <div
                  className={cn(
                    "mt-4 pt-4 border-t border-border",
                    "text-[11px] uppercase tracking-wider text-zinc-500 px-3",
                    "opacity-100 lg:opacity-0 lg:group-hover/sidebar:opacity-100 transition-opacity duration-300"
                  )}
                >
                  Módulos Personalizados
                </div>

                {customModules.map((module) => {
                  const active = isActivePath(pathname, module.route);
                  return (
                    <NavItem
                      key={module.slug}
                      href={module.route}
                      label={module.name}
                      active={active}
                      icon={<Zap className="h-5 w-5" />}
                      onClick={() => setMobileMenuOpen(false)}
                    />
                  );
                })}
              </>
            )}

            <div
              className={cn(
                "mt-4 pt-4 border-t border-border",
                "text-[11px] uppercase tracking-wider text-zinc-500 px-3",
                "opacity-100 lg:opacity-0 lg:group-hover/sidebar:opacity-100 transition-opacity duration-300"
              )}
            >
              Configuración
            </div>

            {visibleSecondaryItems.map((it) => {
              const active = isActivePath(pathname, it.href);
              const Icon = it.icon;
              return (
                <NavItem
                  key={it.href}
                  href={it.href}
                  label={it.label}
                  active={active}
                  icon={<Icon className="h-5 w-5" />}
                  onClick={() => setMobileMenuOpen(false)}
                />
              );
            })}
          </nav>

          {/* Footer user */}
          <div className="px-4 mt-auto shrink-0">
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/logout", { method: "POST" });
                  if (res.ok) {
                    // Redirect to login after successful logout
                    window.location.href = "/login";
                  }
                } catch (error) {
                  console.error("Logout error:", error);
                }
              }}
              className={cn(
                "w-full flex items-center h-11 px-3 rounded-xl overflow-hidden",
                "text-zinc-400 hover:text-white hover:bg-white/5",
                "transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
                "border border-transparent hover:border-red-500/20"
              )}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span
                className={cn(
                  "ml-4",
                  "opacity-0 -translate-x-2 group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0",
                  "transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] whitespace-nowrap text-sm"
                )}
              >
                Cerrar sesión
              </span>
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* TOPBAR */}
          <header className="sticky top-0 z-40 h-14 border-b border-border bg-bg/40 backdrop-blur-xl">
            <div className="h-full flex items-center justify-between pl-16 pr-4 sm:px-6 lg:px-8">
              {/* Breadcrumb */}
              <div className="hidden sm:flex items-center gap-2 text-sm text-zinc-500">
                <Home className="h-4 w-4 text-zinc-600" />
                <ChevronRight className="h-4 w-4 text-zinc-700" />
                <span className="text-white font-medium">{currentLabel}</span>
              </div>

              <div className="flex items-center gap-5">
                {/* Search */}
                <div className="relative hidden md:block">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const qq = q.trim();
                      if (!qq) return;
                      setShowSuggestions(false);
                      setQ("");
                      setSuggestions([]);
                      router.push(`/portal/search?q=${encodeURIComponent(qq)}`);
                    }}
                    className="relative"
                  >
                    <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                      <Search className="h-4 w-4 text-zinc-500" />
                    </div>

                    <input
                      ref={searchRef}
                      value={q}
                      onChange={(e) => {
                        setQ(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setShowSuggestions(false);
                        } else if (e.key === "ArrowDown" && suggestions.length > 0) {
                          e.preventDefault();
                          setShowSuggestions(true);
                          setHighlighted((prev) => {
                            const next = prev + 1;
                            return next >= suggestions.length ? 0 : next;
                          });
                        } else if (e.key === "ArrowUp" && suggestions.length > 0) {
                          e.preventDefault();
                          setShowSuggestions(true);
                          setHighlighted((prev) => {
                            const next = prev - 1;
                            return next < 0 ? suggestions.length - 1 : next;
                          });
                        } else if (e.key === "Enter" && showSuggestions && highlighted >= 0 && highlighted < suggestions.length) {
                          e.preventDefault();
                          const s = suggestions[highlighted];
                          setShowSuggestions(false);
                          setQ("");
                          setSuggestions([]);
                          setHighlighted(-1);
                          router.push(s.href);
                        }
                      }}
                      placeholder="Buscar leads, números, secciones…"
                      className="w-[420px] pl-10 pr-16 py-2.5 rounded-xl text-sm bg-surface/80 border border-border text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent shadow-sm backdrop-blur-md transition-all"
                    />

                    <div className="pointer-events-none absolute inset-y-0 right-0 pr-2 flex items-center">
                      <span className="text-zinc-600 text-xs border border-zinc-800 bg-zinc-900/50 rounded px-1.5 py-0.5">
                        ⌘K
                      </span>
                    </div>
                  </form>

                  {/* Suggestions Dropdown */}
                  {showSuggestions && (
                    <div
                      ref={suggestionsRef}
                      className="absolute top-full mt-2 w-[420px] max-h-96 overflow-y-auto rounded-xl bg-surface/95 backdrop-blur-md border border-border shadow-lg z-50"
                    >
                      <div className="p-2 space-y-1">
                        {isSearching && (
                          <div className="px-4 py-2.5 text-xs text-zinc-500 flex items-center gap-2">
                            <div className="animate-spin h-3.5 w-3.5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            Buscando…
                          </div>
                        )}
                        {!isSearching && suggestions.length === 0 && (
                          <div className="px-4 py-2.5 text-xs text-zinc-500">Sin resultados</div>
                        )}
                        {suggestions.map((suggestion, idx) => (
                          <Link
                            key={suggestion.id}
                            href={suggestion.href}
                            onClick={() => {
                              setShowSuggestions(false);
                              setQ("");
                              setSuggestions([]);
                              setHighlighted(-1);
                            }}
                            className={cn(
                              "block px-4 py-2.5 rounded-lg text-sm text-zinc-300 transition-colors flex items-center justify-between",
                              highlighted === idx ? "bg-white/10 text-white" : "hover:text-white hover:bg-white/10"
                            )}
                          >
                            <span>
                              {(() => {
                                const t = suggestion.title;
                                const qq = q.trim().toLowerCase();
                                const i = t.toLowerCase().indexOf(qq);
                                if (qq && i >= 0) {
                                  const before = t.slice(0, i);
                                  const match = t.slice(i, i + qq.length);
                                  const after = t.slice(i + qq.length);
                                  return (
                                    <>
                                      {before}
                                      <span className="bg-yellow-500/20 text-yellow-300 px-0.5 rounded">{match}</span>
                                      {after}
                                    </>
                                  );
                                }
                                return t;
                              })()}
                            </span>
                            <span className="text-xs text-zinc-500 bg-white/5 px-2 py-0.5 rounded">
                              {suggestion.type === "lead"
                                ? "Lead"
                                : suggestion.type === "contact"
                                  ? "Contacto"
                                  : suggestion.type === "conversation"
                                    ? "Chat"
                                    : "Sección"}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 border-l border-border pl-5">
                  <button className="relative text-zinc-400 hover:text-white transition" type="button">
                    <Bell className="h-5 w-5" />
                  </button>
                  <Link href="/portal/settings" className="text-zinc-400 hover:text-white transition">
                    <Settings className="h-5 w-5" />
                  </Link>
                </div>
              </div>
            </div>
            {/* Scroll Progress */}
            <div className="scroll-progress-track">
              <div className="scroll-progress-bar" style={{ width: `${scrollProgress}%` }} />
            </div>
          </header>

          {/* CONTENT */}
          <main ref={contentRef} className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 animate-fade-in">
            <div className="w-full">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

function NavItem({
  href,
  label,
  active,
  icon,
  onClick,
}: {
  href: string;
  label: string;
  active?: boolean;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "relative flex items-center h-11 px-3 rounded-xl overflow-hidden",
        "transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] hover-lift",
        "border border-transparent",
        active
          ? "bg-accent/10 text-white border-accent/20 shadow-sm"
          : "text-zinc-400 hover:text-white hover:bg-white/5"
      )}
    >
      {/* Active bar */}
      <span
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2",
          "h-6 w-[3px] rounded-full bg-accent",
          "opacity-0 -translate-x-2 transition-all duration-300",
          active && "opacity-100 translate-x-0"
        )}
      />

      {/* Hover sweep */}
      <span className="absolute inset-0 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
        <span className="absolute inset-0 bg-gradient-to-r from-accent/18 via-accent/5 to-transparent" />
      </span>

      <span className="relative z-10 min-w-[24px] grid place-items-center">{icon}</span>

      <span
        className={cn(
          "ml-4 relative z-10",
          "opacity-100 translate-x-0 lg:opacity-0 lg:-translate-x-2",
          "lg:group-hover/sidebar:opacity-100 lg:group-hover/sidebar:translate-x-0",
          "transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] whitespace-nowrap"
        )}
      >
        {label}
      </span>
    </Link>
  );
}
