
"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Edit, ArrowLeft, AlertCircle, CheckCircle, Clock, Loader2, Ban, Check, CheckCheck, User, AlertTriangle } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import type { Worker } from "@/types/autolavado";

type Zone = {
  id: number;
  name: string;
};

type Service = {
  id: number;
  name: string;
  base_duration_min: number;
  base_price_mxn: string;
};

type Booking = {
  id: string;
  service_id: number;
  status: string;
  start_at: string;
  end_at: string;
  customer_name: string;
  customer_phone: string;
  address_text: string;
  maps_link: string;
  lat: number;
  lng: number;
  zone_id: number;
  total_duration_min: number;
  total_price_mxn: string;
  notes: string;
};

export default function EditarCitaPage() {
  console.log("[DEBUG] Renderizando EditarCitaPage - archivo correcto");
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    address_text: "",
    maps_link: "",
    zone_id: "",
    service_id: "",
    date: "",
    start_time: "",
    end_time: "",
    notes: "",
  });
  // Worker assignment modal state
  const [showAssignWorker, setShowAssignWorker] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number|null>(null);
  const [assigning, setAssigning] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string>("");
  const [assignSuccess, setAssignSuccess] = useState(false);
  // Estados para mostrar trabajadores asignados
  const [assignedWorkers, setAssignedWorkers] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
    // --- Worker assignment modal logic (must be after booking is loaded) ---
    // These must be inside the component and only used when booking is defined
    const loadWorkers = async () => {
      try {
        const res = await fetch("/api/custom/autolavado/workers");
        if (res.ok) {
          const data = await res.json();
          setWorkers(data);
        }
      } catch (err) {
        // ignore
      }
    };

    const checkWorkerConflict = async (workerId: number) => {
      if (!booking) return;
      try {
        const res = await fetch(`/api/custom/autolavado/worker-assignments?worker_id=${workerId}&start_at=${booking.start_at}&end_at=${booking.end_at}`);
        if (res.ok) {
          const data = await res.json();
          if (data.conflicts && data.conflicts.length > 0) {
            setConflictWarning("Este trabajador ya tiene una asignación en este horario. Puedes asignarlo de todas formas.");
          } else {
            setConflictWarning("");
          }
        }
      } catch (err) {
        setConflictWarning("");
      }
    };

    const openAssignWorkerModal = () => {
      setShowAssignWorker(true);
      setAssignSuccess(false);
      setSelectedWorkerId(null);
      setConflictWarning("");
      loadWorkers();
    };

    const closeAssignWorkerModal = () => {
      setShowAssignWorker(false);
      setSelectedWorkerId(null);
      setConflictWarning("");
      setAssignSuccess(false);
    };

    const handleWorkerSelect = (workerId: number) => {
      setSelectedWorkerId(workerId);
      if (workerId && booking) {
        checkWorkerConflict(workerId);
      }
    };

    const handleAssignWorker = async () => {
      if (!selectedWorkerId || !booking) return;
      setAssigning(true);
      setAssignSuccess(false);
      try {
        const res = await fetch(`/api/custom/autolavado/bookings/${booking.id}/assign-worker`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            worker_id: selectedWorkerId,
            start_at: booking.start_at,
            end_at: booking.end_at,
          }),
        });
        if (res.ok) {
          setAssignSuccess(true);
          setTimeout(() => {
            closeAssignWorkerModal();
          }, 1200);
        } else {
          const data = await res.json();
          setConflictWarning(data.error || "Error al asignar trabajador");
        }
      } catch (err) {
        setConflictWarning("Error al asignar trabajador");
      } finally {
        setAssigning(false);
      }
    };
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, [bookingId]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log("Loading booking with ID:", bookingId);
      
      // Cargar zonas y servicios
      const [zonesRes, servicesRes, bookingRes] = await Promise.all([
        fetch("/api/custom/autolavado/zones"),
        fetch("/api/custom/autolavado/services"),
        fetch(`/api/custom/autolavado/bookings/${bookingId}`),
      ]);

      console.log("Booking response status:", bookingRes.status);

      if (zonesRes.ok) {
        const data = await zonesRes.json();
        setZones(data.filter((z: any) => z.is_active));
      }

      if (servicesRes.ok) {
        const data = await servicesRes.json();
        setServices(data.filter((s: any) => s.is_active));
      }

      if (bookingRes.ok) {
        const result = await bookingRes.json();
        console.log("Booking data:", result);
        const data = result.data || result; // Puede venir como { data: ... } o directo
        setBooking(data);
        
        // Parsear fechas
        const startDate = new Date(data.start_at);
        const endDate = new Date(data.end_at);
        
        setFormData({
          customer_name: data.customer_name || "",
          customer_phone: data.customer_phone || "",
          address_text: data.address_text || "",
          maps_link: data.maps_link || "",
          zone_id: data.zone_id?.toString() || "",
          service_id: data.service_id?.toString() || "",
          date: startDate.toISOString().split("T")[0],
          start_time: startDate.toTimeString().slice(0, 5),
          end_time: endDate.toTimeString().slice(0, 5),
          notes: data.notes || "",
        });
      } else {
        const errorData = await bookingRes.json();
        console.error("Failed to load booking:", errorData);
        setError("No se pudo cargar la cita");
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validaciones
    if (!formData.customer_name.trim()) {
      setError("El nombre del cliente es requerido");
      return;
    }

    if (!formData.customer_phone.trim()) {
      setError("El teléfono del cliente es requerido");
      return;
    }

    if (!formData.address_text.trim()) {
      setError("La dirección completa es requerida");
      return;
    }

    if (!formData.date || !formData.start_time || !formData.end_time) {
      setError("Debes completar fecha, hora de inicio y hora de fin");
      return;
    }

    try {
      setSaving(true);

      // Construir fechas
      const startAt = new Date(`${formData.date}T${formData.start_time}`);
      const endAt = new Date(`${formData.date}T${formData.end_time}`);
      const durationMin = Math.round((endAt.getTime() - startAt.getTime()) / (1000 * 60));

      const updateData = {
        service_id: formData.service_id ? parseInt(formData.service_id) : booking?.service_id,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        address_text: formData.address_text,
        maps_link: formData.maps_link || null,
        lat: booking?.lat || 0,
        lng: booking?.lng || 0,
        zone_id: formData.zone_id ? parseInt(formData.zone_id) : null,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        total_duration_min: durationMin,
        notes: formData.notes || null,
      };

      const res = await fetch(`/api/custom/autolavado/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/portal/custom/autolavado/citas");
        }, 1500);
      } else {
        const data = await res.json();
        setError(data.error || "Error al actualizar la cita");
      }
    } catch (err) {
      console.error("Error updating booking:", err);
      setError("Error al actualizar la cita. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`¿Cambiar el estado de la cita a "${newStatus}"?`)) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/custom/autolavado/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/portal/custom/autolavado/citas");
        }, 1500);
      } else {
        const data = await res.json();
        setError(data.error || "Error al cambiar el estado");
      }
    } catch (err) {
      console.error("Error changing status:", err);
      setError("Error al cambiar el estado. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que quieres ELIMINAR esta cita? Esta acción no se puede deshacer.")) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/custom/autolavado/bookings/${bookingId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/portal/custom/autolavado/citas");
        }, 1000);
      } else {
        const data = await res.json();
        setError(data.error || "Error al eliminar la cita");
      }
    } catch (err) {
      console.error("Error deleting booking:", err);
      setError("Error al eliminar la cita. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Cargando cita...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-red-950/20 border-red-800/30">
            <CardContent className="pt-6">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
              <p className="text-red-300 text-center">Cita no encontrada</p>
              <Button
                onClick={() => router.push("/portal/custom/autolavado/citas")}
                className="mt-4 mx-auto block"
              >
                Volver a citas
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="border-zinc-700 hover:border-zinc-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Editar Cita</h1>
            <p className="text-zinc-400 mt-1">Modifica los datos de la cita</p>
            {/* Assigned workers display */}
            <div className="mt-2">
              <div className="text-sm text-zinc-300 font-semibold mb-1">Trabajadores asignados:</div>
              {loadingAssignments ? (
                <div className="text-zinc-400 text-xs">Cargando...</div>
              ) : assignedWorkers.length === 0 ? (
                <div className="text-zinc-500 text-xs">Ningún trabajador asignado</div>
              ) : (
                <ul className="space-y-1">
                  {assignedWorkers.map((aw: any, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-zinc-200 text-xs">
                      <User className="w-4 h-4 text-blue-400" />
                      <span>{aw.worker_name || 'Sin nombre'} (PIN: {aw.worker_pin || '****'})</span>
                      <span className="ml-2">{aw.start_at?.slice(0,16).replace('T',' ')} - {aw.end_at?.slice(11,16)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* End assigned workers display */}
            <Button
              className="mt-2 bg-blue-600 hover:bg-blue-700"
              onClick={openAssignWorkerModal}
            >
              <User className="w-4 h-4 mr-2" />
              Asignar trabajador
            </Button>
          </div>
        </div>
      {/* Modal Asignar Trabajador */}
      {showAssignWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5" /> Asignar trabajador
            </h2>
            <div className="space-y-2">
              {workers.length === 0 ? (
                <div className="text-zinc-400">No hay trabajadores disponibles</div>
              ) : (
                <select
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white mb-2"
                  value={selectedWorkerId || ""}
                  onChange={e => handleWorkerSelect(Number(e.target.value))}
                >
                  <option value="">Selecciona un trabajador</option>
                  {workers.map(w => (
                    <option key={w.id} value={w.id}>{w.name} (PIN: {w.pin || "****"})</option>
                  ))}
                </select>
              )}
              {conflictWarning && (
                <div className="flex items-center gap-2 text-yellow-400 bg-yellow-900/20 border border-yellow-700/40 rounded p-2 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  {conflictWarning}
                </div>
              )}
              {assignSuccess && (
                <div className="flex items-center gap-2 text-green-400 bg-green-900/20 border border-green-700/40 rounded p-2 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  ¡Trabajador asignado!
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={closeAssignWorkerModal} className="flex-1 border-zinc-700" disabled={assigning}>Cancelar</Button>
              <Button onClick={handleAssignWorker} className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={assigning || !selectedWorkerId}>
                {assigning ? "Asignando..." : "Asignar"}
              </Button>
            </div>
          </div>
        </div>
      )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Info */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Datos del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Nombre completo <span className="text-red-400">*</span>
                </label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                  className="bg-zinc-800 border-zinc-700 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Teléfono <span className="text-red-400">*</span>
                </label>
                <Input
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  placeholder="Ej: 9991234567"
                  className="bg-zinc-800 border-zinc-700 text-white"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Dirección</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Dirección completa <span className="text-red-400">*</span>
                </label>
                <Input
                  value={formData.address_text}
                  onChange={(e) => setFormData({ ...formData, address_text: e.target.value })}
                  placeholder="Ej: Calle 20 #123 x 15 y 17, Col. Centro"
                  className="bg-zinc-800 border-zinc-700 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Link de Google Maps
                </label>
                <Input
                  value={formData.maps_link}
                  onChange={(e) => setFormData({ ...formData, maps_link: e.target.value })}
                  placeholder="https://maps.app.goo.gl/..."
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Zona
                </label>
                <select
                  value={formData.zone_id}
                  onChange={(e) => setFormData({ ...formData, zone_id: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
                >
                  <option value="">Selecciona una zona</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Service */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Servicio</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={formData.service_id}
                onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
              >
                <option value="">Selecciona un servicio</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} - ${service.base_price_mxn}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {/* Date and Time */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Fecha y Horario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Fecha del servicio
                </label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Hora de inicio
                  </label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Hora de fin
                  </label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Indicaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ej: Casa verde con portón blanco, frente al OXXO..."
                rows={3}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </CardContent>
          </Card>

          {/* Status Actions */}
          {booking && (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Cambiar Estado</CardTitle>
                <CardDescription>Actualiza el estado de la cita</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleStatusChange("cancelled")}
                  disabled={saving || booking.status === "cancelled"}
                  className="border-red-600/50 hover:bg-red-500/10 hover:border-red-500 hover:text-red-400"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleStatusChange("confirmed")}
                  disabled={saving || booking.status === "confirmed"}
                  className="border-green-600/50 hover:bg-green-500/10 hover:border-green-500 hover:text-green-400"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Confirmar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleStatusChange("completed")}
                  disabled={saving || booking.status === "completed"}
                  className="border-blue-600/50 hover:bg-blue-500/10 hover:border-blue-500 hover:text-blue-400"
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Finalizar
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="p-4 rounded-lg bg-red-950/30 border border-red-800/30 text-red-300 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-800/30 text-emerald-300 text-sm flex items-start gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>¡Cita actualizada exitosamente! Redirigiendo...</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="border-zinc-700 hover:border-zinc-600"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={saving}
            >
              Eliminar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
