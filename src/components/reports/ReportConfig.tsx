"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserAreas } from "@/lib/firestore/areas";
import { createReport, updateReport } from "@/lib/firestore/reports";
import { Report, ReportFormData, IndexType, ReportFrequency, DeliveryMethod } from "@/types/report";
import { Area } from "@/types/area";

interface ReportConfigProps {
  onSave: (reportId?: string) => void;
  initialData?: Report;
}

export default function ReportConfig({ onSave, initialData }: ReportConfigProps) {
  const { user } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [savedReportId, setSavedReportId] = useState<string | null>(null);

  const [formData, setFormData] = useState<ReportFormData>({
    areaIds: initialData?.areaIds || [],
    indices: initialData?.indices || ["NDVI"],
    cloudCoverage: initialData?.cloudCoverage || 20,
    frequency: initialData?.frequency || "5days",
    deliveryMethod: initialData?.deliveryMethod || "email",
    email: initialData?.email || user?.email || "",
    phoneNumber: initialData?.phoneNumber || "",
    name: initialData?.name || "",
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

  // Reset saved report ID when editing or form changes
  useEffect(() => {
    if (initialData?.id) {
      setSavedReportId(initialData.id);
    } else {
      setSavedReportId(null);
      setSuccessMessage("");
    }
  }, [initialData]);

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

    // Validate based on delivery method
    if (formData.deliveryMethod === "email") {
    if (!formData.email || !formData.email.includes("@")) {
      setError("Email inválido");
      return;
      }
    } else if (formData.deliveryMethod === "whatsapp") {
      if (!formData.phoneNumber || formData.phoneNumber.trim().length === 0) {
        setError("Número de teléfono requerido para WhatsApp");
        return;
      }
      // Validate phone number format (should be digits only, at least 10 digits)
      const phoneDigits = formData.phoneNumber.replace(/\D/g, "");
      if (phoneDigits.length < 10) {
        setError("Número de teléfono inválido (debe tener al menos 10 dígitos)");
        return;
      }
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      let reportId: string;
      const isNewReport = !initialData?.id;
      
      if (initialData?.id) {
        await updateReport(initialData.id, {
          ...formData,
          status: initialData.status,
        });
        reportId = initialData.id;
      } else {
        reportId = await createReport({
          ...formData,
          userId: user.uid,
          status: "active",
        });
      }
      
      // If this is a new WhatsApp report, send confirmation message
      if (isNewReport && formData.deliveryMethod === "whatsapp") {
        try {
          console.log(`[ReportConfig] Sending WhatsApp confirmation for report ${reportId}...`);
          const confirmResponse = await fetch(`/api/reports/${reportId}/confirm-whatsapp`, {
            method: "POST",
          });
          
          if (!confirmResponse.ok) {
            const errorData = await confirmResponse.json();
            console.error(`[ReportConfig] WhatsApp confirmation failed:`, errorData);
            throw new Error(errorData.error || "Error al enviar confirmación de WhatsApp");
          }
          
          console.log(`[ReportConfig] WhatsApp confirmation sent successfully`);
        } catch (whatsappErr: any) {
          console.error(`[ReportConfig] WhatsApp confirmation error:`, whatsappErr);
          // Don't fail the whole operation, just show a warning
          setError(`Reporte creado pero no se pudo enviar confirmación de WhatsApp: ${whatsappErr.message}`);
          setSavedReportId(reportId);
          onSave(reportId);
          setLoading(false);
          return;
        }
      }
      
      setSavedReportId(reportId);
      setSuccessMessage("Reporte guardado exitosamente. Puedes enviarlo ahora con datos actuales.");
      onSave(reportId);
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

  const handleSendNow = async () => {
    if (!savedReportId) return;

    setSending(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/reports/${savedReportId}/send`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al enviar el reporte");
      }

      setSuccessMessage("¡Reporte enviado exitosamente!");
      // Refresh reports list after a short delay
      setTimeout(() => {
        onSave(savedReportId);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Error al enviar el reporte");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-[#5db815]/10 border border-[#5db815]/30 text-[#5db815] px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      <div>
        <label htmlFor="reportName" className="block text-sm font-medium text-[#242424] mb-1">
          Nombre del reporte (opcional)
        </label>
        <input
          id="reportName"
          type="text"
          value={formData.name || ""}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#5db815] focus:border-[#5db815] bg-gray-50 text-[#242424] placeholder-gray-400"
          placeholder="Ej: Reporte Berries Enero"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#242424] mb-2">
          Áreas *
        </label>
        <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
          {areas.length === 0 ? (
            <p className="text-sm text-[#898989]">
              No hay áreas disponibles. Crea áreas primero en la sección de Imágenes.
            </p>
          ) : (
            areas.map((area) => (
              <label key={area.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.areaIds.includes(area.id || "")}
                  onChange={() => area.id && toggleArea(area.id)}
                  className="rounded border-gray-300 text-[#5db815] focus:ring-[#5db815]"
                />
                <span className="text-sm text-[#242424]">{area.name}</span>
              </label>
            ))
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#242424] mb-2">
          Índices *
        </label>
        <div className="space-y-2">
          {(["NDVI", "NDRE", "EVI"] as IndexType[]).map((index) => (
            <label key={index} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.indices.includes(index)}
                onChange={() => toggleIndex(index)}
                className="rounded border-gray-300 text-[#5db815] focus:ring-[#5db815]"
              />
              <span className="text-sm text-[#242424]">{index}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#242424] mb-1">
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
        <label className="block text-sm font-medium text-[#242424] mb-1">
          Frecuencia *
        </label>
        <select
          value={formData.frequency}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, frequency: e.target.value as ReportFrequency }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#5db815] focus:border-[#5db815] bg-gray-50 text-[#242424]"
        >
          <option value="3days">Cada 3 días</option>
          <option value="5days">Cada 5 días</option>
          <option value="weekly">Semanal</option>
          <option value="monthly">Mensual</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#242424] mb-1">
          Método de entrega *
        </label>
        <select
          value={formData.deliveryMethod}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, deliveryMethod: e.target.value as DeliveryMethod }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#5db815] focus:border-[#5db815] bg-gray-50 text-[#242424]"
        >
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
      </div>

      {formData.deliveryMethod === "email" ? (
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#242424] mb-1">
          Email para recibir reportes *
        </label>
        <input
          id="email"
          type="email"
            value={formData.email || ""}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, email: e.target.value }))
          }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#5db815] focus:border-[#5db815] bg-gray-50 text-[#242424] placeholder-gray-400"
          required
            placeholder="ejemplo@correo.com"
        />
      </div>
      ) : (
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-[#242424] mb-1">
            Número de teléfono para WhatsApp *
          </label>
          <input
            id="phoneNumber"
            type="tel"
            value={formData.phoneNumber || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#5db815] focus:border-[#5db815] bg-gray-50 text-[#242424] placeholder-gray-400"
            required
            placeholder="523318450745 (con código de país, sin + ni espacios)"
          />
          <p className="mt-1 text-xs text-[#898989]">
            Incluye el código de país sin el símbolo + (ejemplo: 523318450745 para México)
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#5db815] text-white px-4 py-2 rounded-lg hover:bg-[#4a9a11] disabled:opacity-50 transition-colors"
      >
        {loading ? "Guardando..." : initialData ? "Actualizar Reporte" : "Crear Reporte"}
      </button>

      {savedReportId && (
        <div className="mt-3">
        <button
          type="button"
          onClick={handleSendNow}
          disabled={sending}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
        >
            {sending ? (
              <div className="flex flex-col items-center space-y-2">
                <span>Enviando reporte...</span>
                <div className="w-full bg-blue-700 rounded-full h-1.5">
                  <div 
                    className="bg-white h-1.5 rounded-full"
                    style={{
                      width: '0%',
                      animation: 'progressBar 2s ease-in-out infinite',
                    }}
                  />
                </div>
              </div>
            ) : (
              "Enviar reporte con datos actuales ahora"
            )}
        </button>
          {sending && (
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes progressBar {
                0% {
                  width: 0%;
                  margin-left: 0%;
                }
                50% {
                  width: 75%;
                  margin-left: 12.5%;
                }
                100% {
                  width: 0%;
                  margin-left: 100%;
                }
              }
            `}} />
          )}
        </div>
      )}
    </form>
  );
}

