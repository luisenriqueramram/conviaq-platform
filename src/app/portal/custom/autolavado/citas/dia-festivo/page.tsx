"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarOff, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DiaFestivoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [workersCount, setWorkersCount] = useState(0);
  const [defaultServiceId, setDefaultServiceId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    date: "",
    reason: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Cargar trabajadores
      const workersRes = await fetch("/api/custom/autolavado/workers");
      if (workersRes.ok) {
        const data = await workersRes.json();
        setWorkersCount(data.filter((w: any) => w.is_active).length);
      }

      // Cargar servicios para obtener un service_id válido
      const servicesRes = await fetch("/api/custom/autolavado/services");
      if (servicesRes.ok) {
        const services = await servicesRes.json();
        if (services.length > 0) {
          setDefaultServiceId(services[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!formData.date) {
      setError("Debes seleccionar una fecha");
      return;
    }

    if (!formData.reason.trim()) {
      setError("Debes proporcionar un motivo");
      return;
    }

    if (!defaultServiceId) {
      setError("No se pudo cargar los servicios. Recarga la página.");
      return;
    }

    try {
      setLoading(true);

      // Crear bloques de 24 horas para cada trabajador + 1 adicional
      const blocksToCreate = workersCount + 1;
      const selectedDate = new Date(formData.date + "T00:00:00");
      
      // Crear todas las citas bloqueadas en paralelo
      const promises = [];
      for (let i = 0; i < blocksToCreate; i++) {
        const blockData = {
          service_id: defaultServiceId, // Usar servicio por defecto
          customer_name: "DÍA FESTIVO",
          customer_phone: "0000000000",
          address_text: formData.reason,
          maps_link: null,
          lat: 0,
          lng: 0,
          zone_id: null,
          start_at: selectedDate.toISOString(),
          end_at: new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          total_duration_min: 1440, // 24 horas en minutos
          total_price_mxn: 0,
          status: "confirmed", // Confirmado para que se vea como ocupado
          notes: `Día festivo: ${formData.reason}`,
        };

        promises.push(
          fetch("/api/custom/autolavado/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(blockData),
          })
        );
      }

      const results = await Promise.all(promises);
      const allSuccess = results.every(r => r.ok);

      if (allSuccess) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/portal/custom/autolavado/citas");
        }, 2000);
      } else {
        setError("Hubo un error al crear algunos bloques. Intenta de nuevo.");
      }
    } catch (err) {
      console.error("Error creating holiday blocks:", err);
      setError("Error al bloquear el día. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
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
            <h1 className="text-3xl font-bold text-white">Crear Día Festivo</h1>
            <p className="text-zinc-400 mt-1">Bloquea un día completo para evitar citas</p>
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-950/20 border-blue-800/30">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-200">
                <p className="font-medium mb-1">¿Cómo funciona?</p>
                <p className="text-blue-300/80">
                  Se crearán <span className="font-semibold text-blue-100">{workersCount + 1} bloques</span> de 24 horas 
                  (basado en {workersCount} trabajadores activos) para que el bot no pueda agendar citas ese día.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CalendarOff className="w-5 h-5" />
              Datos del Día Festivo
            </CardTitle>
            <CardDescription>
              Ingresa la fecha y el motivo del bloqueo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Fecha <span className="text-red-400">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  required
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Motivo <span className="text-red-400">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Ej: Navidad, Año Nuevo, Día del Trabajo..."
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Este motivo aparecerá en las citas bloqueadas
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-lg bg-red-950/30 border border-red-800/30 text-red-300 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-800/30 text-emerald-300 text-sm flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>¡Día festivo creado exitosamente! Redirigiendo...</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1 border-zinc-700 hover:border-zinc-600"
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Creando bloques...
                    </>
                  ) : (
                    <>
                      <CalendarOff className="w-4 h-4 mr-2" />
                      Bloquear Día
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
