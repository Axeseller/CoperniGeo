import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { IndexType } from "@/types/report";
import { getFrequencyLabel } from "@/lib/utils/reports";

interface ReportData {
  areaName: string;
  indexType: IndexType;
  imageUrl?: string; // Base64 encoded image or URL
  stats: {
    min: number;
    max: number;
    mean: number;
  };
}

interface ReportPDFProps {
  report: {
    frequency: string;
    indices: IndexType[];
    cloudCoverage: number;
    email: string;
  };
  imageData: ReportData[];
  reportDate: string;
}

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    backgroundColor: "#16a34a",
    color: "white",
    padding: 20,
    marginBottom: 20,
    borderRadius: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 12,
    color: "#ffffff",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#16a34a",
  },
  configItem: {
    fontSize: 11,
    marginBottom: 5,
    color: "#333333",
  },
  areaSection: {
    marginBottom: 20,
    padding: 15,
    border: "1px solid #dddddd",
    borderRadius: 5,
    backgroundColor: "#f9f9f9",
  },
  areaTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#16a34a",
  },
  statsText: {
    fontSize: 11,
    marginBottom: 5,
    color: "#333333",
  },
  statsLabel: {
    fontWeight: "bold",
  },
  imageContainer: {
    marginTop: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  image: {
    maxWidth: "100%",
    maxHeight: 300,
  },
  footer: {
    marginTop: 30,
    fontSize: 10,
    color: "#666666",
    textAlign: "center",
  },
});

export const ReportPDF: React.FC<ReportPDFProps> = ({ report, imageData, reportDate }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Reporte de Monitoreo CoperniGeo</Text>
        <Text style={styles.subtitle}>Generado el {reportDate}</Text>
      </View>

      {/* Report Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuración del Reporte</Text>
        <Text style={styles.configItem}>
          <Text style={{ fontWeight: "bold" }}>Frecuencia:</Text> {getFrequencyLabel(report.frequency as any)}
        </Text>
        <Text style={styles.configItem}>
          <Text style={{ fontWeight: "bold" }}>Índices:</Text> {report.indices.join(", ")}
        </Text>
        <Text style={styles.configItem}>
          <Text style={{ fontWeight: "bold" }}>Cobertura de nubes:</Text> {report.cloudCoverage}%
        </Text>
      </View>

      {/* Results for each area/index */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resultados</Text>
        {imageData.map((data, index) => (
          <View key={index} style={styles.areaSection}>
            <Text style={styles.areaTitle}>
              {data.areaName} - {data.indexType}
            </Text>
            <Text style={styles.statsText}>
              <Text style={styles.statsLabel}>Mínimo:</Text> {data.stats.min.toFixed(3)}
            </Text>
            <Text style={styles.statsText}>
              <Text style={styles.statsLabel}>Máximo:</Text> {data.stats.max.toFixed(3)}
            </Text>
            <Text style={styles.statsText}>
              <Text style={styles.statsLabel}>Promedio:</Text> {data.stats.mean.toFixed(3)}
            </Text>
            {data.imageUrl && (
              <View style={styles.imageContainer}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={data.imageUrl} style={styles.image} />
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Este es un reporte automático de CoperniGeo.</Text>
        <Text>Para modificar la configuración, visita tu dashboard.</Text>
      </View>
    </Page>
  </Document>
);

