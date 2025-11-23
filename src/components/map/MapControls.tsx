"use client";

import { useState } from "react";
import { IndexType } from "@/types/report";
import { Area } from "@/types/area";

interface MapControlsProps {
  onLoadImage: (params: {
    areaId?: string;
    coordinates?: { lat: number; lng: number }[];
    indexType: IndexType;
    cloudCoverage: number;
    startDate: string;
    endDate: string;
  }) => void;
  areas: Area[];
  selectedAreaId?: string;
  onAreaSelect: (areaId: string) => void;
  loading?: boolean;
  drawnCoordinates?: { lat: number; lng: number }[];
}

export default function MapControls({
  onLoadImage,
  areas,
  selectedAreaId,
  onAreaSelect,
  loading = false,
  drawnCoordinates,
}: MapControlsProps) {
  const [indexType, setIndexType] = useState<IndexType>("NDVI");
  const [cloudCoverage, setCloudCoverage] = useState(20);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const handleLoadImage = () => {
    // Use drawn coordinates if available, otherwise use selected area
    const coordinates = drawnCoordinates && drawnCoordinates.length >= 3
      ? drawnCoordinates
      : (() => {
          const selectedArea = areas.find((a) => a.id === selectedAreaId);
          return selectedArea?.coordinates
            ? selectedArea.coordinates.map((coord: any) => ({
                lat: coord.latitude || coord.lat,
                lng: coord.longitude || coord.lng,
              }))
            : undefined;
        })();

    if (!coordinates || coordinates.length < 3) {
      alert("Por favor selecciona un área o dibuja un polígono en el mapa");
      return;
    }

    onLoadImage({
      areaId: selectedAreaId || undefined,
      coordinates,
      indexType,
      cloudCoverage,
      startDate,
      endDate,
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Controles</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Área
        </label>
        <select
          value={selectedAreaId || ""}
          onChange={(e) => onAreaSelect(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
        >
          <option value="">Selecciona un área</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Índice
        </label>
        <select
          value={indexType}
          onChange={(e) => setIndexType(e.target.value as IndexType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
        >
          <option value="NDVI">NDVI</option>
          <option value="NDRE">NDRE</option>
          <option value="EVI">EVI</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cobertura de nubes: {cloudCoverage}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={cloudCoverage}
          onChange={(e) => setCloudCoverage(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fecha inicio
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fecha fin
        </label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
        />
      </div>

      <button
        onClick={handleLoadImage}
        disabled={loading || (!selectedAreaId && (!drawnCoordinates || drawnCoordinates.length < 3))}
        className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Cargando..." : "Cargar Imagen"}
      </button>
      
      {!selectedAreaId && drawnCoordinates && drawnCoordinates.length >= 3 && (
        <p className="text-xs text-gray-500 text-center">
          Usando polígono dibujado ({drawnCoordinates.length} puntos)
        </p>
      )}
    </div>
  );
}

