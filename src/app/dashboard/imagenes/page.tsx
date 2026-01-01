"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserAreas, deleteArea, createArea } from "@/lib/firestore/areas";
import InteractiveMap from "@/components/map/InteractiveMap";
import AreaForm from "@/components/areas/AreaForm";
import PlanRequired from "@/components/PlanRequired";
import Card from "@/components/ui/Card";
import { Area } from "@/types/area";
import { IndexType } from "@/types/report";
import { SatelliteImageResponse } from "@/types/satellite";
import { formatArea } from "@/lib/utils/geometry";

export default function ImagenesPage() {
  const { user } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedImageData, setSelectedImageData] = useState<SatelliteImageResponse | null>(null);
  const [selectedIndexType, setSelectedIndexType] = useState<IndexType>("NDVI");
  const [loading, setLoading] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [showIndexPanel, setShowIndexPanel] = useState(false);
  const [showCreateArea, setShowCreateArea] = useState(false);
  const [drawnCoordinates, setDrawnCoordinates] = useState<{ lat: number; lng: number }[] | null>(null);

  const loadAreas = useCallback(async () => {
    if (!user) {
      setAreas([]);
      setLoadingAreas(false);
      return;
    }
    
    try {
      setLoadingAreas(true);
      const userAreas = await getUserAreas(user.uid);
      setAreas(userAreas);
    } catch (error) {
      console.error("Error loading areas:", error);
      setAreas([]);
    } finally {
      setLoadingAreas(false);
    }
  }, [user]);

  useEffect(() => {
    loadAreas();
  }, [loadAreas]);

  const selectedArea = selectedAreaId ? areas.find(a => a.id === selectedAreaId) : null;

  const handleViewAnalysis = async (areaId: string) => {
    setSelectedAreaId(areaId);
    setShowMap(false);
    setSelectedImageData(null);
    
    // Auto-load NDVI analysis when viewing
    const area = areas.find(a => a.id === areaId);
    if (!area || !area.coordinates || area.coordinates.length < 3) return;

    const coordinates = area.coordinates.map((coord: any) => ({
      lat: coord.latitude || coord.lat,
      lng: coord.longitude || coord.lng,
    }));

    await loadAnalysis(areaId, coordinates, "NDVI");
  };

  const loadAnalysis = async (areaId: string, coordinates: { lat: number; lng: number }[], indexType: IndexType) => {
    setLoading(true);
    try {
      const response = await fetch("/api/satellite/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates,
          indexType,
          cloudCoverage: 20,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Error al procesar la imagen (${response.status})`);
      }

      setSelectedImageData(responseData);
      setSelectedIndexType(indexType);
    } catch (error: any) {
      console.error("Error loading image:", error);
      alert(error.message || "Error al cargar la imagen satelital.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    setSelectedAreaId(null);
    setSelectedImageData(null);
    setShowMap(false);
    setShowIndexPanel(false);
  };

  const handleDeleteArea = async (areaId: string, areaName: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${areaName}"?`)) {
      return;
    }
    try {
      await deleteArea(areaId);
      await loadAreas();
      if (selectedAreaId === areaId) {
        handleBackToList();
      }
    } catch (error: any) {
      console.error("Error deleting area:", error);
      alert(`Error al eliminar el área: ${error.message}`);
    }
  };

  const handlePolygonComplete = (coordinates: { lat: number; lng: number }[]) => {
    setDrawnCoordinates(coordinates);
  };

  const handleCoordinatesClear = () => {
    setDrawnCoordinates(null);
  };

  const handleCreateArea = async (area: Omit<Area, "id" | "userId" | "createdAt" | "updatedAt">) => {
    if (!user) {
      throw new Error("Debes iniciar sesión para guardar áreas");
    }
    await createArea({ ...area, userId: user.uid });
    await loadAreas();
    setShowCreateArea(false);
    setDrawnCoordinates(null);
  };

  const getIndexInterpretation = (indexType: IndexType, meanValue: number): string => {
    if (indexType === "NDVI") {
      if (meanValue > 0.6) return "Vegetación muy saludable";
      if (meanValue > 0.3) return "Vegetación moderadamente saludable";
      return "Vegetación con estrés o baja cobertura";
    }
    if (indexType === "NDRE") {
      if (meanValue > 0.3) return "Contenido de clorofila alto";
      if (meanValue > 0.15) return "Contenido de clorofila moderado";
      return "Contenido de clorofila bajo";
    }
    if (indexType === "EVI") {
      if (meanValue > 0.5) return "Biomasa y productividad altas";
      if (meanValue > 0.2) return "Biomasa y productividad moderadas";
      return "Biomasa y productividad bajas";
    }
    return "";
  };

  const getIndexExplanation = (indexType: IndexType): string => {
    if (indexType === "NDVI") {
      return "NDVI es ideal para evaluar la salud general y cobertura vegetal.";
    }
    if (indexType === "NDRE") {
      return "NDRE es mejor para evaluar el contenido de clorofila y nutrición.";
    }
    if (indexType === "EVI") {
      return "EVI es más sensible a variaciones en áreas con alta biomasa.";
    }
    return "";
  };

  // Default view: Area list
  if (!selectedAreaId) {
    return (
      <PlanRequired>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[#242424] mb-2">
              ¿Cómo está mi parcela hoy?
            </h1>
            <p className="text-[#898989]">
              Selecciona una parcela para ver su análisis de salud
            </p>
          </div>

          {loadingAreas ? (
            <Card>
              <div className="text-center py-8">
                <p className="text-[#898989]">Cargando parcelas...</p>
              </div>
            </Card>
          ) : (
            <>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowCreateArea(true)}
                  className="bg-[#5db815] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#4a9a11] transition-colors"
                >
                  Crear parcela
                </button>
              </div>
              {showCreateArea && (
                <Card>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-[#242424]">Crear nueva parcela</h3>
                    <button
                      onClick={() => {
                        setShowCreateArea(false);
                        setDrawnCoordinates(null);
                      }}
                      className="text-[#898989] hover:text-[#242424]"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="mb-4">
                    <InteractiveMap
                      onPolygonComplete={handlePolygonComplete}
                      areas={areas}
                      selectedAreaId={selectedAreaId || undefined}
                      imageDataList={[]}
                    />
                  </div>
                  <AreaForm
                    onSubmit={handleCreateArea}
                    onCancel={() => {
                      setShowCreateArea(false);
                      setDrawnCoordinates(null);
                    }}
                    coordinates={drawnCoordinates || undefined}
                  />
                </Card>
              )}
              {areas.length === 0 ? (
                <Card>
                  <div className="text-center py-8">
                    <p className="text-[#898989] mb-4">No tienes parcelas guardadas</p>
                    <button
                      onClick={() => setShowCreateArea(true)}
                      className="bg-[#5db815] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#4a9a11] transition-colors"
                    >
                      Crear tu primera parcela
                    </button>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {areas.map((area) => {
                    const normalizedCoords = area.coordinates?.map((coord: any) => ({
                      lat: coord.latitude || coord.lat,
                      lng: coord.longitude || coord.lng,
                    })) || [];
                    const areaCalculation = normalizedCoords.length >= 3 ? formatArea(normalizedCoords) : null;
                    const lastAnalyzed = area.updatedAt || area.createdAt;
                    
                    return (
                      <Card
                        key={area.id}
                        variant="interactive"
                        onClick={() => handleViewAnalysis(area.id!)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-[#242424] mb-2">
                              {area.name}
                            </h3>
                            <div className="space-y-1 text-sm text-[#898989]">
                              {lastAnalyzed ? (
                                <p>
                                  Último análisis: {new Date(lastAnalyzed).toLocaleDateString("es-MX")}
                                </p>
                              ) : (
                                <p className="text-yellow-600">No analizado</p>
                              )}
                              {areaCalculation && (
                                <p>
                                  Tamaño: {areaCalculation.km2} km² ({areaCalculation.hectares} ha)
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewAnalysis(area.id!);
                              }}
                              className="bg-[#5db815] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#4a9a11] transition-colors"
                            >
                              Ver análisis
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (area.id) {
                                  handleDeleteArea(area.id, area.name);
                                }
                              }}
                              className="text-red-600 hover:text-red-700 p-2"
                              title="Eliminar parcela"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </PlanRequired>
    );
  }

  // Detail view: Progressive disclosure
  const coordinates = selectedArea?.coordinates?.map((coord: any) => ({
    lat: coord.latitude || coord.lat,
    lng: coord.longitude || coord.lng,
  })) || [];

  return (
    <PlanRequired>
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={handleBackToList}
          className="flex items-center space-x-2 text-[#898989] hover:text-[#242424] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Volver a la lista</span>
        </button>

        {/* Summary Card: Single index value, plain-language interpretation */}
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-[#242424] mb-1">
                {selectedArea?.name}
              </h2>
              {selectedImageData ? (
                <>
                  <div className="mt-4">
                    <div className="flex items-baseline space-x-3 mb-3">
                      <span className="text-3xl font-bold text-[#5db815]">
                        {selectedImageData.meanValue.toFixed(3)}
                      </span>
                      <span className="text-lg text-[#898989]">
                        {selectedImageData.indexType}
                      </span>
                    </div>
                    <p className="text-lg font-medium text-[#242424] mb-2">
                      {getIndexInterpretation(selectedImageData.indexType, selectedImageData.meanValue)}
                    </p>
                    <p className="text-sm text-[#898989]">
                      {getIndexExplanation(selectedImageData.indexType)}
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-[#898989]">
                    <p>
                      Fecha de imagen: {new Date(selectedImageData.date).toLocaleDateString("es-MX")}
                    </p>
                    <p>
                      Rango: {selectedImageData.minValue.toFixed(3)} - {selectedImageData.maxValue.toFixed(3)}
                    </p>
                  </div>
                </>
              ) : loading ? (
                <div className="py-8 text-center">
                  <p className="text-[#898989]">Cargando análisis...</p>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-[#898989] mb-4">No hay análisis disponible</p>
                  <button
                    onClick={() => coordinates.length >= 3 && loadAnalysis(selectedAreaId, coordinates, selectedIndexType)}
                    className="bg-[#5db815] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#4a9a11] transition-colors"
                  >
                    Generar análisis
                  </button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Map Card: Collapsed by default */}
        <Card>
          <button
            onClick={() => setShowMap(!showMap)}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="font-medium text-[#242424]">Ver mapa</span>
            <svg
              className={`w-5 h-5 text-[#898989] transition-transform ${showMap ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showMap && (
            <div className="mt-4">
              <InteractiveMap
                areas={areas}
                selectedAreaId={selectedAreaId || undefined}
                imageDataList={selectedImageData ? [selectedImageData] : []}
                disableDrawing={true}
              />
            </div>
          )}
        </Card>

        {/* Index Switch: Side panel (shown as button to open panel) */}
        {selectedImageData && (
          <Card>
            <button
              onClick={() => setShowIndexPanel(!showIndexPanel)}
              className="w-full flex items-center justify-between text-left mb-4"
            >
              <span className="font-medium text-[#242424]">Cambiar índice</span>
              <svg
                className={`w-5 h-5 text-[#898989] transition-transform ${showIndexPanel ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showIndexPanel && coordinates.length >= 3 && (
              <div className="space-y-2">
                {(["NDVI", "NDRE", "EVI"] as IndexType[]).map((indexType) => (
                  <button
                    key={indexType}
                    onClick={() => {
                      setSelectedIndexType(indexType);
                      loadAnalysis(selectedAreaId!, coordinates, indexType);
                      setShowIndexPanel(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      selectedIndexType === indexType
                        ? "border-[#5db815] bg-[#5db815]/10 text-[#5db815] font-medium"
                        : "border-gray-200 hover:border-gray-300 text-[#242424]"
                    }`}
                  >
                    <div className="font-medium">{indexType}</div>
                    <div className="text-sm text-[#898989] mt-1">
                      {indexType === "NDVI" && "Ideal para salud general y cobertura vegetal"}
                      {indexType === "NDRE" && "Mejor para contenido de clorofila y nutrición"}
                      {indexType === "EVI" && "Más sensible en áreas con alta biomasa"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </PlanRequired>
  );
}
