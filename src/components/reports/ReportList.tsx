"use client";

import { useState } from "react";
import { Report } from "@/types/report";
import { updateReport, deleteReport } from "@/lib/firestore/reports";
import { getFrequencyLabel } from "@/lib/utils/reports";

interface ReportListProps {
  reports: Report[];
  onUpdate: () => void;
  onEdit: (report: Report) => void;
}

export default function ReportList({ reports, onUpdate, onEdit }: ReportListProps) {
  const [sendingReports, setSendingReports] = useState<Set<string>>(new Set());

  const handleToggleStatus = async (report: Report) => {
    if (!report.id) return;
    const newStatus = report.status === "active" ? "paused" : "active";
    await updateReport(report.id, { status: newStatus });
    onUpdate();
  };

  const handleDelete = async (reportId: string) => {
    if (confirm("¿Estás seguro de eliminar este reporte?")) {
      await deleteReport(reportId);
      onUpdate();
    }
  };

  const handleSendNow = async (report: Report) => {
    if (!report.id) return;

    setSendingReports((prev) => new Set(prev).add(report.id!));

    try {
      const response = await fetch(`/api/reports/${report.id}/send`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al enviar el reporte");
      }

      alert("¡Reporte enviado exitosamente!");
      onUpdate(); // Refresh the list to update lastGenerated date
    } catch (error: any) {
      alert(`Error al enviar el reporte: ${error.message}`);
    } finally {
      setSendingReports((prev) => {
        const newSet = new Set(prev);
        newSet.delete(report.id!);
        return newSet;
      });
    }
  };

  if (reports.length === 0) {
    return (
      <div className="text-center text-[#898989] py-8">
        <p>No hay reportes configurados</p>
        <p className="text-sm mt-2">Crea un reporte para comenzar</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <div
          key={report.id}
          className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-medium text-[#242424]">
                Reporte {getFrequencyLabel(report.frequency)}
              </h4>
              <p className="text-sm text-[#898989]">
                {report.deliveryMethod === "whatsapp" 
                  ? `📱 WhatsApp: ${report.phoneNumber || "N/A"}` 
                  : `📧 Email: ${report.email || "N/A"}`}
              </p>
            </div>
            <span
              className={`px-2 py-1 text-xs rounded ${
                report.status === "active"
                  ? "bg-[#5db815]/20 text-[#5db815]"
                  : "bg-gray-100 text-[#898989]"
              }`}
            >
              {report.status === "active" ? "Activo" : "Pausado"}
            </span>
          </div>

          <div className="text-sm text-[#898989] space-y-1 mb-3">
            <p>
              <strong className="text-[#242424]">Áreas:</strong> {report.areaIds.length}
            </p>
            <p>
              <strong className="text-[#242424]">Índices:</strong> {report.indices.join(", ")}
            </p>
            <p>
              <strong className="text-[#242424]">Cobertura de nubes:</strong> {report.cloudCoverage}%
            </p>
            {report.lastGenerated && (
              <p>
                <strong className="text-[#242424]">Última generación:</strong>{" "}
                {new Date(report.lastGenerated).toLocaleDateString("es-MX")}
              </p>
            )}
            {report.nextRun && (
              <p>
                <strong className="text-[#242424]">Próxima ejecución:</strong>{" "}
                {new Date(report.nextRun).toLocaleDateString("es-MX")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={() => handleSendNow(report)}
              disabled={sendingReports.has(report.id || "")}
              className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
            >
              {sendingReports.has(report.id || "") ? (
                <div className="flex flex-col items-center space-y-1.5">
                  <span>Enviando reporte...</span>
                  <div className="w-full bg-blue-700 rounded-full h-1">
                    <div 
                      className="bg-white h-1 rounded-full"
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
            {sendingReports.has(report.id || "") && (
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
            <div className="flex space-x-2">
              <button
                onClick={() => handleToggleStatus(report)}
                className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                  report.status === "active"
                    ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                    : "bg-[#5db815]/20 text-[#5db815] hover:bg-[#5db815]/30"
                }`}
              >
                {report.status === "active" ? "Pausar" : "Activar"}
              </button>
              <button
                onClick={() => onEdit(report)}
                className="flex-1 px-3 py-2 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
              >
                Editar
              </button>
              <button
                onClick={() => report.id && handleDelete(report.id)}
                className="flex-1 px-3 py-2 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

