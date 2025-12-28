"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Calendar, Package, Users, MapPin, Clock } from "lucide-react";

export default function AutolavadoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/portal/custom/autolavado/dashboard", label: "Dashboard", icon: LayoutGrid },
    { href: "/portal/custom/autolavado/citas", label: "Citas", icon: Calendar },
    { href: "/portal/custom/autolavado/servicios", label: "Servicios", icon: Package },
    { href: "/portal/custom/autolavado/trabajadores", label: "Trabajadores", icon: Users },
    { href: "/portal/custom/autolavado/zonas", label: "Zonas", icon: MapPin },
    { href: "/portal/custom/autolavado/horarios", label: "Horarios", icon: Clock },
  ];

  const isActive = (href: string) => {
    if (href === "/portal/custom/autolavado/dashboard") {
      return pathname === href || pathname === "/portal/custom/autolavado";
    }
    return pathname?.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-black dark:to-zinc-950 transition-colors">
      {/* Top Navigation */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-white/90 via-white/80 to-white/90 dark:from-zinc-900/90 dark:via-zinc-900/80 dark:to-zinc-900/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                    border-b-2 transition-all duration-200
                    ${
                      active
                        ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10"
                        : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main>{children}</main>
    </div>
  );
}
