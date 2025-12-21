"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function EspecificacionesPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const specifications = [
    {
      category: "Datos Satelitales",
      items: [
        { name: "Fuente de datos", value: "Sentinel-2 (ESA)" },
        { name: "Resolución espacial", value: "10m - 250m (según índice)" },
        { name: "Frecuencia de actualización", value: "Cada 5 días" },
        { name: "Cobertura", value: "Global" },
        { name: "Período de datos históricos", value: "Últimos 60 días" },
      ]
    },
    {
      category: "Índices de Vegetación",
      items: [
        { name: "NDVI", value: "Normalized Difference Vegetation Index" },
        { name: "NDRE", value: "Normalized Difference Red Edge" },
        { name: "EVI", value: "Enhanced Vegetation Index" },
        { name: "Rango de valores", value: "-1.0 a 1.0" },
        { name: "Precisión", value: "0.001" },
      ]
    },
    {
      category: "Áreas de Interés",
      items: [
        { name: "Formato de polígonos", value: "Coordenadas GPS (lat/lng)" },
        { name: "Número mínimo de puntos", value: "3" },
        { name: "Tamaño máximo", value: "Sin límite" },
        { name: "Precisión de coordenadas", value: "6 decimales" },
      ]
    },
    {
      category: "Reportes",
      items: [
        { name: "Formatos disponibles", value: "PDF, Email, WhatsApp" },
        { name: "Frecuencias", value: "Cada 3 días, 5 días, semanal, mensual" },
        { name: "Estadísticas incluidas", value: "Mínimo, máximo, promedio" },
        { name: "Resolución de imágenes", value: "1200x1200px" },
        { name: "Cobertura de nubes configurable", value: "0-100%" },
      ]
    },
    {
      category: "Rendimiento",
      items: [
        { name: "Tiempo de procesamiento", value: "30-120 segundos por área" },
        { name: "Límite de áreas simultáneas", value: "Ilimitado" },
        { name: "Tiempo de respuesta API", value: "< 2 segundos" },
        { name: "Disponibilidad", value: "99.9% uptime" },
      ]
    },
    {
      category: "Integración",
      items: [
        { name: "API REST", value: "Disponible en planes Empresariales" },
        { name: "Webhooks", value: "Soporte para notificaciones" },
        { name: "Exportación de datos", value: "JSON, CSV" },
        { name: "Autenticación", value: "API Key, OAuth 2.0" },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#f4f3f4]">
      {/* Navigation Bar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 ${
        isScrolled ? 'pt-0 md:pt-2' : ''
      }`}>
        <div className={`max-w-7xl mx-auto ${
          isScrolled 
            ? 'bg-white border border-gray-200 shadow-sm md:rounded-lg' 
            : 'bg-[#f4f3f4] border-b border-gray-300'
        }`}>
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4 md:space-x-8">
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
                <div className="hidden md:flex space-x-6">
                  <Link href="/" className="text-[#121212] hover:text-[#5db815] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Producto
                  </Link>
                  <Link href="/precios" className="text-[#121212] hover:text-[#5db815] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Precios
                  </Link>
                  <Link href="/contacto" className="text-[#121212] hover:text-[#5db815] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Contacto
                  </Link>
                </div>
              </div>
              <div className="flex items-center space-x-2 md:space-x-4">
                <Link
                  href="/inicia-sesion"
                  className="hidden sm:inline-block text-[#121212] hover:text-[#5db815] px-3 md:px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Inicia sesión
                </Link>
                <Link
                  href="/registrarte"
                  className="bg-[#5db815] text-white px-3 md:px-4 py-2 rounded-md text-sm font-medium hover:bg-[#4a9a11] transition-colors"
                >
                  Registrarte
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 rounded-md text-[#121212] hover:bg-gray-100 transition-colors"
                  aria-label="Toggle menu"
                >
                  {isMobileMenuOpen ? (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-40 pt-16 md:hidden">
          <div className="px-4 space-y-4">
            <Link href="/" className="block text-[#121212] hover:text-[#5db815] py-2">Producto</Link>
            <Link href="/precios" className="block text-[#121212] hover:text-[#5db815] py-2">Precios</Link>
            <Link href="/contacto" className="block text-[#121212] hover:text-[#5db815] py-2">Contacto</Link>
            <Link href="/inicia-sesion" className="block text-[#121212] hover:text-[#5db815] py-2">Inicia sesión</Link>
            <Link href="/registrarte" className="block bg-[#5db815] text-white px-4 py-2 rounded-md text-center">Registrarte</Link>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-[#242424] mb-4">Especificaciones Técnicas</h1>
            <p className="text-[#898989] text-lg max-w-2xl mx-auto">
              Detalles técnicos sobre las capacidades y limitaciones de la plataforma CoperniGeo
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {specifications.map((spec, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-[#242424] mb-4 pb-2 border-b border-gray-200">
                  {spec.category}
                </h2>
                <dl className="space-y-3">
                  {spec.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                      <dt className="text-[#898989] font-medium text-sm">{item.name}:</dt>
                      <dd className="text-[#242424] text-sm sm:text-right">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-white rounded-lg shadow-sm p-8 text-center">
            <h2 className="text-2xl font-bold text-[#242424] mb-4">¿Necesitas más información?</h2>
            <p className="text-[#898989] mb-6">
              Nuestro equipo técnico está disponible para responder tus preguntas
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contacto"
                className="bg-[#5db815] text-white px-6 py-3 rounded-md font-medium hover:bg-[#4a9a11] transition-colors"
              >
                Contactar soporte técnico
              </Link>
              <Link
                href="/precios"
                className="border border-[#5db815] text-[#5db815] px-6 py-3 rounded-md font-medium hover:bg-[#5db815] hover:text-white transition-colors"
              >
                Ver planes y precios
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

