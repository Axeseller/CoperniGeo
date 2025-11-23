"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { GoogleMap, useJsApiLoader, DrawingManager, Polygon } from "@react-google-maps/api";
import { Area } from "@/types/area";

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
  tileUrl?: string;
  indexType?: string;
  minValue?: number;
  maxValue?: number;
}

export default function InteractiveMap({
  onPolygonComplete,
  areas = [],
  selectedAreaId,
  onAreaSelect,
  tileUrl,
  indexType,
  minValue,
  maxValue,
}: InteractiveMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [drawnPolygon, setDrawnPolygon] = useState<{ lat: number; lng: number }[] | null>(null);
  const [showSatelliteLayer, setShowSatelliteLayer] = useState(false);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const overlayRef = useRef<google.maps.ImageMapType | null>(null);

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

  // Add/remove satellite tile overlay
  useEffect(() => {
    if (!map || !tileUrl) return;

    // Remove existing overlay
    if (overlayRef.current) {
      try {
        const index = map.overlayMapTypes.getLength() - 1;
        if (index >= 0) {
          map.overlayMapTypes.removeAt(index);
        }
      } catch (e) {
        // Ignore if already removed
      }
      overlayRef.current = null;
    }

    if (showSatelliteLayer && tileUrl) {
      const overlay = new google.maps.ImageMapType({
        getTileUrl: (coord, zoom) => {
          if (coord.x < 0 || coord.y < 0) return "";
          const maxCoord = 1 << zoom;
          if (coord.x >= maxCoord || coord.y >= maxCoord) return "";
          
          // Earth Engine tile URL format uses {x}, {y}, {z} or uses base URL with query params
          // Handle both formats
          let url = tileUrl;
          if (url.includes("{x}") || url.includes("{y}") || url.includes("{z}")) {
            url = url
              .replace(/{x}/g, coord.x.toString())
              .replace(/{y}/g, coord.y.toString())
              .replace(/{z}/g, zoom.toString());
          } else {
            // If format doesn't have placeholders, assume it's a base URL and append coordinates
            // This is for Earth Engine's tile_fetcher format which may have a different structure
            url = `${tileUrl}&x=${coord.x}&y=${coord.y}&z=${zoom}`;
          }
          
          return url;
        },
        tileSize: new google.maps.Size(256, 256),
        maxZoom: 18,
        minZoom: 0,
        name: indexType || "Satellite Index",
        opacity: 0.7, // Semi-transparent so base map shows through
      });

      map.overlayMapTypes.push(overlay);
      overlayRef.current = overlay;
    }

    return () => {
      if (overlayRef.current && map) {
        try {
          const index = map.overlayMapTypes.getLength() - 1;
          if (index >= 0) {
            map.overlayMapTypes.removeAt(index);
          }
        } catch (e) {
          // Ignore if already removed
        }
        overlayRef.current = null;
      }
    };
  }, [map, tileUrl, showSatelliteLayer, indexType]);

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

      <div className="absolute top-4 right-4 flex flex-col gap-2">
        {tileUrl && (
          <button
            onClick={() => setShowSatelliteLayer(!showSatelliteLayer)}
            className={`px-4 py-2 rounded text-sm font-medium ${
              showSatelliteLayer
                ? "bg-green-600 text-white"
                : "bg-white text-gray-700 border border-gray-300"
            } hover:bg-green-700 transition-colors`}
          >
            {showSatelliteLayer ? "Ocultar Índice" : "Mostrar Índice"}
          </button>
        )}
        {drawnPolygon && (
          <button
            onClick={clearDrawing}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
          >
            Limpiar dibujo
          </button>
        )}
      </div>

      {/* Color Legend */}
      {showSatelliteLayer && tileUrl && indexType && (
        <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg border border-gray-200 max-w-xs">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">{indexType}</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div
                className={`h-4 rounded flex-1 ${
                  indexType === "NDVI" || indexType === "NDRE"
                    ? "bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                    : "bg-gradient-to-r from-blue-500 via-cyan-500 via-yellow-500 via-orange-500 to-red-500"
                }`}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>{minValue !== undefined ? minValue.toFixed(3) : "Bajo"}</span>
              <span>{maxValue !== undefined ? maxValue.toFixed(3) : "Alto"}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {indexType === "NDVI" || indexType === "NDRE" ? (
                <span>
                  <span className="text-red-600">Rojo</span> = Bajo |{" "}
                  <span className="text-yellow-600">Amarillo</span> = Medio |{" "}
                  <span className="text-green-600">Verde</span> = Alto
                </span>
              ) : (
                <span>
                  <span className="text-blue-600">Azul</span> = Bajo |{" "}
                  <span className="text-cyan-600">Cian</span>/<span className="text-yellow-600">Amarillo</span>/
                  <span className="text-orange-600">Naranja</span> = Medio |{" "}
                  <span className="text-red-600">Rojo</span> = Alto
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

