"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserAreas } from "@/lib/firestore/areas";
import { createReport, updateReport } from "@/lib/firestore/reports";
import { Report, ReportFormData, IndexType, ReportFrequency } from "@/types/report";
import { Area } from "@/types/area";

interface ReportConfigProps {
  onSave: () => void;
  initialData?: Report;
}

export default function ReportConfig({ onSave, initialData }: ReportConfigProps) {
  const { user } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<ReportFormData>({
    areaIds: initialData?.areaIds || [],
    indices: initialData?.indices || ["NDVI"],
    cloudCoverage: initialData?.cloudCoverage || 20,
    frequency: initialData?.frequency || "weekly",
    email: initialData?.email || user?.email || "",
  });

  const loadAreas = useCallback(async () => {
    if (!user) return;
    try {
      const userAreas = await getUserAreas(user.uid);
      setAreas(userAreas);
    } catch (error) {
      console.error("Error loading areas:", error);
    }
  }, [user]);

  useEffect(() => {
    loadAreas();
  }, [loadAreas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!user) {
      setError("Debes estar autenticado");
      return;
    }

    if (formData.areaIds.length === 0) {
      setError("Selecciona al menos un área");
      return;
    }

    if (formData.indices.length === 0) {
      setError("Selecciona al menos un índice");
      return;
    }

    if (!formData.email || !formData.email.includes("@")) {
      setError("Email inválido");
      return;
    }

    setLoading(true);
    try {
      if (initialData?.id) {
        await updateReport(initialData.id, {
          ...formData,
          deliveryMethod: "email",
          status: initialData.status,
        });
      } else {
        await createReport({
          ...formData,
          userId: user.uid,
          deliveryMethod: "email",
          status: "active",
        });
      }
      onSave();
    } catch (err: any) {
      setError(err.message || "Error al guardar el reporte");
    } finally {
      setLoading(false);
    }
  };

  const toggleArea = (areaId: string) => {
    setFormData((prev) => ({
      ...prev,
      areaIds: prev.areaIds.includes(areaId)
        ? prev.areaIds.filter((id) => id !== areaId)
        : [...prev.areaIds, areaId],
    }));
  };

  const toggleIndex = (index: IndexType) => {
    setFormData((prev) => ({
      ...prev,
      indices: prev.indices.includes(index)
        ? prev.indices.filter((i) => i !== index)
        : [...prev.indices, index],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Áreas *
        </label>
        <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
          {areas.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay áreas disponibles. Crea áreas primero en la sección de Imágenes.
            </p>
          ) : (
            areas.map((area) => (
              <label key={area.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.areaIds.includes(area.id || "")}
                  onChange={() => area.id && toggleArea(area.id)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">{area.name}</span>
              </label>
            ))
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Índices *
        </label>
        <div className="space-y-2">
          {(["NDVI", "NDRE", "EVI"] as IndexType[]).map((index) => (
            <label key={index} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.indices.includes(index)}
                onChange={() => toggleIndex(index)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">{index}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cobertura de nubes: {formData.cloudCoverage}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={formData.cloudCoverage}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, cloudCoverage: Number(e.target.value) }))
          }
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Frecuencia *
        </label>
        <select
          value={formData.frequency}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, frequency: e.target.value as ReportFrequency }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
        >
          <option value="daily">Diario</option>
          <option value="weekly">Semanal</option>
          <option value="monthly">Mensual</option>
        </select>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email para recibir reportes *
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, email: e.target.value }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "Guardando..." : initialData ? "Actualizar Reporte" : "Crear Reporte"}
      </button>
    </form>
  );
}

