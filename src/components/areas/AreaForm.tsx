"use client";

import { useState } from "react";
import { Area } from "@/types/area";

interface AreaFormProps {
  onSubmit: (area: Omit<Area, "id" | "userId" | "createdAt" | "updatedAt">) => Promise<void>;
  onCancel: () => void;
  initialData?: Area;
  coordinates?: { lat: number; lng: number }[];
}

export default function AreaForm({
  onSubmit,
  onCancel,
  initialData,
  coordinates,
}: AreaFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("El nombre es requerido");
      return;
    }

    if (!initialData && !coordinates) {
      setError("Por favor dibuja un polígono en el mapa");
      return;
    }

    const areaCoordinates = coordinates || initialData?.coordinates || [];

    if (areaCoordinates.length < 3) {
      setError("Se requieren al menos 3 puntos para un polígono");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        coordinates: areaCoordinates.map((coord: any) => ({
          lat: coord.latitude || coord.lat,
          lng: coord.longitude || coord.lng,
        })),
      });
    } catch (err: any) {
      setError(err.message || "Error al guardar el área");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre del área *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
          placeholder="Ej: Campo Norte"
          required
        />
      </div>

      <div className="flex space-x-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Guardando..." : initialData ? "Actualizar" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

