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
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md space-y-4 border border-gray-200">
      <h3 className="text-lg font-semibold text-[#242424]">Controles</h3>

      <div>
        <label className="block text-sm font-medium text-[#242424] mb-1">
          Área
        </label>
        <select
          value={selectedAreaId || ""}
          onChange={(e) => onAreaSelect(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#5db815] focus:border-[#5db815] bg-gray-50 text-[#242424]"
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
        <label className="block text-sm font-medium text-[#242424] mb-1">
          Índice
        </label>
        <select
          value={indexType}
          onChange={(e) => setIndexType(e.target.value as IndexType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#5db815] focus:border-[#5db815] bg-gray-50 text-[#242424]"
        >
          <option value="NDVI">NDVI</option>
          <option value="NDRE">NDRE</option>
          <option value="EVI">EVI</option>
          <option value="NDWI">NDWI</option>
          <option value="MSAVI">MSAVI</option>
          <option value="PSRI">PSRI</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#242424] mb-1">
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

      <button
        onClick={handleLoadImage}
        disabled={loading || (!selectedAreaId && (!drawnCoordinates || drawnCoordinates.length < 3))}
        className="w-full bg-[#5db815] text-white px-4 py-2 rounded-lg hover:bg-[#4a9a11] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Cargando..." : "Cargar Imagen Más Reciente"}
      </button>
      
      {!selectedAreaId && drawnCoordinates && drawnCoordinates.length >= 3 && (
        <p className="text-xs text-[#898989] text-center">
          Usando polígono dibujado ({drawnCoordinates.length} puntos)
        </p>
      )}
      <p className="text-xs text-[#898989] text-center mt-2">
        Se cargará la imagen más reciente disponible
      </p>
    </div>
  );
}

