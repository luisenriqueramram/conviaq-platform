"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Save, Utensils } from "lucide-react";
import type { WeeklyHours } from "@/types/autolavado";

const DAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 7, label: "Domingo" },
];

interface MealPolicy {
  id?: number;
  base_start_local: string;
  base_end_local: string;
  duration_min: number;
  flex_before_min: number;
  flex_after_min: number;
  is_enabled: boolean;
}

export default function HorariosPage() {
  const [weeklyHours, setWeeklyHours] = useState<Partial<WeeklyHours>[]>([]);
  const [mealPolicy, setMealPolicy] = useState<MealPolicy>({
    base_start_local: "14:00:00",
    base_end_local: "15:00:00",
    duration_min: 60,
    flex_before_min: 15,
    flex_after_min: 15,
    is_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadHours();
    loadMealPolicy();
  }, []);

  const loadHours = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/custom/autolavado/config/weekly-hours");
      
      if (res.ok) {
        const data = await res.json();
        setWeeklyHours(data.length > 0 ? data : createDefaultWeeklyHours());
      } else {
        setWeeklyHours(createDefaultWeeklyHours());
      }
    } catch (error) {
      console.error("Error loading hours:", error);
      setWeeklyHours(createDefaultWeeklyHours());
    } finally {
      setLoading(false);
    }
  };

  const loadMealPolicy = async () => {
    try {
      const res = await fetch("/api/custom/autolavado/config/meal-policy");
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setMealPolicy(data);
        }
      }
    } catch (error) {
      console.error("Error loading meal policy:", error);
    }
  };

  const createDefaultWeeklyHours = (): Partial<WeeklyHours>[] => {
    return DAYS.map((day) => ({
      day_of_week: day.value,
      start_local: "09:00:00",
      end_local: "18:00:00",
      is_enabled: day.value !== 7, // Domingo (7) deshabilitado por defecto
    }));
  };

  const updateWeeklyHour = (dayOfWeek: number, field: string, value: any) => {
    setWeeklyHours((prev) =>
      prev.map((wh) => (wh.day_of_week === dayOfWeek ? { ...wh, [field]: value } : wh))
    );
  };

  const saveWeeklyHours = async () => {
    try {
      setSaving(true);

      for (const wh of weeklyHours) {
        const response = await fetch("/api/custom/autolavado/config/weekly-hours", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(wh),
        });

        if (!response.ok) throw new Error("Error al guardar horarios");
      }

      alert("Horarios guardados exitosamente");
    } catch (error) {
      console.error("Error saving hours:", error);
      alert("Error al guardar horarios");
    } finally {
      setSaving(false);
    }
  };

  const saveMealPolicy = async () => {
    try {
      setSaving(true);
      
      // Calcular duración automáticamente
      const [startH, startM] = mealPolicy.base_start_local.split(':').map(Number);
      const [endH, endM] = mealPolicy.base_end_local.split(':').map(Number);
      const durationMin = (endH * 60 + endM) - (startH * 60 + startM);
      
      const response = await fetch("/api/custom/autolavado/config/meal-policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...mealPolicy,
          duration_min: durationMin, // Usar duración calculada
        }),
      });

      if (!response.ok) throw new Error("Error al guardar política de comida");
      
      await loadMealPolicy();
      alert("✅ Política de comida guardada");
    } catch (error) {
      console.error("Error saving meal policy:", error);
      alert("❌ Error al guardar política de comida");
    } finally {
      setSaving(false);
    }
  };

  const updateMealPolicy = (field: keyof MealPolicy, value: any) => {
    setMealPolicy((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Si cambia start o end, recalcular duration automáticamente
      if (field === 'base_start_local' || field === 'base_end_local') {
        const [startH, startM] = updated.base_start_local.split(':').map(Number);
        const [endH, endM] = updated.base_end_local.split(':').map(Number);
        updated.duration_min = (endH * 60 + endM) - (startH * 60 + startM);
      }
      
      return updated;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-zinc-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Horarios de Operación</h1>
            <p className="text-zinc-400 mt-1">Define los horarios de trabajo por día</p>
          </div>
          <Button
            onClick={saveWeeklyHours}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Guardando..." : "Guardar Horarios"}
          </Button>
        </div>

        {/* Horarios Card */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Configuración Semanal
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Activa o desactiva días y define horarios de inicio y fin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weeklyHours.map((wh) => {
                const day = DAYS.find((d) => d.value === wh.day_of_week);
                if (!wh.day_of_week || !wh.start_local || !wh.end_local) return null;
                
                return (
                  <div
                    key={wh.day_of_week}
                    className="flex items-center gap-4 p-4 rounded-lg bg-zinc-800/30 border border-zinc-700/50"
                  >
                    <div className="flex items-center gap-3 w-40">
                      <button
                        type="button"
                        onClick={() =>
                          updateWeeklyHour(wh.day_of_week!, "is_enabled", !wh.is_enabled)
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          wh.is_enabled ? "bg-blue-600" : "bg-zinc-700"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            wh.is_enabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span className={`font-medium ${wh.is_enabled ? "text-white" : "text-zinc-500"}`}>
                        {day?.label}
                      </span>
                    </div>

                    {wh.is_enabled ? (
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-400">Inicio:</span>
                          <Input
                            type="time"
                            value={wh.start_local.slice(0, 5)}
                            onChange={(e) =>
                              updateWeeklyHour(wh.day_of_week!, "start_local", e.target.value + ":00")
                            }
                            className="w-32 bg-zinc-800 border-zinc-700 text-white"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-400">Fin:</span>
                          <Input
                            type="time"
                            value={wh.end_local.slice(0, 5)}
                            onChange={(e) =>
                              updateWeeklyHour(wh.day_of_week!, "end_local", e.target.value + ":00")
                            }
                            className="w-32 bg-zinc-800 border-zinc-700 text-white"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 text-sm text-zinc-500">Cerrado</div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Política de Comida Card */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Utensils className="w-5 h-5" />
              Política de Comida
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Define el horario de comida para los trabajadores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Toggle Habilitado */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/30 border border-zinc-700/50">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Horario de Comida
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    {mealPolicy.is_enabled 
                      ? 'Durante este horario no se inician servicios nuevos' 
                      : 'Desactivado - no se aplica restricción de comida'}
                  </p>
                </div>
                <button
                  onClick={() => updateMealPolicy('is_enabled', !mealPolicy.is_enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    mealPolicy.is_enabled ? 'bg-blue-600' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      mealPolicy.is_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {mealPolicy.is_enabled && (
                <>
                  {/* Horario Base */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Hora de Inicio
                      </label>
                      <Input
                        type="time"
                        value={mealPolicy.base_start_local.slice(0, 5)}
                        onChange={(e) => updateMealPolicy('base_start_local', e.target.value + ':00')}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Hora de Fin
                      </label>
                      <Input
                        type="time"
                        value={mealPolicy.base_end_local.slice(0, 5)}
                        onChange={(e) => updateMealPolicy('base_end_local', e.target.value + ':00')}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                  </div>

                  {/* Duración (Solo lectura - calculada automáticamente) */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Duración Total
                    </label>
                    <div className="px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-400">
                      {mealPolicy.duration_min} minutos
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Calculado automáticamente según horario inicio/fin
                    </p>
                  </div>

                  {/* Flexibilidad */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Flex Antes (min)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={mealPolicy.flex_before_min}
                        onChange={(e) => updateMealPolicy('flex_before_min', Number(e.target.value))}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                      <p className="text-xs text-zinc-500 mt-1">
                        Minutos antes permitidos
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Flex Después (min)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={mealPolicy.flex_after_min}
                        onChange={(e) => updateMealPolicy('flex_after_min', Number(e.target.value))}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                      <p className="text-xs text-zinc-500 mt-1">
                        Minutos después permitidos
                      </p>
                    </div>
                  </div>

                  {/* Vista Previa */}
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">
                      Vista Previa
                    </h4>
                    <div className="text-sm text-zinc-300 space-y-1">
                      <p>🍽️ Horario base: {mealPolicy.base_start_local.slice(0, 5)} - {mealPolicy.base_end_local.slice(0, 5)}</p>
                      <p>⏱️ Duración: {mealPolicy.duration_min} minutos</p>
                      <p>🔄 Flexibilidad: {mealPolicy.flex_before_min} min antes / {mealPolicy.flex_after_min} min después</p>
                    </div>
                  </div>

                  {/* Botón Guardar Política de Comida */}
                  <Button
                    onClick={saveMealPolicy}
                    disabled={saving}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Guardando..." : "Guardar Política de Comida"}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
