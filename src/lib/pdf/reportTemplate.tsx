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
    email?: string; // Optional - only used for email reports
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
    marginTop: 20,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    maxHeight: 500,
    objectFit: "contain",
    // Lock aspect ratio - don't use auto to prevent very large images
    // width: 100% with maxHeight ensures proper scaling while maintaining ratio
  },
  statsContainer: {
    marginBottom: 20,
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
    {/* First page: Cover/Summary */}
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Reporte de Monitoreo CoperniGeo</Text>
        <Text style={styles.subtitle}>Generado el {reportDate}</Text>
      </View>

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

      <View style={styles.footer}>
        <Text>Este es un reporte automático de CoperniGeo.</Text>
        <Text>Para modificar la configuración, visita tu dashboard.</Text>
      </View>
    </Page>

    {/* One page per index with image */}
    {imageData.map((data, index) => (
      <Page key={index} size="A4" style={styles.page} wrap={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{data.areaName}</Text>
          <Text style={styles.subtitle}>{data.indexType}</Text>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Estadísticas</Text>
          <Text style={styles.statsText}>
            <Text style={styles.statsLabel}>Mínimo:</Text> {data.stats.min.toFixed(3)}
          </Text>
          <Text style={styles.statsText}>
            <Text style={styles.statsLabel}>Máximo:</Text> {data.stats.max.toFixed(3)}
          </Text>
          <Text style={styles.statsText}>
            <Text style={styles.statsLabel}>Promedio:</Text> {data.stats.mean.toFixed(3)}
          </Text>
        </View>

        {data.imageUrl && (
          <View style={styles.imageContainer}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image 
              src={data.imageUrl} 
              style={{
                ...styles.image,
                // Lock aspect ratio: use width 100% with maxHeight to maintain ratio
                // This prevents distortion while handling large images
                width: '100%',
                maxHeight: 500,
                objectFit: 'contain',
              }}
            />
          </View>
        )}

        <View style={styles.footer}>
          <Text>Página {index + 2} de {imageData.length + 1}</Text>
        </View>
      </Page>
    ))}
  </Document>
);

