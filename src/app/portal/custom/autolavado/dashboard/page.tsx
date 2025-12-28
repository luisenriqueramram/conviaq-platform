"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  MapPin, 
  Users, 
  TrendingUp,
  RefreshCw
} from "lucide-react";
import type { DashboardSummary, Booking } from "@/types/autolavado";

export default function AutolavadoDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const [summaryRes, bookingsRes] = await Promise.all([
        fetch("/api/custom/autolavado/dashboard"),
        fetch("/api/custom/autolavado/bookings?limit=5"),
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }

      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        // Filtrar y ordenar solo las próximas citas
        const now = new Date();
        const upcomingBookings = data
          .filter((b: Booking) => new Date(b.start_at) > now)
          .sort((a: Booking, b: Booking) => 
            new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
          )
          .slice(0, 5);
        setRecentBookings(upcomingBookings);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
      confirmed: { variant: "default", label: "Confirmada" },
      pending: { variant: "secondary", label: "Pendiente" },
      done: { variant: "default", label: "Completada" },
      cancelled: { variant: "outline", label: "Cancelada" },
      blocked: { variant: "outline", label: "Bloqueada" },
    };

    const config = variants[status] || { variant: "outline" as const, label: status };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-96 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Resumen de actividad del autolavado</p>
        </div>
        <Button onClick={loadDashboard} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Stats principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-300 dark:border-blue-800/50 hover:border-blue-400 dark:hover:border-blue-700/70 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-200">Citas Hoy</CardTitle>
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-950 dark:text-blue-100">{summary?.today_bookings || 0}</div>
            <p className="text-xs text-blue-700 dark:text-blue-300/70 mt-1">Citas programadas para hoy</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-300 dark:border-purple-800/50 hover:border-purple-400 dark:hover:border-purple-700/70 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-200">Ingresos Hoy</CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-950 dark:text-purple-100">${summary?.total_revenue_today || "0.00"}</div>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold mt-1">⚡ En desarrollo</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-100 to-cyan-50 dark:from-cyan-950/50 dark:to-cyan-900/30 border-cyan-300 dark:border-cyan-800/50 hover:border-cyan-400 dark:hover:border-cyan-700/70 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-cyan-900 dark:text-cyan-200">Zonas Activas</CardTitle>
            <MapPin className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-950 dark:text-cyan-100">{summary?.active_zones || 0}</div>
            <p className="text-xs text-cyan-700 dark:text-cyan-300/70 mt-1">Áreas de cobertura</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-950/50 dark:to-emerald-900/30 border-emerald-300 dark:border-emerald-800/50 hover:border-emerald-400 dark:hover:border-emerald-700/70 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-900 dark:text-emerald-200">Trabajadores</CardTitle>
            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-950 dark:text-emerald-100">{summary?.active_workers || 0}</div>
            <p className="text-xs text-emerald-700 dark:text-emerald-300/70 mt-1">Equipo activo</p>
          </CardContent>
        </Card>
      </div>

      {/* Próximas citas */}
      <Card>
        <CardHeader>
          <CardTitle>Próximas Citas</CardTitle>
          <CardDescription>Citas confirmadas y pendientes más cercanas</CardDescription>
        </CardHeader>
        <CardContent>
          {recentBookings.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Calendar className="mx-auto mb-4 h-12 w-12 opacity-20" />
              <p>No hay citas registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{booking.customer_name}</p>
                      {getStatusBadge(booking.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(booking.start_at).toLocaleString("es-MX", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">{booking.address_text}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${booking.total_price_mxn}</p>
                    <p className="text-xs text-muted-foreground">{booking.total_duration_min} min</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
