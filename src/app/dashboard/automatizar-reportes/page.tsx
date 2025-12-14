"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserReports } from "@/lib/firestore/reports";
import ReportConfig from "@/components/reports/ReportConfig";
import ReportList from "@/components/reports/ReportList";
import { Report } from "@/types/report";

export default function AutomatizarReportesPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);

  const loadReports = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userReports = await getUserReports(user.uid);
      setReports(userReports);
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleSave = async (reportId?: string) => {
    // Reload reports to show the newly created/updated report
    await loadReports();
    // Close the form to show the updated list
    // The form will show the "send now" button if needed, but we want to show the list
    setShowForm(false);
    setEditingReport(null);
  };

  const handleEdit = (report: Report) => {
    setEditingReport(report);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingReport(null);
  };

  if (loading) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-3xl font-bold text-[#242424] mb-6">Automatizar Reportes</h1>
        <div className="text-center py-8 text-[#898989]">Cargando reportes...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#242424]">Automatizar Reportes</h1>
        {!showForm && (
          <button
            onClick={() => {
              setShowForm(true);
              setEditingReport(null);
            }}
            className="bg-[#5db815] text-white px-4 py-2 rounded-lg hover:bg-[#4a9a11] transition-colors"
          >
            Nuevo Reporte
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 relative">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[#242424]">
              {editingReport ? "Editar Reporte" : "Crear Nuevo Reporte"}
            </h2>
            <button
              onClick={handleCloseForm}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              aria-label="Cerrar formulario"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <ReportConfig onSave={handleSave} initialData={editingReport || undefined} />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-[#242424] mb-4">Reportes Configurados</h2>
          <ReportList reports={reports} onUpdate={loadReports} onEdit={handleEdit} />
        </div>
      )}
    </div>
  );
}
