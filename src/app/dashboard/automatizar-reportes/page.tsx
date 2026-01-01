"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserReports } from "@/lib/firestore/reports";
import ReportStepper from "@/components/reports/ReportStepper";
import ReportList from "@/components/reports/ReportList";
import PlanRequired from "@/components/PlanRequired";
import Card from "@/components/ui/Card";
import { Report } from "@/types/report";

export default function AutomatizarReportesPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStepper, setShowStepper] = useState(false);
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
    await loadReports();
    setShowStepper(false);
    setEditingReport(null);
  };

  const handleEdit = (report: Report) => {
    setEditingReport(report);
    setShowStepper(true);
  };

  const handleCloseStepper = () => {
    setShowStepper(false);
    setEditingReport(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#242424]">Automatizar reportes</h1>
        <Card>
        <div className="text-center py-8 text-[#898989]">Cargando reportes...</div>
        </Card>
      </div>
    );
  }

  return (
    <PlanRequired>
      <div className="space-y-6">
      <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#242424] mb-2">Automatizar reportes</h1>
            <p className="text-[#898989]">
              Configura reportes periódicos y recibe actualizaciones automáticas
            </p>
          </div>
          {!showStepper && (
          <button
            onClick={() => {
                setShowStepper(true);
              setEditingReport(null);
            }}
              className="bg-[#5db815] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#4a9a11] transition-colors"
          >
              Nuevo reporte
          </button>
        )}
      </div>

        {showStepper ? (
          <div className="relative">
            {editingReport && (
            <button
                onClick={handleCloseStepper}
                className="absolute -top-2 right-0 text-[#898989] hover:text-[#242424] transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            )}
            <ReportStepper onSave={handleSave} initialData={editingReport || undefined} />
        </div>
      ) : (
          <Card>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[#242424]">Reportes configurados</h2>
          <ReportList reports={reports} onUpdate={loadReports} onEdit={handleEdit} />
        </div>
          </Card>
      )}
      </div>
    </PlanRequired>
  );
}
