"use client";

import { useState, useRef, useCallback, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { GoogleMap, useJsApiLoader, DrawingManager, Polygon } from "@react-google-maps/api";
import { createLead, updateLeadWithGeometry, updateLeadStatus, hasCompletedCTA } from "@/lib/firestore/leads";
import { LeadFormData } from "@/types/lead";

const libraries: ("drawing" | "places")[] = ["drawing"];

// Country coordinates for centering the map
const countryCoordinates: Record<string, { lat: number; lng: number; zoom: number }> = {
  "mexico": { lat: 23.6345, lng: -102.5528, zoom: 5 },
  "argentina": { lat: -38.4161, lng: -63.6167, zoom: 4 },
  "brazil": { lat: -14.2350, lng: -51.9253, zoom: 4 },
  "colombia": { lat: 4.5709, lng: -74.2973, zoom: 5 },
  "chile": { lat: -35.6751, lng: -71.5430, zoom: 5 },
  "peru": { lat: -9.1900, lng: -75.0152, zoom: 5 },
  "ecuador": { lat: -1.8312, lng: -78.1834, zoom: 6 },
  "guatemala": { lat: 15.7835, lng: -90.2308, zoom: 6 },
  "honduras": { lat: 15.2000, lng: -86.2419, zoom: 7 },
  "nicaragua": { lat: 12.2650, lng: -85.2072, zoom: 7 },
  "costa-rica": { lat: 9.7489, lng: -83.7534, zoom: 7 },
  "panama": { lat: 8.5380, lng: -80.7821, zoom: 7 },
  "united-states": { lat: 37.0902, lng: -95.7129, zoom: 4 },
  "spain": { lat: 40.4637, lng: -3.7492, zoom: 5 },
  "other": { lat: 20.6597, lng: -103.3496, zoom: 3 },
};

type Step = "form" | "map" | "confirmation" | "already-completed";

function FreeReportPageContent() {
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email");
  
  const [step, setStep] = useState<Step>("form");
  const [formData, setFormData] = useState<LeadFormData>({
    email: emailFromQuery || "",
    farmName: "",
    country: "",
  });
  const [leadId, setLeadId] = useState<string | null>(null);
  const [drawnPolygon, setDrawnPolygon] = useState<{ lat: number; lng: number }[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);

  // Find existing lead if email was provided from homepage
  useEffect(() => {
    if (emailFromQuery) {
      const findExistingLead = async () => {
        try {
          const response = await fetch('/api/leads/find-by-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: emailFromQuery }),
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.leadId) {
              setLeadId(data.leadId);
            }
          }
        } catch (err) {
          console.error("Error finding existing lead:", err);
        }
      };
      
      findExistingLead();
    }
  }, [emailFromQuery]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.country) {
      setError("Por favor completa todos los campos requeridos");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Por favor ingresa un email válido");
      return;
    }

    setIsSubmitting(true);
    setCheckingEmail(true);
    try {
      // Check if user has already completed the CTA flow
      const alreadyCompleted = await hasCompletedCTA(formData.email);
      
      if (alreadyCompleted) {
        setStep("already-completed");
        setIsSubmitting(false);
        setCheckingEmail(false);
        return;
      }

      // If we already have a leadId (from homepage CTA), update it
      // Otherwise, create a new lead
      if (leadId) {
        // Update existing lead with country and farmName
        // Note: Firestore rules don't allow updating country, so we'll create a new one
        // Actually, let's just use the existing leadId and proceed to map
        setStep("map");
      } else {
        // Check if a lead exists with this email
        try {
          const findResponse = await fetch('/api/leads/find-by-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: formData.email }),
          });
          
          if (findResponse.ok) {
            const findData = await findResponse.json();
            if (findData.leadId) {
              setLeadId(findData.leadId);
              setStep("map");
            } else {
              // Create new lead
              const id = await createLead(formData);
              setLeadId(id);
              setStep("map");
            }
          } else {
            // Create new lead if find fails
            const id = await createLead(formData);
            setLeadId(id);
            setStep("map");
          }
        } catch (findErr) {
          // Create new lead if find fails
          const id = await createLead(formData);
          setLeadId(id);
          setStep("map");
        }
      }
    } catch (err: any) {
      setError(err.message || "Error al guardar tu información. Por favor intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
      setCheckingEmail(false);
    }
  };

  const handlePolygonComplete = useCallback((polygon: google.maps.Polygon) => {
    const paths = polygon.getPath();
    const coordinates: { lat: number; lng: number }[] = [];

    paths.forEach((latLng) => {
      coordinates.push({
        lat: latLng.lat(),
        lng: latLng.lng(),
      });
    });

    setDrawnPolygon(coordinates);
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(null);
    }
  }, []);

  const handleSubmitPolygon = async () => {
    if (!drawnPolygon || drawnPolygon.length < 3) {
      setError("Por favor dibuja un polígono válido en el mapa");
      return;
    }

    if (!leadId) {
      setError("Error: No se encontró la información del lead");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Convert coordinates to GeoJSON Polygon format
      const geoJsonPolygon: GeoJSON.Polygon = {
        type: "Polygon",
        coordinates: [
          drawnPolygon.map(coord => [coord.lng, coord.lat])
        ],
      };

      await updateLeadWithGeometry(leadId, geoJsonPolygon, 'snapshot_requested');
      
      // Trigger report generation and email sending (async, don't wait)
      fetch(`/api/leads/${leadId}/send-report`, {
        method: 'POST',
      }).catch((err) => {
        console.error("Error triggering report generation:", err);
        // Don't show error to user - report will be generated in background
      });
      
      setStep("confirmation");
    } catch (err: any) {
      setError(err.message || "Error al guardar tu campo. Por favor intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualMapping = async () => {
    if (!leadId) {
      setError("Error: No se encontró la información del lead");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await updateLeadStatus(leadId, 'needs_manual_mapping');
      setStep("confirmation");
    } catch (err: any) {
      setError(err.message || "Error al procesar tu solicitud. Por favor intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!leadId) {
      setError("Error: No se encontró la información del lead");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const text = await file.text();
      let geoJson: GeoJSON.Polygon | GeoJSON.MultiPolygon;

      // Try to parse as GeoJSON
      try {
        const parsed = JSON.parse(text);
        if (parsed.type === "FeatureCollection" && parsed.features?.[0]?.geometry) {
          geoJson = parsed.features[0].geometry;
        } else if (parsed.type === "Polygon" || parsed.type === "MultiPolygon") {
          geoJson = parsed;
        } else {
          throw new Error("Formato GeoJSON no válido");
        }
      } catch {
        // If not JSON, try to parse as KML (simplified - would need proper KML parser in production)
        throw new Error("Por favor sube un archivo GeoJSON válido. El soporte para KML estará disponible pronto.");
      }

      await updateLeadWithGeometry(leadId, geoJson, 'snapshot_requested');
      
      // Trigger report generation and email sending (async, don't wait)
      fetch(`/api/leads/${leadId}/send-report`, {
        method: 'POST',
      }).catch((err) => {
        console.error("Error triggering report generation:", err);
        // Don't show error to user - report will be generated in background
      });
      
      setStep("confirmation");
    } catch (err: any) {
      setError(err.message || "Error al procesar el archivo. Por favor verifica que sea un GeoJSON válido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDrawingManagerLoad = useCallback((drawingManager: google.maps.drawing.DrawingManager) => {
    drawingManagerRef.current = drawingManager;
  }, []);

  // Store initial center/zoom as a constant (set once, never changes)
  const initialMapCenterRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);
  const mapHasLoaded = useRef(false);
  
  useEffect(() => {
    if (step === "map" && !initialMapCenterRef.current) {
      const center = countryCoordinates[formData.country.toLowerCase().replace(/\s+/g, '-')] || countryCoordinates.other;
      initialMapCenterRef.current = center;
    }
    // Reset map loaded flag when step changes
    if (step !== "map") {
      mapHasLoaded.current = false;
    }
  }, [step, formData.country]);

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    if (mapHasLoaded.current) {
      // Map already loaded, don't reset position
      return;
    }
    setMap(mapInstance);
    mapHasLoaded.current = true;
    // Set initial center/zoom based on country (only once)
    if (initialMapCenterRef.current) {
      mapInstance.setCenter({ lat: initialMapCenterRef.current.lat, lng: initialMapCenterRef.current.lng });
      mapInstance.setZoom(initialMapCenterRef.current.zoom);
    }
  }, []);

  // Use constant default values (like dashboard) - defined as constants
  // These are only used for initial render, actual position is set in onLoad
  const defaultMapCenter = useMemo(() => ({ lat: 20.6597, lng: -103.3496 }), []);
  const defaultMapZoom = 5;

  return (
    <div className="min-h-screen bg-[#f4f3f4]">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#f4f3f4] border-b border-gray-300">
        <div className="max-w-7xl mx-auto">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center space-x-2">
                <Image
                  src="/logo2.svg"
                  alt="CoperniGeo Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
                <h1 className="text-xl md:text-2xl font-bold text-[#5db815] cursor-pointer">CoperniGeo</h1>
              </Link>
              <Link
                href="/"
                className="text-[#121212] hover:text-[#5db815] px-3 md:px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Volver
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {step === "form" && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h1 className="text-3xl md:text-4xl font-bold text-[#121212] mb-2 text-center">
                Obtén tu Reporte Satelital Gratis
              </h1>
              <p className="text-center text-[#898989] mb-8">
                Completa el formulario para comenzar
              </p>

              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#242424] mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5db815] focus:border-transparent outline-none transition-all text-[#121212] placeholder:text-gray-500"
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="farmName" className="block text-sm font-medium text-[#242424] mb-2">
                    Nombre de la Finca (opcional)
                  </label>
                  <input
                    type="text"
                    id="farmName"
                    name="farmName"
                    value={formData.farmName}
                    onChange={(e) => setFormData({ ...formData, farmName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5db815] focus:border-transparent outline-none transition-all text-[#121212] placeholder:text-gray-500"
                    placeholder="Mi Finca"
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-[#242424] mb-2">
                    País / Región *
                  </label>
                  <select
                    id="country"
                    name="country"
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5db815] focus:border-transparent outline-none transition-all text-[#121212] bg-white"
                  >
                    <option value="">Selecciona un país</option>
                    <option value="mexico">México</option>
                    <option value="argentina">Argentina</option>
                    <option value="brazil">Brasil</option>
                    <option value="colombia">Colombia</option>
                    <option value="chile">Chile</option>
                    <option value="peru">Perú</option>
                    <option value="ecuador">Ecuador</option>
                    <option value="guatemala">Guatemala</option>
                    <option value="honduras">Honduras</option>
                    <option value="nicaragua">Nicaragua</option>
                    <option value="costa-rica">Costa Rica</option>
                    <option value="panama">Panamá</option>
                    <option value="united-states">Estados Unidos</option>
                    <option value="spain">España</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || checkingEmail}
                  className="w-full bg-[#5db815] text-white px-6 py-3 rounded-md font-medium hover:bg-[#4a9a11] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkingEmail ? "Verificando..." : isSubmitting ? "Procesando..." : "Continuar"}
                </button>
              </form>
            </div>
          )}

          {step === "map" && isLoaded && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-[#121212] mb-4">
                  Selecciona tu Campo
                </h2>
                <p className="text-[#898989] mb-4">
                  Para generar tu reporte gratuito, selecciona tu campo en el mapa a continuación.
                </p>
                <p className="text-sm text-[#898989] mb-6">
                  <strong>¿Cómo dibujar un polígono?</strong> Haz clic en el botón de dibujar en el mapa y luego haz clic en el mapa para crear los puntos de tu campo. Haz doble clic o cierra el polígono para finalizar.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {loadError ? (
                  <div className="p-8 text-center text-red-600">
                    Error al cargar el mapa. Por favor recarga la página.
                  </div>
                ) : (
                  <div className="relative">
                    <GoogleMap
                      mapContainerStyle={{ width: "100%", height: "600px" }}
                      center={defaultMapCenter}
                      zoom={defaultMapZoom}
                      onLoad={onMapLoad}
                      options={{
                        mapTypeControl: true,
                        mapTypeControlOptions: {
                          position: google.maps.ControlPosition.LEFT_TOP,
                          mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.HYBRID],
                        },
                        streetViewControl: false,
                        fullscreenControl: true,
                        fullscreenControlOptions: {
                          position: google.maps.ControlPosition.RIGHT_TOP,
                        },
                      }}
                    >
                      <DrawingManager
                        onLoad={onDrawingManagerLoad}
                        onPolygonComplete={handlePolygonComplete}
                        options={{
                          drawingControl: true,
                          drawingControlOptions: {
                            position: google.maps.ControlPosition.TOP_CENTER,
                            drawingModes: [google.maps.drawing.OverlayType.POLYGON],
                          },
                          polygonOptions: {
                            fillColor: "#5db815",
                            fillOpacity: 0.3,
                            strokeWeight: 3,
                            strokeColor: "#5db815",
                            clickable: false,
                            editable: true,
                            zIndex: 1,
                          },
                        }}
                      />
                      {drawnPolygon && (
                        <Polygon
                          paths={drawnPolygon}
                          options={{
                            fillColor: "#5db815",
                            fillOpacity: 0.3,
                            strokeWeight: 3,
                            strokeColor: "#5db815",
                            editable: true,
                          }}
                        />
                      )}
                    </GoogleMap>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
                <button
                  onClick={handleSubmitPolygon}
                  disabled={!drawnPolygon || drawnPolygon.length < 3 || isSubmitting}
                  className="w-full bg-[#5db815] text-white px-6 py-3 rounded-md font-medium hover:bg-[#4a9a11] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Procesando..." : "Generar Reporte Gratis"}
                </button>

                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <label className="block">
                    <input
                      type="file"
                      accept=".json,.geojson"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isSubmitting}
                    />
                    <span className="block w-full border border-gray-300 text-[#121212] px-6 py-3 rounded-md font-medium hover:bg-gray-50 transition-colors text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSubmitting ? "Procesando..." : "Subir límite del campo (GeoJSON)"}
                    </span>
                  </label>

                  <button
                    onClick={handleManualMapping}
                    disabled={isSubmitting}
                    className="w-full text-[#5db815] hover:text-[#4a9a11] font-medium text-sm underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ¿No puedes encontrar tu campo? Nosotros lo hacemos por ti.
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === "confirmation" && (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#5db815]/10 rounded-full mb-4">
                  <svg className="w-8 h-8 text-[#5db815]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-[#121212] mb-4">
                  ¡Reporte en Proceso!
                </h2>
                <p className="text-lg text-[#898989] mb-6">
                  Tu reporte satelital gratuito está siendo generado y será enviado a tu correo electrónico.
                </p>
                <p className="text-[#898989] mb-8">
                  Te enviaremos un email a <strong>{formData.email}</strong> cuando esté listo.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/"
                  className="bg-[#5db815] text-white px-6 py-3 rounded-md font-medium hover:bg-[#4a9a11] transition-colors"
                >
                  Volver al inicio
                </Link>
                <Link
                  href="/registrarte"
                  className="border border-[#5db815] text-[#5db815] px-6 py-3 rounded-md font-medium hover:bg-[#5db815] hover:text-white transition-colors"
                >
                  Crear cuenta gratuita
                </Link>
              </div>
            </div>
          )}

          {step === "already-completed" && (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#5db815]/10 rounded-full mb-4">
                  <svg className="w-8 h-8 text-[#5db815]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-[#121212] mb-4">
                  Ya has conocido la salud de tu cultivo
                </h2>
                <p className="text-lg text-[#898989] mb-6">
                  Ya has recibido tu reporte satelital gratuito. Para continuar monitoreando tu cultivo y recibir reportes regulares, compra uno de nuestros planes.
                </p>
                <p className="text-[#898989] mb-8">
                  Con CoperniGeo puedes monitorear múltiples campos, recibir alertas tempranas y tomar decisiones informadas para optimizar tu producción.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/precios"
                  className="bg-[#5db815] text-white px-6 py-3 rounded-md font-medium hover:bg-[#4a9a11] transition-colors"
                >
                  Ver Planes
                </Link>
                <Link
                  href="/registrarte"
                  className="border border-[#5db815] text-[#5db815] px-6 py-3 rounded-md font-medium hover:bg-[#5db815] hover:text-white transition-colors"
                >
                  Crear cuenta
                </Link>
              </div>
            </div>
          )}

          {step === "map" && !isLoaded && (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <p className="text-[#898989]">Cargando mapa...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FreeReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#898989]">Cargando...</p>
        </div>
      </div>
    }>
      <FreeReportPageContent />
    </Suspense>
  );
}

