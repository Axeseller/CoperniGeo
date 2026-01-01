"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { GoogleMap, useJsApiLoader, DrawingManager, Polygon } from "@react-google-maps/api";
import { Area } from "@/types/area";
import { SatelliteImageResponse } from "@/types/satellite";

const libraries: ("drawing" | "places")[] = ["drawing"];

const mapContainerStyle = {
  width: "100%",
  height: "600px",
};

const defaultCenter = {
  lat: 20.6597, // Mexico center
  lng: -103.3496,
};

interface InteractiveMapProps {
  onPolygonComplete?: (coordinates: { lat: number; lng: number }[]) => void;
  areas?: Area[];
  selectedAreaId?: string;
  onAreaSelect?: (areaId: string) => void;
  imageDataList?: SatelliteImageResponse[];
  disableDrawing?: boolean;
}

export default function InteractiveMap({
  onPolygonComplete,
  areas = [],
  selectedAreaId,
  onAreaSelect,
  imageDataList = [],
  disableDrawing = false,
}: InteractiveMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [drawnPolygon, setDrawnPolygon] = useState<{ lat: number; lng: number }[] | null>(null);
  const [visibleIndices, setVisibleIndices] = useState<Set<string>>(new Set());
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const overlaysRef = useRef<Map<string, google.maps.ImageMapType>>(new Map());

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onMapUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const onDrawingManagerLoad = useCallback((drawingManager: google.maps.drawing.DrawingManager) => {
    drawingManagerRef.current = drawingManager;
  }, []);

  const onPolygonCompleteCallback = useCallback(
    (polygon: google.maps.Polygon) => {
      const paths = polygon.getPath();
      const coordinates: { lat: number; lng: number }[] = [];

      paths.forEach((latLng) => {
        coordinates.push({
          lat: latLng.lat(),
          lng: latLng.lng(),
        });
      });

      setDrawnPolygon(coordinates);
      if (onPolygonComplete) {
        onPolygonComplete(coordinates);
      }

      // Clear the drawing after capturing coordinates
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setDrawingMode(null);
      }
    },
    [onPolygonComplete]
  );

  const clearDrawing = useCallback(() => {
    setDrawnPolygon(null);
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(null);
    }
  }, []);

  // Toggle visibility of an index
  const toggleIndexVisibility = (indexType: string) => {
    setVisibleIndices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(indexType)) {
        newSet.delete(indexType);
      } else {
        newSet.add(indexType);
      }
      return newSet;
    });
  };

  // Manage satellite tile overlays
  useEffect(() => {
    if (!map) return;

    // Remove all existing overlays
    while (map.overlayMapTypes.getLength() > 0) {
      map.overlayMapTypes.removeAt(0);
    }
    overlaysRef.current.clear();

    // Add overlays for visible indices
    imageDataList.forEach((imageData) => {
      if (visibleIndices.has(imageData.indexType) && imageData.tileUrl) {
        const overlay = new google.maps.ImageMapType({
          getTileUrl: (coord, zoom) => {
            if (!imageData.tileUrl || coord.x < 0 || coord.y < 0) return "";
            const maxCoord = 1 << zoom;
            if (coord.x >= maxCoord || coord.y >= maxCoord) return "";
            
            // Earth Engine tile URL format uses {x}, {y}, {z} or uses base URL with query params
            let url = imageData.tileUrl;
            if (url.includes("{x}") || url.includes("{y}") || url.includes("{z}")) {
              url = url
                .replace(/{x}/g, coord.x.toString())
                .replace(/{y}/g, coord.y.toString())
                .replace(/{z}/g, zoom.toString());
            } else {
              url = `${imageData.tileUrl}&x=${coord.x}&y=${coord.y}&z=${zoom}`;
            }
            
            return url;
          },
          tileSize: new google.maps.Size(256, 256),
          maxZoom: 18,
          minZoom: 0,
          name: imageData.indexType,
          opacity: 0.7,
        });

        map.overlayMapTypes.push(overlay);
        overlaysRef.current.set(imageData.indexType, overlay);
      }
    });

    return () => {
      // Cleanup on unmount
      const currentOverlays = overlaysRef.current;
      if (map) {
        while (map.overlayMapTypes.getLength() > 0) {
          map.overlayMapTypes.removeAt(0);
        }
      }
      currentOverlays.clear();
    };
  }, [map, imageDataList, visibleIndices]);

  useEffect(() => {
    if (map && selectedAreaId && areas.length > 0) {
      const selectedArea = areas.find((a) => a.id === selectedAreaId);
      if (selectedArea && selectedArea.coordinates) {
        const bounds = new google.maps.LatLngBounds();
        const coords = selectedArea.coordinates.map((coord: any) => {
          const lat = coord.latitude || coord.lat;
          const lng = coord.longitude || coord.lng;
          const latLng = new google.maps.LatLng(lat, lng);
          bounds.extend(latLng);
          return latLng;
        });
        map.fitBounds(bounds);
      }
    }
  }, [map, selectedAreaId, areas]);

  if (loadError) {
    return <div>Error loading maps</div>;
  }

  if (!isLoaded) {
    return <div>Loading maps...</div>;
  }

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={6}
        center={defaultCenter}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
        options={{
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      >
        {!disableDrawing && (
        <DrawingManager
          onLoad={onDrawingManagerLoad}
          onPolygonComplete={onPolygonCompleteCallback}
          options={{
            drawingControl: true,
            drawingControlOptions: {
              position: google.maps.ControlPosition.TOP_CENTER,
              drawingModes: [google.maps.drawing.OverlayType.POLYGON],
            },
            polygonOptions: {
              fillColor: "#16a34a",
              fillOpacity: 0.2,
              strokeWeight: 2,
              strokeColor: "#16a34a",
              clickable: false,
              editable: true,
              zIndex: 1,
            },
          }}
        />
        )}

        {/* Render existing areas */}
        {areas.map((area) => {
          if (!area.coordinates || area.coordinates.length === 0) return null;

          const isSelected = area.id === selectedAreaId;
          const coords = area.coordinates.map((coord: any) => ({
            lat: coord.latitude || coord.lat,
            lng: coord.longitude || coord.lng,
          }));

          return (
            <Polygon
              key={area.id}
              paths={coords}
              options={{
                fillColor: isSelected ? "#16a34a" : "#3b82f6",
                fillOpacity: 0.2,
                strokeWeight: isSelected ? 3 : 2,
                strokeColor: isSelected ? "#16a34a" : "#3b82f6",
                clickable: true,
                editable: false,
                zIndex: isSelected ? 2 : 1,
              }}
              onClick={() => {
                if (onAreaSelect && area.id) {
                  onAreaSelect(area.id);
                }
              }}
            />
          );
        })}

        {/* Render drawn polygon */}
        {drawnPolygon && (
          <Polygon
            paths={drawnPolygon}
            options={{
              fillColor: "#16a34a",
              fillOpacity: 0.3,
              strokeWeight: 3,
              strokeColor: "#16a34a",
              clickable: false,
              editable: true,
              zIndex: 3,
            }}
          />
        )}
      </GoogleMap>

      <div className="absolute top-16 right-4 flex flex-col gap-2">
        {imageDataList.map((imageData) => {
          const isVisible = visibleIndices.has(imageData.indexType);
          return (
            <button
              key={imageData.indexType}
              onClick={() => toggleIndexVisibility(imageData.indexType)}
              className={`px-4 py-2 rounded text-sm font-medium shadow-lg ${
                isVisible
                  ? "bg-[#5db815] text-white"
                  : "bg-white text-[#242424] border border-gray-300"
              } hover:bg-[#4a9a11] hover:text-white transition-colors`}
            >
              {isVisible ? `Ocultar ${imageData.indexType}` : `Mostrar ${imageData.indexType}`}
            </button>
          );
        })}
        {drawnPolygon && (
          <button
            onClick={clearDrawing}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm shadow-lg"
          >
            Limpiar dibujo
          </button>
        )}
      </div>

      {/* Color Legend */}
      {visibleIndices.size > 0 && (
        <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg border border-gray-200 max-w-xs">
          <h4 className="text-sm font-semibold text-[#242424] mb-2">
            {visibleIndices.size === 1 ? "Índice Visible" : "Índices Visibles"}
          </h4>
          <div className="space-y-3">
            {imageDataList
              .filter((imageData) => visibleIndices.has(imageData.indexType))
              .map((imageData) => (
                <div key={imageData.indexType} className="border-b border-gray-200 last:border-b-0 pb-2 last:pb-0">
                  <p className="text-xs font-semibold text-[#242424] mb-1">{imageData.indexType}</p>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`h-3 rounded flex-1 ${
                        imageData.indexType === "NDVI" || imageData.indexType === "NDRE"
                          ? "bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                          : "bg-gradient-to-r from-blue-500 via-cyan-500 via-yellow-500 via-orange-500 to-red-500"
                      }`}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-[#898989] mt-1">
                    <span>{imageData.minValue.toFixed(3)}</span>
                    <span>{imageData.maxValue.toFixed(3)}</span>
                  </div>
                </div>
              ))}
            <p className="text-xs text-[#898989] mt-2 pt-2 border-t border-gray-200">
              <span className="text-red-600">Rojo</span> = Bajo |{" "}
              <span className="text-yellow-600">Amarillo</span> = Medio |{" "}
              <span className="text-[#5db815]">Verde</span> = Alto
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

