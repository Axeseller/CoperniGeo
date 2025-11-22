"use client";

import { Report } from "@/types/report";
import { updateReport, deleteReport } from "@/lib/firestore/reports";

interface ReportListProps {
  reports: Report[];
  onUpdate: () => void;
  onEdit: (report: Report) => void;
}

export default function ReportList({ reports, onUpdate, onEdit }: ReportListProps) {
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

  if (reports.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
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
              <h4 className="font-medium text-gray-900">
                Reporte {report.frequency === "daily" ? "Diario" : report.frequency === "weekly" ? "Semanal" : "Mensual"}
              </h4>
              <p className="text-sm text-gray-500">{report.email}</p>
            </div>
            <span
              className={`px-2 py-1 text-xs rounded ${
                report.status === "active"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {report.status === "active" ? "Activo" : "Pausado"}
            </span>
          </div>

          <div className="text-sm text-gray-600 space-y-1 mb-3">
            <p>
              <strong>Áreas:</strong> {report.areaIds.length}
            </p>
            <p>
              <strong>Índices:</strong> {report.indices.join(", ")}
            </p>
            <p>
              <strong>Cobertura de nubes:</strong> {report.cloudCoverage}%
            </p>
            {report.lastGenerated && (
              <p>
                <strong>Última generación:</strong>{" "}
                {new Date(report.lastGenerated).toLocaleDateString("es-MX")}
              </p>
            )}
            {report.nextRun && (
              <p>
                <strong>Próxima ejecución:</strong>{" "}
                {new Date(report.nextRun).toLocaleDateString("es-MX")}
              </p>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => handleToggleStatus(report)}
              className={`flex-1 px-3 py-2 text-sm rounded ${
                report.status === "active"
                  ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                  : "bg-green-100 text-green-800 hover:bg-green-200"
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
      ))}
    </div>
  );
}

