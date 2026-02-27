"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "../../../../../components/ui/tooltip";
import { useParams } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";

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
  const [showToast, setShowToast] = useState(false);
  const [activeTab, setActiveTab] = useState<"parametros" | "cotizaciones">("parametros");
  const { configId } = useParams();
  const [valores, setValores] = useState(valoresPorDefecto);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Estados para cotizaciones
  const [clienteName, setClienteName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [quotationType, setQuotationType] = useState<"pdf" | "consumption" | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [consumption, setConsumption] = useState("");
  const [quotationLoading, setQuotationLoading] = useState(false);
  const [quotationError, setQuotationError] = useState("");
  const [quotationSuccess, setQuotationSuccess] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/custom/solar-panels/${configId}`);
        if (!res.ok) throw new Error("No autorizado o error de acceso");
        const data = await res.json();
        if (isMounted) {
          setValores({ ...valoresPorDefecto, ...data });
          setError("");
        }
      } catch (e) {
        if (isMounted) setError("No tienes acceso o hubo un error al cargar los datos.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => { isMounted = false; };
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
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (e) {
      setError("Error al guardar los cambios.");
    }
  }

  function handleRestablecer() {
    setLoading(true);
    setError("");
    setSuccess("");
    // Volver a cargar los valores reales desde el backend
    fetch(`/api/custom/solar-panels/${configId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = await res.json();
        setValores({ ...valoresPorDefecto, ...data });
      })
      .catch(() => setError("No se pudieron restablecer los valores."))
      .finally(() => setLoading(false));
  }

  // Funciones para cotizaciones
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files) {
      const allowedTypes = ["application/pdf"];
      const newFiles = Array.from(files).filter(file => allowedTypes.includes(file.type));
      
      if (newFiles.length !== Array.from(files).length) {
        setQuotationError("Solo se permiten archivos PDF");
        return;
      }
      
      // Solo mantener el primer archivo
      setUploadedFiles([newFiles[0]]);
      setQuotationError("");
    }
  }

  function removeFile(index: number) {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSendQuotation(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setQuotationError("");
    setQuotationSuccess("");

    // Validaciones
    if (!clienteName.trim()) {
      setQuotationError("El nombre del cliente es obligatorio");
      return;
    }

    if (!clientEmail.trim()) {
      setQuotationError("El correo del cliente es obligatorio");
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail)) {
      setQuotationError("El correo no es válido");
      return;
    }

    if (!quotationType) {
      setQuotationError("Debes seleccionar un tipo de cotización");
      return;
    }

    if (quotationType === "consumption") {
      const consumptionValue = parseFloat(consumption);
      if (isNaN(consumptionValue) || consumptionValue <= 0) {
        setQuotationError("El consumo promedio debe ser un número positivo");
        return;
      }
    } else if (quotationType === "pdf") {
      if (uploadedFiles.length === 0) {
        setQuotationError("Debes subir al menos un archivo PDF");
        return;
      }
    }

    setQuotationLoading(true);

    try {
      const formData = new FormData();
      formData.append("client_name", clienteName);
      formData.append("client_email", clientEmail);
      formData.append("quotation_type", quotationType);

      if (quotationType === "consumption") {
        formData.append("consumption_kwh", consumption);
      } else {
        uploadedFiles.forEach((file) => {
          formData.append("files", file, file.name);
        });
      }

      const res = await fetch(`/api/custom/solar-panels/${configId}/quotation`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Error al enviar cotización");
      }

      setQuotationSuccess("¡Cotización enviada! Recibirás el resultado en tu correo en unos momentos.");
      // Limpiar formulario
      setClienteName("");
      setClientEmail("");
      setQuotationType(null);
      setUploadedFiles([]);
      setConsumption("");
      
      setTimeout(() => setQuotationSuccess(""), 5000);
    } catch (e) {
      setQuotationError(
        e instanceof Error ? e.message : "Error al enviar la cotización"
      );
    } finally {
      setQuotationLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold mb-2">Paneles Solares</h1>
      
      {/* Pestañas */}
      <div className="flex gap-4 border-b border-zinc-200">
        <button
          onClick={() => setActiveTab("parametros")}
          className={`px-4 py-2 font-medium transition ${
            activeTab === "parametros"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Parámetros
        </button>
        <button
          onClick={() => setActiveTab("cotizaciones")}
          className={`px-4 py-2 font-medium transition ${
            activeTab === "cotizaciones"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Cotizaciones
        </button>
      </div>

      {/* Pestaña de Parámetros */}
      {activeTab === "parametros" && (
        <>
          <p className="text-zinc-500 mb-6">Ajusta los parámetros globales que utiliza el algoritmo de cotización de paneles solares para este tenant.</p>
          {loading && <div className="text-center text-zinc-400">Cargando...</div>}
          {!loading && error && (
            <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">{error}</div>
          )}
          {!loading && !error && (
            <>
              {success && <div className="bg-green-100 text-green-700 px-4 py-2 rounded mb-4">{success}</div>}
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
                                  className="w-full border-2 border-zinc-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
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
                  <Button type="submit" variant="default" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded shadow transition flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Guardar Cambios
                  </Button>
                </div>
                {showToast && (
                  <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded shadow-lg z-50 text-lg font-semibold animate-fade-in-out">
                    ¡Datos actualizados correctamente!
                  </div>
                )}
              </form>
            </>
          )}
        </>
      )}

      {/* Pestaña de Cotizaciones */}
      {activeTab === "cotizaciones" && (
        <>
          <p className="text-zinc-500 mb-6">Crea nuevas cotizaciones subiendo un PDF de tu recibo o ingresando tu consumo promedio. Recibirás tu cotización por correo en unos momentos.</p>
          
          {quotationError && (
            <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">{quotationError}</div>
          )}
          {quotationSuccess && (
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded mb-4">{quotationSuccess}</div>
          )}

          <form onSubmit={handleSendQuotation} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información del Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="font-medium">Nombre del Cliente *</label>
                  <Input
                    type="text"
                    placeholder="Ej: Juan García"
                    value={clienteName}
                    onChange={e => setClienteName(e.target.value)}
                    className="w-full border-2 border-zinc-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-medium">Correo Electrónico *</label>
                  <Input
                    type="email"
                    placeholder="Ej: juan@example.com"
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    className="w-full border-2 border-zinc-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                  />
                  <p className="text-xs text-zinc-500">Se enviará la cotización a este correo</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tipo de Cotización</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border-2 border-zinc-200 rounded cursor-pointer hover:bg-blue-50 transition" style={{ borderColor: quotationType === "pdf" ? "#2563eb" : undefined, backgroundColor: quotationType === "pdf" ? "#eff6ff" : undefined }}>
                    <input
                      type="radio"
                      name="quotationType"
                      value="pdf"
                      checked={quotationType === "pdf"}
                      onChange={e => {
                        setQuotationType(e.target.value as "pdf");
                        setUploadedFiles([]);
                        setConsumption("");
                      }}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">📄 Subir PDF de Recibo</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 border-2 border-zinc-200 rounded cursor-pointer hover:bg-blue-50 transition" style={{ borderColor: quotationType === "consumption" ? "#2563eb" : undefined, backgroundColor: quotationType === "consumption" ? "#eff6ff" : undefined }}>
                    <input
                      type="radio"
                      name="quotationType"
                      value="consumption"
                      checked={quotationType === "consumption"}
                      onChange={e => {
                        setQuotationType(e.target.value as "consumption");
                        setUploadedFiles([]);
                        setConsumption("");
                      }}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">⚡ Consumo Promedio en kWh</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Sección de Carga de Archivos */}
            {quotationType === "pdf" && (
              <Card>
                <CardHeader>
                  <CardTitle>Subir PDF del Recibo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {uploadedFiles.length === 0 ? (
                    <>
                      <div className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-12 text-center hover:bg-blue-100 transition">
                        <svg className="w-16 h-16 mx-auto mb-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <label htmlFor="file-upload" className="block cursor-pointer">
                          <p className="text-lg font-semibold text-blue-900 mb-2">Sube tu PDF del recibo</p>
                          <p className="text-sm text-blue-700 mb-4">Haz clic o arrastra el archivo aquí</p>
                          <div className="inline-block">
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={handleFileChange}
                              className="hidden"
                              id="file-upload"
                            />
                            <button
                              type="button"
                              onClick={() => document.getElementById("file-upload")?.click()}
                              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition transform hover:scale-105 flex items-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Seleccionar PDF
                            </button>
                          </div>
                        </label>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-green-100 border-2 border-green-300 rounded-lg p-6">
                        <div className="flex items-center gap-3">
                          <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="font-semibold text-green-900">Archivo cargado</p>
                            <p className="text-sm text-green-700">{uploadedFiles[0].name}</p>
                            <p className="text-xs text-green-600">{(uploadedFiles[0].size / 1024).toFixed(2)} KB</p>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(0)}
                        className="w-full px-4 py-2 text-red-600 hover:text-red-700 font-medium border-2 border-red-200 hover:bg-red-50 rounded-lg transition"
                      >
                        Cambiar archivo
                      </button>
                      <p className="text-xs text-zinc-500 text-center italic">Nota: Solo puede haber un PDF cargado a la vez</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Sección de Consumo Promedio */}
            {quotationType === "consumption" && (
              <Card>
                <CardHeader>
                  <CardTitle>Consumo Promedio Bimestral</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="font-medium">Consumo en kWh *</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Ej: 250"
                        value={consumption}
                        onChange={e => setConsumption(e.target.value)}
                        className="w-full border-2 border-zinc-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                      />
                      <span className="text-zinc-400 font-medium">kWh</span>
                    </div>
                    <p className="text-xs text-zinc-500">Ingresa el consumo promedio bimestral (cada dos meses) en kilowatt-hora</p>
                    <p className="text-xs text-amber-600 font-semibold bg-amber-50 p-2 rounded border border-amber-200">⚠️ Importante: Este debe ser el consumo de tu recibo CFE (dos meses), no el consumo mensual</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Botón de Envío */}
            {quotationType && (
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={quotationLoading}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded shadow transition flex items-center gap-2 disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  {quotationLoading ? "Enviando..." : "Enviar Cotización"}
                </Button>
              </div>
            )}
          </form>
        </>
      )}
    </div>
  );
}
