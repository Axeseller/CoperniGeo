"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserAreas } from "@/lib/firestore/areas";
import { createReport, updateReport } from "@/lib/firestore/reports";
import { Report, IndexType, ReportFrequency, DeliveryMethod } from "@/types/report";
import { Area } from "@/types/area";
import { getFrequencyLabel } from "@/lib/utils/reports";
import Card from "@/components/ui/Card";

interface ReportStepperProps {
  onSave: (reportId?: string) => void;
  initialData?: Report;
}

type Step = "areas" | "delivery" | "frequency" | "summary";

export default function ReportStepper({ onSave, initialData }: ReportStepperProps) {
  const { user } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [currentStep, setCurrentStep] = useState<Step>("areas");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>(initialData?.areaIds || []);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(initialData?.deliveryMethod || "email");
  const [email, setEmail] = useState(initialData?.email || user?.email || "");
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || "");
  const [frequency, setFrequency] = useState<ReportFrequency>(initialData?.frequency || "weekly");
  const [reportName, setReportName] = useState(initialData?.name || "");
  // Indices: default to NDVI but allow modification
  const [indices, setIndices] = useState<IndexType[]>(initialData?.indices || ["NDVI"]);

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

  const toggleArea = (areaId: string) => {
    setSelectedAreaIds((prev) =>
      prev.includes(areaId)
        ? prev.filter((id) => id !== areaId)
        : [...prev, areaId]
    );
  };

  const handleNext = () => {
    if (currentStep === "areas") {
      if (selectedAreaIds.length === 0) {
        setError("Selecciona al menos un área");
        return;
      }
      setError("");
      setCurrentStep("delivery");
    } else if (currentStep === "delivery") {
      if (deliveryMethod === "email" && (!email || !email.includes("@"))) {
        setError("Email inválido");
        return;
      }
      if (deliveryMethod === "whatsapp") {
        const phoneDigits = phoneNumber.replace(/\D/g, "");
        if (phoneDigits.length < 10) {
          setError("Número de teléfono inválido (debe tener al menos 10 dígitos)");
          return;
        }
      }
      setError("");
      setCurrentStep("frequency");
    } else if (currentStep === "frequency") {
      if (!reportName || reportName.trim().length === 0) {
        setError("El nombre del reporte es obligatorio");
        return;
      }
      setError("");
      setCurrentStep("summary");
    }
  };

  const handleBack = () => {
    if (currentStep === "delivery") {
      setCurrentStep("areas");
    } else if (currentStep === "frequency") {
      setCurrentStep("delivery");
    } else if (currentStep === "summary") {
      setCurrentStep("frequency");
    }
    setError("");
  };

  const handleActivate = async () => {
    if (!user) {
      setError("Debes estar autenticado");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let reportId: string;
      
      if (initialData?.id) {
        await updateReport(initialData.id, {
          areaIds: selectedAreaIds,
          indices,
          cloudCoverage: 20, // Default
          frequency,
          deliveryMethod,
          email: deliveryMethod === "email" ? email : undefined,
          phoneNumber: deliveryMethod === "whatsapp" ? phoneNumber : undefined,
          name: reportName || undefined,
          status: initialData.status,
        });
        reportId = initialData.id;
      } else {
        reportId = await createReport({
          areaIds: selectedAreaIds,
          indices,
          cloudCoverage: 20,
          frequency,
          deliveryMethod,
          email: deliveryMethod === "email" ? email : undefined,
          phoneNumber: deliveryMethod === "whatsapp" ? phoneNumber : undefined,
          name: reportName || undefined,
          userId: user.uid,
          status: "active",
        });

        // Send WhatsApp confirmation if needed
        if (deliveryMethod === "whatsapp") {
          try {
            await fetch(`/api/reports/${reportId}/confirm-whatsapp`, {
              method: "POST",
            });
          } catch (whatsappErr: any) {
            console.error("WhatsApp confirmation error:", whatsappErr);
          }
        }
      }

      onSave(reportId);
    } catch (err: any) {
      setError(err.message || "Error al crear el reporte");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Step 1: Select Areas */}
      {currentStep === "areas" && (
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-[#242424] mb-2">
                Selecciona tus parcelas
              </h2>
              <p className="text-[#898989]">
                Elige las áreas que quieres monitorear
              </p>
            </div>
            {areas.length === 0 ? (
              <div className="text-center py-8 text-[#898989]">
                <p>No hay áreas disponibles.</p>
                <p className="text-sm mt-2">Crea áreas primero en la sección de Imágenes.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {areas.map((area) => (
                  <button
                    key={area.id}
                    onClick={() => area.id && toggleArea(area.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selectedAreaIds.includes(area.id || "")
                        ? "border-[#5db815] bg-[#5db815]/10"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#242424]">{area.name}</span>
                      {selectedAreaIds.includes(area.id || "") && (
                        <svg className="w-5 h-5 text-[#5db815]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={handleNext}
                disabled={selectedAreaIds.length === 0}
                className="bg-[#5db815] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#4a9a11] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Delivery Method */}
      {currentStep === "delivery" && (
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-[#242424] mb-2">
                ¿Cómo quieres recibir los reportes?
              </h2>
              <p className="text-[#898989]">
                Elige el método de entrega preferido
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setDeliveryMethod("email")}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  deliveryMethod === "email"
                    ? "border-[#5db815] bg-[#5db815]/10"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-[#242424] mb-1">📧 Email</div>
                <div className="text-sm text-[#898989]">Recibe reportes en tu correo electrónico</div>
              </button>
              <button
                onClick={() => setDeliveryMethod("whatsapp")}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  deliveryMethod === "whatsapp"
                    ? "border-[#5db815] bg-[#5db815]/10"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium text-[#242424] mb-1">📱 WhatsApp</div>
                <div className="text-sm text-[#898989]">Recibe reportes directamente en WhatsApp</div>
              </button>
            </div>
            {deliveryMethod === "email" ? (
              <div>
                <label className="block text-sm font-medium text-[#242424] mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-white text-[#242424] border border-gray-300 rounded-lg focus:outline-none focus:ring-[#5db815] focus:border-[#5db815]"
                  placeholder="ejemplo@correo.com"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-[#242424] mb-2">
                  Número de teléfono *
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-2 bg-white text-[#242424] border border-gray-300 rounded-lg focus:outline-none focus:ring-[#5db815] focus:border-[#5db815]"
                  placeholder="523318450745"
                  required
                />
                <p className="mt-1 text-xs text-[#898989]">
                  Incluye el código de país sin el símbolo +
                </p>
              </div>
            )}
            <div className="flex justify-between">
              <button
                onClick={handleBack}
                className="text-[#898989] hover:text-[#242424] px-4 py-2"
              >
                Atrás
              </button>
              <button
                onClick={handleNext}
                className="bg-[#5db815] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#4a9a11] transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Frequency */}
      {currentStep === "frequency" && (
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-[#242424] mb-2">
                ¿Con qué frecuencia?
              </h2>
              <p className="text-[#898989]">
                Selecciona cada cuánto tiempo quieres recibir reportes
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#242424] mb-2">
                Nombre del reporte *
              </label>
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                className="w-full px-4 py-2 bg-white text-[#242424] border border-gray-300 rounded-lg focus:outline-none focus:ring-[#5db815] focus:border-[#5db815] mb-4"
                placeholder="Ej: Reporte de maíz - Zona norte"
                required
              />
            </div>
            <div className="space-y-2">
              {(["3days", "5days", "weekly", "monthly"] as ReportFrequency[]).map((freq) => (
                <button
                  key={freq}
                  onClick={() => setFrequency(freq)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    frequency === freq
                      ? "border-[#5db815] bg-[#5db815]/10"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium text-[#242424]">
                    {getFrequencyLabel(freq)}
                  </div>
                </button>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#242424] mb-2">
                Índices a incluir (opcional)
              </label>
              <p className="text-xs text-[#898989] mb-3">
                NDVI está seleccionado por defecto. Puedes agregar más índices si lo deseas.
              </p>
              <div className="space-y-2">
                {(["NDVI", "NDRE", "EVI", "NDWI", "MSAVI", "PSRI"] as IndexType[]).map((indexType) => (
                  <label
                    key={indexType}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={indices.includes(indexType)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setIndices((prev) => [...prev, indexType]);
                        } else {
                          // Don't allow unchecking if it's the only index
                          if (indices.length > 1) {
                            setIndices((prev) => prev.filter((i) => i !== indexType));
                          }
                        }
                      }}
                      className="rounded border-gray-300 text-[#5db815] focus:ring-[#5db815]"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-[#242424]">{indexType}</div>
                      <div className="text-xs text-[#898989] mt-0.5">
                        {indexType === "NDVI" && "Salud general y cobertura vegetal"}
                        {indexType === "NDRE" && "Contenido de clorofila y nutrición"}
                        {indexType === "EVI" && "Biomasa y productividad"}
                        {indexType === "NDWI" && "Estrés hídrico y problemas de riego"}
                        {indexType === "MSAVI" && "Emergencia y establecimiento temprano"}
                        {indexType === "PSRI" && "Senescencia y presión de enfermedades"}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              <button
                onClick={handleBack}
                className="text-[#898989] hover:text-[#242424] px-4 py-2"
              >
                Atrás
              </button>
              <button
                onClick={handleNext}
                className="bg-[#5db815] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#4a9a11] transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 4: Summary */}
      {currentStep === "summary" && (
        <Card>
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-[#242424] mb-2">
                Resumen
              </h2>
              <p className="text-[#898989]">
                Revisa tu configuración antes de activar
              </p>
            </div>
            <div className="space-y-4 bg-gray-50 rounded-lg p-4">
              {reportName && (
                <div>
                  <span className="text-sm font-medium text-[#898989]">Nombre:</span>
                  <p className="text-[#242424] font-medium mt-1">
                    {reportName}
                  </p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-[#898989]">Parcelas:</span>
                <p className="text-[#242424] font-medium mt-1">
                  {selectedAreaIds.length} {selectedAreaIds.length === 1 ? "parcela" : "parcelas"}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-[#898989]">Entrega:</span>
                <p className="text-[#242424] font-medium mt-1">
                  {deliveryMethod === "email" ? `📧 ${email}` : `📱 ${phoneNumber}`}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-[#898989]">Frecuencia:</span>
                <p className="text-[#242424] font-medium mt-1">
                  {getFrequencyLabel(frequency)}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-[#898989]">Índices:</span>
                <p className="text-[#242424] font-medium mt-1">
                  {indices.join(", ")}
                </p>
              </div>
            </div>
            <div className="flex justify-between">
              <button
                onClick={handleBack}
                className="text-[#898989] hover:text-[#242424] px-4 py-2"
              >
                Atrás
              </button>
              <button
                onClick={handleActivate}
                disabled={loading}
                className="bg-[#5db815] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#4a9a11] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Activando..." : "Activar reportes"}
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

