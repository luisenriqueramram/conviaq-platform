"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, ArrowLeft, Plus, X, Trash2 } from "lucide-react";

interface VehicleModifier {
  size: string;
  absolute_price_mxn: string;
}

export default function NuevoServicioPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [serviceType, setServiceType] = useState<"pack" | "extra">("pack");
  const [suggestedName, setSuggestedName] = useState("");
  const [maxWorkersAvailable, setMaxWorkersAvailable] = useState(1);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    base_duration_min: "",
    min_workers: "1",
    max_workers: "1",
    is_active: true,
  });
  const [includes, setIncludes] = useState<string[]>([]);
  const [newInclude, setNewInclude] = useState("");
  const [vehicleModifiers, setVehicleModifiers] = useState<VehicleModifier[]>([]);
  const [showNewVehicleModal, setShowNewVehicleModal] = useState(false);
  const [newVehicleType, setNewVehicleType] = useState("");
  const [showEditVehicleModal, setShowEditVehicleModal] = useState(false);
  const [editingVehicleType, setEditingVehicleType] = useState("");
  const [editedVehicleName, setEditedVehicleName] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [serviceType]);

  const loadVehicleTypes = async () => {
    try {
      const vehicleTypesRes = await fetch("/api/custom/autolavado/vehicle-types");
      if (vehicleTypesRes.ok) {
        const types = await vehicleTypesRes.json();
        setVehicleTypes(types);
      }
    } catch (error) {
      console.error("Error loading vehicle types:", error);
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Cargar servicios existentes para nombre sugerido
      const servicesRes = await fetch("/api/custom/autolavado/services");
      if (servicesRes.ok) {
        const services = await servicesRes.json();
        const prefix = serviceType === "pack" ? "GO_PACK_" : "GO_EXTRA_";
        const numbers = services
          .filter((s: any) => s.code?.startsWith(prefix))
          .map((s: any) => parseInt(s.code.replace(prefix, "")) || 0);
        const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
        const nextNum = maxNum + 1;
        setSuggestedName(`Go ${serviceType === "pack" ? "Pack" : "Extra"} ${nextNum}`);
      }

      // Cargar workers para límite
      const workersRes = await fetch("/api/custom/autolavado/workers");
      if (workersRes.ok) {
        const workers = await workersRes.json();
        const activeWorkers = workers.filter((w: any) => w.is_active);
        setMaxWorkersAvailable(activeWorkers.length || 1);
      }

      // Cargar tipos de vehículo
      await loadVehicleTypes();
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInclude = () => {
    if (newInclude.trim()) {
      setIncludes([...includes, newInclude.trim()]);
      setNewInclude("");
    }
  };

  const handleRemoveInclude = (index: number) => {
    setIncludes(includes.filter((_, i) => i !== index));
  };

  const handleAddVehicleModifier = (size: string) => {
    if (!vehicleModifiers.find(vm => vm.size === size)) {
      setVehicleModifiers([...vehicleModifiers, { size, absolute_price_mxn: "" }]);
    }
  };

  const handleRemoveVehicleModifier = (size: string) => {
    setVehicleModifiers(vehicleModifiers.filter(vm => vm.size !== size));
  };

  const handlePriceChange = (size: string, price: string) => {
    setVehicleModifiers(vehicleModifiers.map(vm => 
      vm.size === size ? { ...vm, absolute_price_mxn: price } : vm
    ));
  };

  const handleEditVehicleType = async () => {
    if (!editedVehicleName.trim() || !editingVehicleType) return;
    
    try {
      const res = await fetch(`/api/custom/autolavado/vehicle-types/${encodeURIComponent(editingVehicleType)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName: editedVehicleName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al editar el tipo de vehículo");
        return;
      }

      // Recargar la lista de tipos desde la base de datos
      await loadVehicleTypes();
      
      // Actualizar los modificadores si existe alguno con este tipo
      setVehicleModifiers(vehicleModifiers.map(vm => 
        vm.size === editingVehicleType ? { ...vm, size: editedVehicleName.trim() } : vm
      ));

      setShowEditVehicleModal(false);
      setEditingVehicleType("");
      setEditedVehicleName("");
    } catch (error) {
      console.error("Error editing vehicle type:", error);
      setError("Error al editar el tipo de vehículo");
    }
  };

  const handleCreateNewVehicleType = async () => {
    if (!newVehicleType.trim()) return;
    
    try {
      // Guardar el tipo en el enum de la base de datos
      const res = await fetch("/api/custom/autolavado/vehicle-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleType: newVehicleType.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al crear el tipo de vehículo");
        return;
      }

      // Recargar la lista de tipos desde la base de datos
      await loadVehicleTypes();
      setShowNewVehicleModal(false);
      setNewVehicleType("");
    } catch (error) {
      console.error("Error creating vehicle type:", error);
      setError("Error al crear el tipo de vehículo");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      // Validaciones
      if (!formData.name) {
        setError("El nombre es obligatorio");
        setSaving(false);
        return;
      }

      if (!formData.base_duration_min || parseInt(formData.base_duration_min) <= 0) {
        setError("La duración debe ser mayor a 0");
        setSaving(false);
        return;
      }

      if (vehicleModifiers.length === 0) {
        setError("Debe agregar al menos un tipo de vehículo");
        setSaving(false);
        return;
      }

      // Validar que todos los precios estén completos
      for (const modifier of vehicleModifiers) {
        if (!modifier.absolute_price_mxn || parseFloat(modifier.absolute_price_mxn) < 0) {
          setError("Todos los precios deben ser válidos");
          setSaving(false);
          return;
        }
      }

      const serviceData = {
        service_type: serviceType,
        name: formData.name,
        base_duration_min: parseInt(formData.base_duration_min),
        min_workers: parseInt(formData.min_workers),
        max_workers: parseInt(formData.max_workers),
        is_active: formData.is_active,
        includes: includes,
        vehicle_modifiers: vehicleModifiers,
      };

      const res = await fetch("/api/custom/autolavado/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceData),
      });

      if (res.ok) {
        router.push("/portal/custom/autolavado/servicios");
      } else {
        const data = await res.json();
        setError(data.error || "Error al crear el servicio");
      }
    } catch (err) {
      console.error("Error creating service:", err);
      setError("Error al crear el servicio. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Cargando...</p>
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
            size="icon"
            onClick={() => router.back()}
            className="border-zinc-700 hover:border-zinc-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Nuevo Servicio</h1>
            <p className="text-zinc-400 mt-1">Crea un nuevo paquete de lavado</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Básica */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Información Básica</CardTitle>
              <CardDescription>Datos principales del servicio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Tipo de Servicio *
                </label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as "pack" | "extra")}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pack">Servicio</option>
                  <option value="extra">Extra</option>
                </select>
                <p className="text-xs text-zinc-500 mt-1">Servicio de cajón o servicio extra</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Nombre del Servicio *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={suggestedName || "Ej: Lavado Básico"}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Nombre que verá el cliente • Sugerido: <span className="text-blue-400">{suggestedName}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm text-zinc-300">
                  Servicio activo (visible para agendar citas)
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Duración y Trabajadores */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Duración y Personal</CardTitle>
              <CardDescription>Configuración de tiempo y trabajadores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Duración Base (minutos) *
                </label>
                <Input
                  type="number"
                  min="1"
                  value={formData.base_duration_min}
                  onChange={(e) => setFormData({ ...formData, base_duration_min: e.target.value })}
                  placeholder="Ej: 30"
                  className="bg-zinc-800 border-zinc-700 text-white"
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">Tiempo estimado del servicio</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Mínimo de Trabajadores *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max={maxWorkersAvailable}
                    value={formData.min_workers}
                    onChange={(e) => setFormData({ ...formData, min_workers: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Máximo de Trabajadores *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max={maxWorkersAvailable}
                    value={formData.max_workers}
                    onChange={(e) => setFormData({ ...formData, max_workers: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                Trabajadores disponibles: {maxWorkersAvailable}
              </p>
            </CardContent>
          </Card>

          {/* Lo que Incluye */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">¿Qué Incluye?</CardTitle>
              <CardDescription>Lista de items incluidos en el servicio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newInclude}
                  onChange={(e) => setNewInclude(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddInclude();
                    }
                  }}
                  placeholder="Ej: Lavado exterior completo"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddInclude}
                  className="border-zinc-700"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {includes.length > 0 && (
                <div className="space-y-2">
                  {includes.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-zinc-800/50 p-3 rounded-lg"
                    >
                      <span className="text-sm text-zinc-300">{item}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveInclude(index)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {includes.length === 0 && (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  No hay items agregados. Usa el campo de arriba para agregar lo que incluye el
                  servicio.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tipos de Vehículo y Precios */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Tipos de Vehículo y Precios *</CardTitle>
              <CardDescription>Agrega al menos un tipo de vehículo con su precio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selector de tipos + botón crear */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!isDropdownOpen) {
                        await loadVehicleTypes();
                      }
                      setIsDropdownOpen(!isDropdownOpen);
                    }}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between"
                  >
                    <span className="text-zinc-400">Selecciona un tipo de vehículo...</span>
                    <span className="text-zinc-400">{isDropdownOpen ? '▲' : '▼'}</span>
                  </button>
                  
                  {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {vehicleTypes.length === 0 ? (
                        <div className="px-3 py-2 text-zinc-500 text-sm">No hay tipos disponibles</div>
                      ) : (
                        vehicleTypes.map(type => {
                          const isDisabled = vehicleModifiers.some(vm => vm.size === type);
                          return (
                            <div
                              key={type}
                              className={`flex items-center justify-between px-3 py-2 hover:bg-zinc-700/50 ${
                                isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isDisabled) {
                                    handleAddVehicleModifier(type);
                                    setIsDropdownOpen(false);
                                  }
                                }}
                                disabled={isDisabled}
                                className="flex-1 text-left text-white capitalize"
                              >
                                {type}
                              </button>
                              {serviceType === "pack" && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingVehicleType(type);
                                    setEditedVehicleName(type);
                                    setShowEditVehicleModal(true);
                                    setIsDropdownOpen(false);
                                  }}
                                  className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                >
                                  ✏️
                                </Button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
                {serviceType === "pack" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewVehicleModal(true)}
                    className="border-zinc-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Tipo
                  </Button>
                )}
              </div>

              {/* Lista de modificadores agregados */}
              {vehicleModifiers.length > 0 && (
                <div className="space-y-3">
                  {vehicleModifiers.map((modifier) => (
                    <div key={modifier.size} className="flex items-center gap-3 bg-zinc-800/50 p-3 rounded-lg">
                      <div className="flex-1">
                        <label className="block text-xs text-zinc-400 mb-1 capitalize">
                          {modifier.size}
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400">$</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={modifier.absolute_price_mxn}
                            onChange={(e) => handlePriceChange(modifier.size, e.target.value)}
                            placeholder="0.00"
                            className="bg-zinc-800 border-zinc-700 text-white"
                            required
                          />
                          <span className="text-zinc-400">MXN</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveVehicleModifier(modifier.size)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {vehicleModifiers.length === 0 && (
                <div className="text-center py-8 text-zinc-500 text-sm border border-dashed border-zinc-700 rounded-lg">
                  Agrega al menos un tipo de vehículo para poder crear el servicio
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modal para nuevo tipo de vehículo */}
          {showNewVehicleModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md mx-4 bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">Nuevo Tipo de Vehículo</CardTitle>
                  <CardDescription>Agrega un nuevo tipo de vehículo a la lista</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    value={newVehicleType}
                    onChange={(e) => setNewVehicleType(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateNewVehicleType();
                      }
                    }}
                    placeholder="Ej: SUV 3 Filas"
                    className="bg-zinc-800 border-zinc-700 text-white"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowNewVehicleModal(false);
                        setNewVehicleType("");
                      }}
                      className="flex-1 border-zinc-700"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCreateNewVehicleType}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      disabled={!newVehicleType.trim()}
                    >
                      Guardar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Modal para editar tipo de vehículo */}
          {showEditVehicleModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md mx-4 bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">Editar Tipo de Vehículo</CardTitle>
                  <CardDescription>Cambia el nombre del tipo: {editingVehicleType}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    value={editedVehicleName}
                    onChange={(e) => setEditedVehicleName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleEditVehicleType();
                      }
                    }}
                    placeholder="Nuevo nombre"
                    className="bg-zinc-800 border-zinc-700 text-white"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowEditVehicleModal(false);
                        setEditingVehicleType("");
                        setEditedVehicleName("");
                      }}
                      className="flex-1 border-zinc-700"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleEditVehicleType}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      disabled={!editedVehicleName.trim()}
                    >
                      Guardar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-lg bg-red-950/30 border border-red-800/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1 border-zinc-700 hover:border-zinc-600"
              disabled={saving}
            >
              Cancelar
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
                  <Save className="w-4 h-4 mr-2" />
                  Crear Servicio
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
