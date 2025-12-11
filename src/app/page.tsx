"use client";

import Link from "next/link";
import { useState } from "react";

type FeatureType = "satellite" | "analysis" | "reports" | null;

interface Feature {
  id: FeatureType;
  title: string;
  icon: React.ReactNode;
  description: string;
  detailedContent: {
    heading: string;
    paragraphs: string[];
    visual: React.ReactNode;
    statistics: Array<{ value: string; label: string }>;
  };
}

export default function Home() {
  const [selectedFeature, setSelectedFeature] = useState<FeatureType>(null);

  const features: Feature[] = [
    {
      id: "satellite",
      title: "Diseñado para monitoreo satelital",
      icon: (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 002 2h2.945M15 15v.01M20 12a8 8 0 11-16 0 8 8 0 0116 0z" />
            </svg>
          </div>
        </div>
      ),
      description: "Monitoreo satelital de precisión",
      detailedContent: {
        heading: "Diseñado para monitoreo satelital",
        paragraphs: [
          "CoperniGeo fue desarrollado con un propósito específico: empoderar a los agricultores y profesionales agrícolas para obtener el mejor rendimiento de sus cultivos. Cada aspecto está intencionalmente diseñado para ayudar a los equipos a enfocarse en lo que mejor hacen: monitorear, analizar y optimizar la producción agrícola.",
          "Debido a su diseño específico para el monitoreo satelital, CoperniGeo es increíblemente fácil de usar, pero se vuelve más poderoso a medida que escalas. Utiliza imágenes de alta resolución de Copernicus Sentinel-2 para proporcionar datos precisos y actualizados sobre el estado de tus cultivos.",
          "Con acceso a datos satelitales actualizados cada 5 días, puedes monitorear tus campos en tiempo casi real, detectar problemas temprano y tomar decisiones informadas basadas en datos precisos."
        ],
        statistics: [
          { value: "5 días", label: "Frecuencia de actualización" },
          { value: "10m", label: "Resolución espacial" },
          { value: "100%", label: "Cobertura global" }
        ],
        visual: (
          <div className="relative w-full h-64 bg-gray-800 rounded-lg overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="relative">
                    <div className="w-24 h-24 bg-green-500/20 rounded-lg border border-green-500/30 transform rotate-12"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-green-500/10 rounded-lg border border-green-500/20"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute bottom-4 left-4 text-white text-sm font-medium">Imágenes Sentinel-2</div>
          </div>
        )
      }
    },
    {
      id: "analysis",
      title: "Diseñado para análisis rápido",
      icon: (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      ),
      description: "Análisis instantáneo de índices",
      detailedContent: {
        heading: "Diseñado para análisis rápido",
        paragraphs: [
          "Obtén análisis instantáneos de tus cultivos con índices de vegetación como NDVI, NDRE y EVI. Nuestro sistema procesa imágenes satelitales en minutos, no en horas.",
          "Con cálculos optimizados y procesamiento en la nube, puedes obtener resultados precisos sobre la salud de tus cultivos, detectar áreas problemáticas y tomar decisiones informadas rápidamente.",
          "El análisis automático incluye estadísticas detalladas (mínimo, máximo, promedio) para cada área monitoreada, permitiéndote comparar el rendimiento entre diferentes campos y períodos de tiempo."
        ],
        statistics: [
          { value: "50ms", label: "Tiempo de procesamiento" },
          { value: "3", label: "Índices de vegetación" },
          { value: "2x", label: "Más rápido que la competencia" }
        ],
        visual: (
          <div className="relative w-full h-64 bg-gray-800 rounded-lg overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold text-green-500 mb-2">50ms</div>
                <div className="text-gray-400 text-sm">Tiempo de procesamiento</div>
              </div>
            </div>
            <div className="absolute top-4 left-4 flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
            </div>
          </div>
        )
      }
    },
    {
      id: "reports",
      title: "Creado para la perfección",
      icon: (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
      ),
      description: "Reportes automáticos perfectos",
      detailedContent: {
        heading: "Creado para la perfección",
        paragraphs: [
          "Recibe reportes automáticos perfectamente diseñados con toda la información que necesitas sobre tus cultivos. Cada reporte incluye visualizaciones de alta calidad, estadísticas detalladas y análisis comparativos.",
          "Configura la frecuencia de tus reportes (diario, semanal, mensual) y recíbelos directamente en tu correo electrónico con PDFs adjuntos listos para compartir con tu equipo.",
          "Los reportes incluyen mapas de índices de vegetación, gráficos de tendencias, alertas de problemas detectados y recomendaciones basadas en los datos analizados."
        ],
        statistics: [
          { value: "100%", label: "Automatizado" },
          { value: "PDF", label: "Formato profesional" },
          { value: "24/7", label: "Disponibilidad" }
        ],
        visual: (
          <div className="relative w-full h-64 bg-gray-800 rounded-lg overflow-hidden">
            <div className="absolute inset-0 p-4">
              <div className="h-full bg-gray-900 rounded border border-gray-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-white font-semibold">Reporte de Monitoreo</div>
                  <div className="w-6 h-6 border border-gray-600 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-green-500/30 rounded"></div>
                  <div className="h-2 bg-green-500/50 rounded w-3/4"></div>
                  <div className="h-2 bg-green-500/30 rounded w-1/2"></div>
                </div>
                <div className="mt-4 flex items-center space-x-2">
                  <div className="w-8 h-8 bg-green-500/20 rounded border border-green-500/30"></div>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-700 rounded mb-1"></div>
                    <div className="h-2 bg-gray-700 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
    }
  ];

  const selectedFeatureData = features.find(f => f.id === selectedFeature);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation Bar */}
      <nav className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-green-500">CoperniGeo</h1>
              <div className="hidden md:flex space-x-6">
                <button className="text-gray-300 hover:text-green-500 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Producto
                </button>
                <button className="text-gray-300 hover:text-green-500 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Recursos
                </button>
                <button className="text-gray-300 hover:text-green-500 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Precios
                </button>
                <button className="text-gray-300 hover:text-green-500 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Clientes
                </button>
                <button className="text-gray-300 hover:text-green-500 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Contacto
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/inicia-sesion"
                className="text-gray-300 hover:text-green-500 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Inicia sesión
              </Link>
              <Link
                href="/registrarte"
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Registrarte
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white sm:text-7xl mb-6">
            CoperniGeo es una herramienta diseñada para monitorear y optimizar cultivos.
          </h1>
          <p className="mt-6 text-xl text-gray-400 max-w-3xl mx-auto">
            Conoce el sistema para el monitoreo agrícola moderno. Optimiza el seguimiento de áreas, proyectos y análisis de cultivos mediante imágenes satelitales.
          </p>
          <div className="mt-10 flex justify-center space-x-4">
            <Link
              href="/registrarte"
              className="bg-white text-gray-900 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Comenzar
            </Link>
            <Link
              href="/inicia-sesion"
              className="text-gray-300 hover:text-green-500 text-lg font-semibold transition-colors"
            >
              Inicia sesión →
            </Link>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="mt-24 relative">
          <div className="bg-gray-800 rounded-lg shadow-2xl overflow-hidden border border-gray-700 transform rotate-[-1deg]">
            {/* Mock Dashboard Header */}
            <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="text-gray-400 text-sm">copernigeo.com/dashboard</div>
            </div>

            {/* Mock Dashboard Content */}
            <div className="flex">
              {/* Sidebar */}
              <div className="w-64 bg-gray-900 border-r border-gray-700 p-6">
                <h2 className="text-xl font-bold text-green-500 mb-6">CoperniGeo</h2>
                <nav className="space-y-2">
                  <div className="px-4 py-2 text-green-500 bg-green-500/10 rounded-md text-sm font-medium">
                    Inicio
                  </div>
                  <div className="px-4 py-2 text-gray-400 hover:text-green-500 rounded-md text-sm font-medium cursor-pointer">
                    Imágenes
                  </div>
                  <div className="px-4 py-2 text-gray-400 hover:text-green-500 rounded-md text-sm font-medium cursor-pointer">
                    Automatizar reportes
                  </div>
                  <div className="px-4 py-2 text-gray-400 hover:text-green-500 rounded-md text-sm font-medium cursor-pointer">
                    Planes
                  </div>
                  <div className="px-4 py-2 text-gray-400 hover:text-green-500 rounded-md text-sm font-medium cursor-pointer">
                    Cuenta
                  </div>
                </nav>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 bg-gray-50 p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Bienvenido a CoperniGeo
                  </h3>
                  <p className="text-gray-600">
                    Monitorea tus cultivos mediante imágenes satelitales
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="text-sm text-gray-500 mb-1">Áreas monitoreadas</div>
                    <div className="text-2xl font-bold text-gray-900">3</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="text-sm text-gray-500 mb-1">Reportes activos</div>
                    <div className="text-2xl font-bold text-gray-900">5</div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4">Áreas recientes</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div>
                        <div className="font-medium text-gray-900">Campo Norte</div>
                        <div className="text-sm text-gray-500">Última actualización: hace 2 días</div>
                      </div>
                      <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        NDVI: 0.72
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div>
                        <div className="font-medium text-gray-900">Campo Sur</div>
                        <div className="text-sm text-gray-500">Última actualización: hace 5 días</div>
                      </div>
                      <div className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                        NDVI: 0.58
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <div className="font-medium text-gray-900">Campo Este</div>
                        <div className="text-sm text-gray-500">Última actualización: hace 1 semana</div>
                      </div>
                      <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        NDVI: 0.81
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Section */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature) => (
            <button
              key={feature.id}
              onClick={() => setSelectedFeature(feature.id)}
              className="bg-[#151b24] rounded-2xl p-8 transition-all text-left group relative overflow-hidden aspect-square flex flex-col hover:bg-[#181c26] border border-gray-800/50 shadow-lg shadow-black/20 hover:border-gray-700/50 hover:shadow-xl hover:shadow-black/30"
            >
              {/* Subtle inner glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <div className="absolute top-4 left-4 w-7 h-7 flex items-center justify-center text-gray-400 group-hover:text-green-500 transition-colors z-10 rounded-full border border-gray-600/50 group-hover:border-green-500/50">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1 flex items-center justify-center mb-6">{feature.icon}</div>
              <div className="mt-auto">
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Additional Content Section 1 */}
        <div className="mt-32 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-5xl font-bold text-white mb-6">
                Monitoreo en tiempo real
              </h2>
              <p className="text-xl text-gray-400 leading-relaxed mb-6">
                Obtén actualizaciones automáticas sobre el estado de tus cultivos cada 5 días. Nuestro sistema procesa imágenes satelitales de Copernicus Sentinel-2 para proporcionarte datos precisos y actualizados.
              </p>
              <p className="text-lg text-gray-500">
                Detecta problemas antes de que se vuelvan críticos. Monitorea el crecimiento, identifica áreas de estrés hídrico y optimiza el uso de recursos agrícolas con datos basados en evidencia.
              </p>
            </div>
            <div className="bg-[#151b24] rounded-2xl p-8 border border-gray-800/50 shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
                  <span className="text-gray-300">Actualización automática</span>
                  <span className="text-green-500 font-semibold">Cada 5 días</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
                  <span className="text-gray-300">Resolución espacial</span>
                  <span className="text-green-500 font-semibold">10 metros</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
                  <span className="text-gray-300">Cobertura</span>
                  <span className="text-green-500 font-semibold">Global</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Content Section 2 */}
        <div className="mt-32 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="bg-[#151b24] rounded-2xl p-8 border border-gray-800/50 shadow-lg">
                <div className="space-y-6">
                  <div>
                    <div className="text-sm text-gray-500 mb-2">Índice NDVI</div>
                    <div className="h-3 bg-gray-900 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" style={{ width: '75%' }}></div>
                    </div>
                    <div className="text-white font-semibold mt-2">0.72 - Saludable</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-2">Índice NDRE</div>
                    <div className="h-3 bg-gray-900 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" style={{ width: '68%' }}></div>
                    </div>
                    <div className="text-white font-semibold mt-2">0.68 - Normal</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-2">Índice EVI</div>
                    <div className="h-3 bg-gray-900 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" style={{ width: '82%' }}></div>
                    </div>
                    <div className="text-white font-semibold mt-2">0.82 - Excelente</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-5xl font-bold text-white mb-6">
                Análisis de índices de vegetación
              </h2>
              <p className="text-xl text-gray-400 leading-relaxed mb-6">
                Calcula automáticamente NDVI, NDRE y EVI para cada área monitoreada. Visualiza la salud de tus cultivos con mapas de calor y gráficos de tendencias.
              </p>
              <p className="text-lg text-gray-500">
                Compara el rendimiento entre diferentes campos y períodos. Identifica patrones y toma decisiones informadas basadas en datos científicos precisos.
              </p>
            </div>
          </div>
        </div>

        {/* Quote Section */}
        <div className="mt-24 max-w-4xl mx-auto text-center">
          <div className="bg-[#151b24] rounded-2xl p-12 border border-gray-800/50 shadow-lg">
            <svg className="w-12 h-12 text-green-500 mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.996 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.984zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
            </svg>
            <blockquote className="text-2xl font-semibold text-white mb-6 leading-relaxed">
              "CoperniGeo ha transformado la forma en que monitoreamos nuestros cultivos. Los datos satelitales nos permiten tomar decisiones informadas y optimizar nuestra producción agrícola de manera nunca antes posible."
            </blockquote>
            <div className="flex items-center justify-center space-x-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <span className="text-green-500 font-bold text-lg">JM</span>
              </div>
              <div className="text-left">
                <div className="text-white font-semibold">Juan Martínez</div>
                <div className="text-gray-400 text-sm">Agricultor, Agrícola del Valle</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 -mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* CTA Section */}
          <div className="pb-16 mb-16 border-b border-gray-800">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div className="flex-1">
                <h2 className="text-4xl font-bold text-white mb-4">
                  ¿Listo para comenzar?
                </h2>
                <p className="text-xl text-gray-400">
                  Únete a agricultores y profesionales agrícolas que ya están optimizando sus cultivos con CoperniGeo.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/registrarte"
                  className="bg-green-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors whitespace-nowrap"
                >
                  Comenzar gratis
                </Link>
                <Link
                  href="/inicia-sesion"
                  className="bg-[#151b24] text-white border border-gray-700 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-[#181c26] hover:border-gray-600 transition-colors whitespace-nowrap"
                >
                  Contactar ventas
                </Link>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {/* Features */}
            <div>
              <div className="w-6 h-6 bg-green-500 rounded-full mb-6"></div>
            </div>

            {/* Product */}
            <div>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/dashboard/planes" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Precios
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                    API
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Documentación
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Integraciones
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <ul className="space-y-2.5">
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Sobre nosotros
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Clientes
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/dashboard/ayuda" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Ayuda
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Documentación
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Guías
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Privacidad
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Términos
                  </Link>
                </li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <ul className="space-y-2.5">
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Contacto
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Twitter
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                    LinkedIn
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal */}
      {selectedFeature && selectedFeatureData && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-12"
          onClick={() => setSelectedFeature(null)}
        >
          <div 
            className="bg-[#151b24] rounded-t-2xl max-w-4xl w-full h-[calc(100vh-3rem)] shadow-2xl flex flex-col overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button - Inside modal at top right */}
            <button
              onClick={() => setSelectedFeature(null)}
              className="absolute top-4 right-4 z-20 text-gray-400 hover:text-white transition-colors bg-[#151b24] rounded-full p-2 hover:bg-[#181c26]"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Scrollable Content */}
            <div 
              className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-900 [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-600"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 #111827' }}
            >
              {/* Icon - Part of scrollable content */}
              <div className="px-12 pt-8 pb-6 flex flex-col items-center">
                <div className="mb-6 flex items-center justify-center">
                  <div className="w-20 h-20 bg-green-500/20 rounded-xl flex items-center justify-center">
                    {selectedFeatureData.id === "satellite" && (
                      <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 002 2h2.945M15 15v.01M20 12a8 8 0 11-16 0 8 8 0 0116 0z" />
                      </svg>
                    )}
                    {selectedFeatureData.id === "analysis" && (
                      <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    )}
                    {selectedFeatureData.id === "reports" && (
                      <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="px-16 pb-16">
                {/* Visual Element */}
                <div className="mb-10">
                  {selectedFeatureData.detailedContent.visual}
                </div>

                {/* Title - Below visual, above text */}
                <div className="mb-8">
                  <h2 className="text-4xl font-bold text-white text-center">{selectedFeatureData.detailedContent.heading}</h2>
                </div>

                {/* Text Content */}
                <div className="space-y-6">
                  {selectedFeatureData.detailedContent.paragraphs.map((paragraph, index) => (
                    <p key={index} className="text-gray-300 leading-relaxed text-lg">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {/* Statistics Section */}
                <div className="mt-16 grid grid-cols-3 gap-8">
                  {selectedFeatureData.detailedContent.statistics.map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="text-6xl font-bold text-white mb-2">{stat.value}</div>
                      <div className="text-gray-400 text-sm">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

