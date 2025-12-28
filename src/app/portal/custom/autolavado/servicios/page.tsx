"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import type { Service } from "@/types/autolavado";

export default function ServiciosPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/custom/autolavado/services");
      if (res.ok) {
        const data = await res.json();
        setServices(data);
      }
    } catch (error) {
      console.error("Error loading services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/custom/autolavado/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (res.ok) {
        loadServices();
      }
    } catch (error) {
      console.error("Error toggling service:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Seguro que quieres eliminar este servicio?")) return;

    try {
      const res = await fetch(`/api/custom/autolavado/services/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadServices();
      }
    } catch (error) {
      console.error("Error deleting service:", error);
    }
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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Servicios</h1>
            <p className="text-zinc-400 mt-1">Administra los paquetes de lavado</p>
          </div>
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => router.push("/portal/custom/autolavado/servicios/nuevo")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Servicio
          </Button>
        </div>

        {/* Services Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id} className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-white text-lg">{service.name}</CardTitle>
                    <div className="text-xs text-zinc-500">{service.code}</div>
                  </div>
                  <Badge 
                    variant={service.is_active ? "default" : "secondary"}
                    className={service.is_active ? "" : "bg-yellow-500/20 text-yellow-300 border-yellow-500/50"}
                  >
                    {service.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm text-zinc-400">
                    <span className="font-medium">Duración:</span> {service.base_duration_min} min
                  </div>
                  <div className="text-sm text-zinc-400">
                    <span className="font-medium">Precio base:</span> $
                    {service.base_price_mxn || "0"} MXN
                  </div>
                  <div className="text-sm text-zinc-400">
                    <span className="font-medium">Trabajadores:</span> {service.min_workers}-
                    {service.max_workers}
                  </div>
                </div>

                {service.includes && service.includes.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-zinc-500 uppercase">Incluye:</div>
                    <ul className="text-xs text-zinc-400 space-y-1">
                      {service.includes.slice(0, 3).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-blue-500">•</span>
                          <span className="line-clamp-2">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-zinc-700"
                    onClick={() => handleToggleActive(service.id, service.is_active)}
                  >
                    {service.is_active ? "Desactivar" : "Activar"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-zinc-700"
                    onClick={() => router.push(`/portal/custom/autolavado/servicios/${service.id}`)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    onClick={() => handleDelete(service.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {services.length === 0 && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="text-center py-12 text-zinc-500">
              No hay servicios configurados
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
