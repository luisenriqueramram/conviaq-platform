"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ArrowLeft, AlertCircle, CheckCircle, Link as LinkIcon, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

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

type VehicleModifier = {
  id: number;
  service_id: number;
  size: string;
  duration_delta_min: number;
  price_delta_mxn: string;
  absolute_price_mxn: string | null;
};

type ServiceExtra = {
  id: number;
  name: string;
  code: string;
  duration_min: number;
  price_mxn: string;
  description: string | null;
};

export default function NuevaCitaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [vehicleModifiers, setVehicleModifiers] = useState<VehicleModifier[]>([]);
  const [serviceExtras, setServiceExtras] = useState<ServiceExtra[]>([]);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedVehicleSize, setSelectedVehicleSize] = useState<string>("");
  const [vehicleCount, setVehicleCount] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    address_text: "",
    maps_link: "",
    zone_id: "",
    date: "",
    start_time: "",
    end_time: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Cargar zonas
    try {
      const zonesRes = await fetch("/api/custom/autolavado/zones");
      if (zonesRes.ok) {
        const data = await zonesRes.json();
        setZones(data.filter((z: any) => z.is_active));
      }
    } catch (error) {
      console.error("Error loading zones:", error);
    }

    // Cargar servicios
    try {
      const servicesRes = await fetch("/api/custom/autolavado/services");
      if (servicesRes.ok) {
        const data = await servicesRes.json();
        setServices(data.filter((s: any) => s.is_active));
      }
    } catch (error) {
      console.error("Error loading services:", error);
    }

    // Cargar modificadores de vehículo
    try {
      const modifiersRes = await fetch("/api/custom/autolavado/vehicle-modifiers");
      if (modifiersRes.ok) {
        const data = await modifiersRes.json();
        console.log("✅ Vehicle modifiers loaded:", data);
        setVehicleModifiers(data);
      } else {
        console.error("❌ Failed to load vehicle modifiers:", modifiersRes.status);
        setVehicleModifiers([]);
      }
    } catch (error) {
      console.error("Error loading vehicle modifiers:", error);
      setVehicleModifiers([]);
    }

    // Cargar extras de servicio
    try {
      const extrasRes = await fetch("/api/custom/autolavado/service-extras");
      if (extrasRes.ok) {
        const data = await extrasRes.json();
        console.log("✅ Service extras loaded:", data);
        setServiceExtras(data);
      }
    } catch (error) {
      // Silenciar error - los extras son opcionales
      setServiceExtras([]);
    }
  };

  const calculateTotals = () => {
    if (!selectedService || !selectedVehicleSize) {
      return { totalDuration: 0, totalPrice: 0 };
    }

    const service = services.find(s => s.id === selectedService);
    if (!service) return { totalDuration: 0, totalPrice: 0 };

    const modifier = vehicleModifiers.find(
      m => m.service_id === selectedService && m.size === selectedVehicleSize
    );

    let totalDuration = service.base_duration_min;
    let totalPrice = parseFloat(service.base_price_mxn);

    // Aplicar modificador de vehículo
    if (modifier) {
      if (modifier.absolute_price_mxn) {
        totalPrice = parseFloat(modifier.absolute_price_mxn);
      } else {
        totalPrice += parseFloat(modifier.price_delta_mxn);
      }
      totalDuration += modifier.duration_delta_min;
    }

    // Sumar extras
    selectedExtras.forEach(extraId => {
      const extra = serviceExtras.find(e => e.id === extraId);
      if (extra) {
        totalDuration += extra.duration_min;
        totalPrice += parseFloat(extra.price_mxn);
      }
    });

    const count = Math.max(1, vehicleCount);
    return {
      totalDuration: totalDuration * count,
      totalPrice: totalPrice * count,
    };
  };

  const toggleExtra = (extraId: number) => {
    setSelectedExtras(prev =>
      prev.includes(extraId)
        ? prev.filter(id => id !== extraId)
        : [...prev, extraId]
    );
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

    if (!formData.maps_link.trim()) {
      setError("El link de Google Maps es requerido");
      return;
    }

    if (!formData.zone_id) {
      setError("Debes seleccionar una zona");
      return;
    }

    if (!formData.date) {
      setError("Debes seleccionar una fecha");
      return;
    }

    if (!formData.start_time) {
      setError("Debes ingresar la hora de inicio");
      return;
    }

    if (!formData.end_time) {
      setError("Debes ingresar la hora de fin");
      return;
    }

    if (!selectedService) {
      setError("Debes seleccionar un servicio");
      return;
    }

    if (!selectedVehicleSize) {
      setError("Debes seleccionar el tamaño del vehículo");
      return;
    }

    if (!vehicleCount || vehicleCount < 1) {
      setError("Debes indicar la cantidad de vehículos (mínimo 1)");
      return;
    }

    try {
      setLoading(true);

      const { totalPrice } = calculateTotals();
      
      // Construir fechas de inicio y fin desde el formulario
      const startAt = new Date(`${formData.date}T${formData.start_time}`);
      const endAt = new Date(`${formData.date}T${formData.end_time}`);
      
      // Calcular duración real en minutos desde las horas ingresadas
      const durationMin = Math.round((endAt.getTime() - startAt.getTime()) / (1000 * 60));

      const bookingData = {
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        address_text: formData.address_text,
        maps_link: formData.maps_link,
        lat: 0,
        lng: 0,
        zone_id: parseInt(formData.zone_id),
        service_id: selectedService,
        vehicle_size: selectedVehicleSize,
        vehicle_count: vehicleCount,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        total_duration_min: durationMin,
        total_price_mxn: totalPrice,
        status: "confirmed",
        notes: formData.notes || null,
      };

      const res = await fetch("/api/custom/autolavado/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/portal/custom/autolavado/citas");
        }, 2000);
      } else {
        const data = await res.json();
        setError(data.error || "Error al crear la cita");
      }
    } catch (err) {
      console.error("Error creating booking:", err);
      setError("Error al crear la cita. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const { totalDuration, totalPrice } = calculateTotals();
  const availableModifiers = vehicleModifiers.filter(m => m.service_id === selectedService);

  console.log("🔍 Debug Info:", {
    selectedService,
    totalVehicleModifiers: vehicleModifiers.length,
    availableModifiers: availableModifiers.length,
    allModifiers: vehicleModifiers,
    filteredModifiers: availableModifiers
  });

  const vehicleSizeLabels: Record<string, string> = {
    small: "Pequeño",
    medium: "Mediano",
    large: "Grande",
    suv: "SUV",
    pickup: "Pickup",
  };

  const showVehicleSelection = selectedService && availableModifiers.length > 0;

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
            <h1 className="text-3xl font-bold text-white">Nueva Cita</h1>
            <p className="text-zinc-400 mt-1">Registra una cita manual del cliente</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Info */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Información del Cliente</CardTitle>
              <CardDescription>Datos de contacto del cliente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Nombre Completo <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="Juan Pérez"
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
                    placeholder="9991234567"
                    className="bg-zinc-800 border-zinc-700 text-white"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Ubicación</CardTitle>
              <CardDescription>Dirección completa del servicio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Dirección Completa <span className="text-red-400">*</span>
                </label>
                <Input
                  value={formData.address_text}
                  onChange={(e) => setFormData({ ...formData, address_text: e.target.value })}
                  placeholder="Calle 60 #234 x 45 y 47, Col. Centro, C.P. 97000"
                  className="bg-zinc-800 border-zinc-700 text-white"
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Incluye calle, número, colonia y código postal
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Link de Google Maps <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    value={formData.maps_link}
                    onChange={(e) => setFormData({ ...formData, maps_link: e.target.value })}
                    placeholder="https://maps.app.goo.gl/..."
                    className="bg-zinc-800 border-zinc-700 text-white pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Zona <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.zone_id}
                  onChange={(e) => setFormData({ ...formData, zone_id: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
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

          {/* Service Selection */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Servicio</CardTitle>
              <CardDescription>Selecciona el paquete de servicio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {services.map((service) => (
                  <label
                    key={service.id}
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition ${
                      selectedService === service.id
                        ? "bg-blue-950/30 border-blue-500"
                        : "bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="service"
                        checked={selectedService === service.id}
                        onChange={() => {
                          setSelectedService(service.id);
                          setSelectedVehicleSize("");
                          setVehicleCount(1);
                        }}
                        className="w-5 h-5"
                      />
                      <div>
                        <div className="text-white font-medium">{service.name}</div>
                        <div className="text-sm text-zinc-400">
                          Duración base: {service.base_duration_min} min
                        </div>
                      </div>
                    </div>
                    <div className="text-emerald-400 font-semibold">
                      ${service.base_price_mxn}
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Size Selection - Solo aparece después de seleccionar servicio */}
          {showVehicleSelection && (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Tamaño del Vehículo</CardTitle>
                <CardDescription>Selecciona el tamaño para calcular precio y duración final</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {availableModifiers.map((modifier) => {
                    const service = services.find(s => s.id === selectedService);
                    const basePrice = service ? parseFloat(service.base_price_mxn) : 0;
                    const baseDuration = service ? service.base_duration_min : 0;
                    const finalPrice = modifier.absolute_price_mxn
                      ? parseFloat(modifier.absolute_price_mxn)
                      : basePrice + parseFloat(modifier.price_delta_mxn);
                    const finalDuration = baseDuration + modifier.duration_delta_min;

                    return (
                      <label
                        key={modifier.id}
                        className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition ${
                          selectedVehicleSize === modifier.size
                            ? "bg-blue-950/30 border-blue-500"
                            : "bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="vehicle_size"
                            checked={selectedVehicleSize === modifier.size}
                            onChange={() => setSelectedVehicleSize(modifier.size)}
                            className="w-5 h-5"
                          />
                          <div>
                            <div className="text-white font-medium">
                              {vehicleSizeLabels[modifier.size] || modifier.size}
                            </div>
                            <div className="text-xs text-zinc-400">
                              {finalDuration} min total
                            </div>
                          </div>
                        </div>
                        <div className="text-emerald-400 font-semibold">
                          ${finalPrice.toFixed(2)}
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Cantidad de vehículos de este tipo
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={vehicleCount}
                    onChange={(e) =>
                      setVehicleCount(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="bg-zinc-800 border-zinc-700 text-white max-w-xs"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Service Extras */}
          {selectedService && selectedVehicleSize && serviceExtras.length > 0 && (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Extras Opcionales</CardTitle>
                <CardDescription>Servicios adicionales (aumentan tiempo y precio)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {serviceExtras.map((extra) => (
                    <label
                      key={extra.id}
                      className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition ${
                        selectedExtras.includes(extra.id)
                          ? "bg-blue-950/30 border-blue-500"
                          : "bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedExtras.includes(extra.id)}
                          onChange={() => toggleExtra(extra.id)}
                          className="w-5 h-5 rounded border-zinc-600"
                        />
                        <div>
                          <div className="text-white font-medium">{extra.name}</div>
                          {extra.description && (
                            <div className="text-xs text-zinc-400">{extra.description}</div>
                          )}
                          <div className="text-xs text-zinc-500">+{extra.duration_min} min</div>
                        </div>
                      </div>
                      <div className="text-emerald-400 font-semibold">
                        +${extra.price_mxn}
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Total Summary - Muestra después de seleccionar servicio y vehículo */}
          {selectedService && selectedVehicleSize && (
            <Card className="bg-blue-950/20 border-blue-800/30">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center text-white">
                  <div>
                    <div className="text-sm text-zinc-400 mb-1">Total del Servicio</div>
                    <div className="flex items-center gap-2 text-zinc-300">
                      <Clock className="w-4 h-4" />
                      <span>{totalDuration} minutos</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-emerald-400">
                      ${totalPrice.toFixed(2)}
                    </div>
                    <div className="text-xs text-zinc-400">MXN</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Date and Time Selection */}
          {selectedService && selectedVehicleSize && (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Fecha y Horario</CardTitle>
                <CardDescription>Selecciona la fecha y define el horario del servicio</CardDescription>
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
                    min={new Date().toISOString().split("T")[0]}
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
                
                {totalDuration > 0 && (
                  <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-800/30">
                    <p className="text-sm text-blue-300">
                      <Clock className="w-4 h-4 inline mr-2" />
                      Duración estimada del servicio: <span className="font-semibold">{totalDuration} minutos</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {selectedService && selectedVehicleSize && (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Indicaciones</CardTitle>
                <CardDescription>
                  Cómo localizar la casa o puntos de referencia
                </CardDescription>
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
              <span>¡Cita creada exitosamente! Redirigiendo...</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
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
              disabled={loading || !formData.date || !formData.start_time || !formData.end_time}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Cita
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
