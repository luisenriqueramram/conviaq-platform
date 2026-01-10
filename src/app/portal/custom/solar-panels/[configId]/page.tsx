"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "../../../../../components/ui/tooltip";
import { useParams } from "next/navigation";

const campos = [
  // Financiero y Equipo
  {
    grupo: "💰 Financiero y Equipo",
    fields: [
      {
        key: "price_per_panel",
        label: "Costo unitario por panel",
        suffix: "$",
        tooltip: "Precio de cada panel solar en pesos mexicanos.",
      },
      {
        key: "panel_watts",
        label: "Potencia del panel",
        suffix: "W",
        tooltip: "Potencia nominal de cada panel solar en watts.",
      },
      {
        key: "min_bimestral_fee",
        label: "Tarifa mínima CFE",
        suffix: "$",
        tooltip: "Tarifa mínima bimestral de la CFE.",
      },
    ],
  },
  // Factores de Cálculo
  {
    grupo: "⚡ Factores de Cálculo",
    fields: [
      {
        key: "sun_hours_factor",
        label: "Horas solares pico (HSP)",
        suffix: "h",
        tooltip: "Promedio de horas de sol efectivas para la zona geográfica.",
      },
      {
        key: "growth_factor",
        label: "Factor de crecimiento",
        suffix: "x",
        tooltip: "Factor de crecimiento para opción confort. Debe ser ≥ 1.0.",
        min: 1.0,
      },
      {
        key: "limit_factor",
        label: "Factor límite",
        suffix: "x",
        tooltip: "Factor límite para opción futuro. Debe ser ≥ 1.0.",
        min: 1.0,
      },
    ],
  },
  // Impacto Ecológico
  {
    grupo: "🌿 Impacto Ecológico",
    fields: [
      {
        key: "co2_factor_per_kwh",
        label: "Factor CO₂ por kWh",
        suffix: "kg",
        tooltip: "Emisiones de CO₂ por cada kWh generado.",
      },
      {
        key: "tree_co2_absorption",
        label: "Absorción CO₂ por árbol",
        suffix: "kg/año",
        tooltip: "Cantidad de CO₂ que absorbe un árbol por año.",
      },
      {
        key: "car_co2_per_km",
        label: "CO₂ por auto/km",
        suffix: "kg/km",
        tooltip: "Emisiones de CO₂ por cada kilómetro recorrido en auto.",
      },
    ],
  },
];

const valoresPorDefecto = {
  panel_watts: 620,
  price_per_panel: 8000,
  sun_hours_factor: 4.5,
  min_bimestral_fee: 65,
  growth_factor: 1.2,
  limit_factor: 1.44,
  co2_factor_per_kwh: 0.31165,
  tree_co2_absorption: 21,
  car_co2_per_km: 0.19166,
};

export default function ConfiguracionParametrosSolares() {
  const { configId } = useParams();
  const [valores, setValores] = useState(valoresPorDefecto);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/custom/solar-panels/${configId}`);
        if (!res.ok) throw new Error("No autorizado o error de acceso");
        const data = await res.json();
        setValores({ ...valoresPorDefecto, ...data });
      } catch (e) {
        setError("No tienes acceso o hubo un error al cargar los datos.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    // eslint-disable-next-line
  }, [configId]);

  function handleChange(key: keyof typeof valoresPorDefecto, value: number | string) {
    setValores((prev) => ({ ...prev, [key]: Number(value) }));
  }

  async function handleGuardar() {
    setError("");
    setSuccess("");
    // Validaciones
    for (const grupo of campos) {
      for (const field of grupo.fields) {
        const key = field.key as keyof typeof valoresPorDefecto;
        const val = Number(valores[key]);
        if (isNaN(val) || val < 0) {
          setError(`El campo "${field.label}" no puede ser negativo ni vacío.`);
          return;
        }
        if (field.min && val < field.min) {
          setError(`El campo "${field.label}" debe ser mayor o igual a ${field.min}.`);
          return;
        }
      }
    }
    // Guardar
    try {
      const res = await fetch(`/api/custom/solar-panels/${configId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valores),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setSuccess("¡Cambios guardados exitosamente!");
    } catch (e) {
      setError("Error al guardar los cambios.");
    }
  }

  function handleRestablecer() {
    setValores(valoresPorDefecto);
    setSuccess("");
    setError("");
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold mb-2">Configuración de Parámetros Solares</h1>
      <p className="text-zinc-500 mb-6">Ajusta los parámetros globales que utiliza el algoritmo de cotización de paneles solares para este tenant.</p>
      {error && <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 px-4 py-2 rounded mb-4">{success}</div>}
      {loading ? (
        <div className="text-center text-zinc-400">Cargando...</div>
      ) : (
        <form onSubmit={e => { e.preventDefault(); handleGuardar(); }}>
          <div className="space-y-6">
            {campos.map((grupo) => (
              <Card key={grupo.grupo}>
                <CardHeader>
                  <CardTitle>{grupo.grupo}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {grupo.fields.map((field) => (
                      <div key={field.key} className="flex flex-col gap-1">
                        <label className="font-medium flex items-center gap-2">
                          {field.label}
                          <Tooltip content={field.tooltip}>
                            <span className="text-blue-500 cursor-help">?</span>
                          </Tooltip>
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={field.min ?? 0}
                            step="any"
                            value={valores[field.key as keyof typeof valoresPorDefecto]}
                            onChange={e => handleChange(field.key as keyof typeof valoresPorDefecto, e.target.value)}
                            className="w-full"
                          />
                          <span className="text-zinc-400">{field.suffix}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex gap-4 mt-8">
            <Button type="submit" variant="default">Guardar Cambios</Button>
            <Button type="button" variant="outline" onClick={handleRestablecer}>Restablecer Valores</Button>
          </div>
        </form>
      )}
    </div>
  );
}
