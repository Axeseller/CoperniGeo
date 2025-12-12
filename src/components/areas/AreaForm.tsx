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
      // Normalize coordinates to ensure they're in { lat, lng } format
      const normalizedCoordinates = areaCoordinates.map((coord: any) => {
        // If it's already { lat, lng }, use it directly
        if (coord.lat !== undefined && coord.lng !== undefined) {
          return { lat: Number(coord.lat), lng: Number(coord.lng) };
        }
        // If it's GeoPoint or { latitude, longitude }, convert it
        if (coord.latitude !== undefined && coord.longitude !== undefined) {
          return { lat: Number(coord.latitude), lng: Number(coord.longitude) };
        }
        // If it's an array [lng, lat], convert it
        if (Array.isArray(coord) && coord.length >= 2) {
          return { lat: Number(coord[1]), lng: Number(coord[0]) };
        }
        throw new Error(`Formato de coordenada inválido: ${JSON.stringify(coord)}`);
      });

      console.log("Submitting area with normalized coordinates:", {
        name: name.trim(),
        coordinatesCount: normalizedCoordinates.length,
        firstCoord: normalizedCoordinates[0],
      });

      await onSubmit({
        name: name.trim(),
        coordinates: normalizedCoordinates,
      });
      
      // Reset form and close after successful save
      setName("");
      setError("");
      onCancel();
    } catch (err: any) {
      console.error("Error in AreaForm submit:", err);
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
        <label htmlFor="name" className="block text-sm font-medium text-[#242424] mb-1">
          Nombre del área *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#5db815] focus:border-[#5db815] bg-gray-50 text-[#242424] placeholder-gray-400"
          placeholder="Ej: Campo Norte"
          required
        />
      </div>

      <div className="flex space-x-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-[#5db815] text-white px-4 py-2 rounded-lg hover:bg-[#4a9a11] disabled:opacity-50 transition-colors"
        >
          {loading ? "Guardando..." : initialData ? "Actualizar" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-200 text-[#121212] px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

