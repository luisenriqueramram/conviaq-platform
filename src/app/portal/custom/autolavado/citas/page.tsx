"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  MapPin, 
  Phone, 
  Clock, 
  Search, 
  Filter, 
  X, 
  Plus,
  CalendarOff,
  ChevronDown
} from "lucide-react";
import type { Booking } from "@/types/autolavado";
import Link from "next/link";

export default function CitasPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [zones, setZones] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [zoneFilter, setZoneFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [cancelModal, setCancelModal] = useState<{ show: boolean; booking: any | null }>({
    show: false,
    booking: null,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bookingsRes, zonesRes] = await Promise.all([
        fetch("/api/custom/autolavado/bookings"),
        fetch("/api/custom/autolavado/zones"),
      ]);

      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data);
      }
      
      if (zonesRes.ok) {
        const data = await zonesRes.json();
        setZones(data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (booking: any) => {
    setCancelModal({ show: true, booking });
  };

  const handleCancelOption = async (option: "cancel" | "delete") => {
    const booking = cancelModal.booking;
    if (!booking) return;

    try {
      if (option === "cancel") {
        // Solo cancelar
        const res = await fetch(`/api/custom/autolavado/bookings/${booking.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "cancelled" }),
        });
        if (res.ok) {
          loadData();
        }
      } else if (option === "delete") {
        // Cancelar y eliminar
        const res = await fetch(`/api/custom/autolavado/bookings/${booking.id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          loadData();
        }
      }
    } catch (error) {
      console.error("Error handling booking:", error);
    } finally {
      setCancelModal({ show: false, booking: null });
    }
  };

  const handleReschedule = () => {
    if (cancelModal.booking) {
      router.push(`/portal/custom/autolavado/citas/${cancelModal.booking.id}`);
    }
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const toggleZoneFilter = (zoneId: string) => {
    setZoneFilter(prev =>
      prev.includes(zoneId) ? prev.filter(z => z !== zoneId) : [...prev, zoneId]
    );
  };

  const clearFilters = () => {
    setStatusFilter([]);
    setZoneFilter([]);
    setDateFrom("");
    setDateTo("");
    setSearch("");
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      booking.customer_phone.includes(search);
    
    const matchesStatus = 
      statusFilter.length === 0 || statusFilter.includes(booking.status);
    
    const matchesZone = 
      zoneFilter.length === 0 || (booking.zone_id && zoneFilter.includes(String(booking.zone_id)));
    
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && new Date(booking.start_at) >= new Date(dateFrom);
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && new Date(booking.start_at) <= endDate;
    }

    return matchesSearch && matchesStatus && matchesZone && matchesDate;
  });

  const activeFiltersCount = statusFilter.length + zoneFilter.length + 
    (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
      confirmed: { variant: "default", label: "Confirmada" },
      pending: { variant: "secondary", label: "Pendiente" },
      done: { variant: "default", label: "Completada" },
      cancelled: { variant: "outline", label: "Cancelada" },
      blocked: { variant: "outline", label: "Bloqueada" },
    };

    const s = config[status] || config.pending;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-zinc-800 rounded"></div>
            <div className="h-4 w-96 bg-zinc-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Citas</h1>
            <p className="text-zinc-400 mt-1">Gestiona todas las citas de servicio</p>
          </div>

          {/* Actions Dropdown */}
          <div className="relative">
            <Button
              onClick={() => setShowActions(!showActions)}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Acciones
              <ChevronDown className="w-4 h-4" />
            </Button>

            {showActions && (
              <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50">
                <div className="py-1">
                  <Link
                    href="/portal/custom/autolavado/citas/nueva"
                    className="flex items-center gap-3 px-4 py-3 text-white hover:bg-zinc-800 transition"
                    onClick={() => setShowActions(false)}
                  >
                    <Plus className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Nueva Cita</div>
                      <div className="text-xs text-zinc-400">Registrar cita manual</div>
                    </div>
                  </Link>
                  <Link
                    href="/portal/custom/autolavado/citas/dia-festivo"
                    className="flex items-center gap-3 px-4 py-3 text-white hover:bg-zinc-800 transition border-t border-zinc-800"
                    onClick={() => setShowActions(false)}
                  >
                    <CalendarOff className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Día Festivo</div>
                      <div className="text-xs text-zinc-400">Bloquear día completo</div>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Buscar por nombre o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`border-zinc-700 ${activeFiltersCount > 0 ? 'border-blue-500 bg-blue-500/10' : ''}`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </Button>

          {activeFiltersCount > 0 && (
            <Button
              variant="outline"
              onClick={clearFilters}
              className="border-zinc-700 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4 mr-2" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="bg-zinc-900/80 border-zinc-700">
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-3">
                    Estado
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "pending", label: "Pendiente" },
                      { value: "confirmed", label: "Confirmada" },
                      { value: "done", label: "Completada" },
                      { value: "cancelled", label: "Cancelada" },
                      { value: "blocked", label: "Bloqueada" },
                    ].map((status) => (
                      <label
                        key={status.value}
                        className="flex items-center gap-2 text-zinc-300 hover:text-white cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={statusFilter.includes(status.value)}
                          onChange={() => toggleStatusFilter(status.value)}
                          className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                        />
                        <span className="text-sm">{status.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Zone Filter */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-3">
                    Zona
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {zones.map((zone) => (
                      <label
                        key={zone.id}
                        className="flex items-center gap-2 text-zinc-300 hover:text-white cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={zoneFilter.includes(zone.id)}
                          onChange={() => toggleZoneFilter(zone.id)}
                          className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                        />
                        <span className="text-sm">{zone.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-3">
                    Rango de Fechas
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Desde</label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Hasta</label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bookings List */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-white text-lg">
              {filteredBookings.length} {filteredBookings.length === 1 ? "cita" : "citas"}
              {activeFiltersCount > 0 && (
                <span className="text-sm font-normal text-zinc-400 ml-2">
                  (filtradas)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {filteredBookings.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500 text-lg">No hay citas que coincidan</p>
                <p className="text-zinc-600 text-sm mt-1">
                  Intenta ajustar los filtros o crea una nueva cita
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="group p-5 rounded-xl bg-zinc-800/40 border border-zinc-700/50 hover:bg-zinc-800/60 hover:border-zinc-600 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3 flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="font-semibold text-white text-lg">
                            {booking.customer_name}
                          </div>
                          {getStatusBadge(booking.status)}
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-zinc-400">
                            <Phone className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{booking.customer_phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-zinc-400">
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            {new Date(booking.start_at).toLocaleDateString("es-MX", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                          </div>
                          <div className="flex items-center gap-2 text-zinc-400">
                            <Clock className="w-4 h-4 flex-shrink-0" />
                            {new Date(booking.start_at).toLocaleTimeString("es-MX", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="flex items-center gap-2 text-zinc-400">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">
                              {booking.address_text.length > 35
                                ? `${booking.address_text.substring(0, 35)}...`
                                : booking.address_text}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-zinc-500">
                            {booking.total_duration_min} min
                          </span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-emerald-400 font-semibold">
                            ${booking.total_price_mxn} MXN
                          </span>
                        </div>

                        {booking.notes && (
                          <div className="text-sm text-zinc-400 bg-zinc-900/50 rounded-lg p-3 border border-zinc-700/30">
                            <span className="text-zinc-500">Nota:</span> {booking.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Link href={`/portal/custom/autolavado/citas/${booking.id}`}>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-zinc-600 hover:border-blue-500 hover:bg-blue-500/10 hover:text-blue-400 w-full"
                          >
                            Ver Detalles
                          </Button>
                        </Link>
                        {booking.status !== "cancelled" && booking.status !== "done" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancel(booking)}
                            className="border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-500 w-full"
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Click outside to close dropdowns */}
      {showActions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowActions(false)}
        />
      )}

      {/* Modal de Cancelación */}
      {cancelModal.show && cancelModal.booking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 bg-white">
            <CardHeader>
              <CardTitle className="text-gray-900">Confirmar Acción</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">¿Qué deseas hacer con esta cita?</p>
              
              {/* Info de la cita */}
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-gray-800">
                  <strong>Cliente:</strong>
                  <span>{cancelModal.booking.customer_name}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-800">
                  <Clock className="w-4 h-4" />
                  <strong>Hora:</strong>
                  <span>
                    {new Date(cancelModal.booking.start_at).toLocaleTimeString("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-800">
                  <Calendar className="w-4 h-4" />
                  <strong>Fecha:</strong>
                  <span>
                    {new Date(cancelModal.booking.start_at).toLocaleDateString("es-MX")}
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="grid grid-cols-2 gap-3">
                {/* Botones verdes - Conservar */}
                <Button
                  variant="outline"
                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                  onClick={() => setCancelModal({ show: false, booking: null })}
                >
                  Conservar
                </Button>
                
                {/* Botones verdes - Reagendar */}
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleReschedule}
                >
                  Reagendar
                </Button>

                {/* Botones rojos - Solo cancelar */}
                <Button
                  variant="destructive"
                  className="bg-red-100 hover:bg-red-200 text-red-700 border border-red-300"
                  onClick={() => handleCancelOption("cancel")}
                >
                  Solo Cancelar
                </Button>

                {/* Botones rojos - Cancelar y eliminar */}
                <Button
                  variant="destructive"
                  onClick={() => handleCancelOption("delete")}
                >
                  Cancelar y Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
