"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function GuiasPage() {
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

  const guides = [
    {
      title: "Guía de Inicio Rápido",
      description: "Aprende a crear tu primera área de interés y generar tu primer reporte en minutos.",
      icon: "🚀"
    },
    {
      title: "Cómo Interpretar los Índices de Vegetación",
      description: "Comprende qué significan los valores de NDVI, NDRE y EVI para tus cultivos.",
      icon: "📊"
    },
    {
      title: "Configuración de Reportes Automatizados",
      description: "Aprende a configurar reportes que se generen automáticamente según tu frecuencia preferida.",
      icon: "⚙️"
    },
    {
      title: "Mejores Prácticas para el Análisis de Cultivos",
      description: "Consejos profesionales para obtener el máximo valor de tus análisis satelitales.",
      icon: "🌾"
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-[#242424] mb-4">Guías</h1>
            <p className="text-[#898989] text-lg">
              Aprende a usar CoperniGeo con nuestras guías paso a paso
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {guides.map((guide, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="text-4xl mb-4">{guide.icon}</div>
                <h2 className="text-xl font-bold text-[#242424] mb-3">{guide.title}</h2>
                <p className="text-[#898989] mb-4">{guide.description}</p>
                <Link
                  href="#"
                  className="text-[#5db815] hover:text-[#4a9a11] font-medium inline-flex items-center gap-2"
                >
                  Leer guía
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-white rounded-lg shadow-sm p-8 text-center">
            <h2 className="text-2xl font-bold text-[#242424] mb-4">¿Necesitas ayuda adicional?</h2>
            <p className="text-[#898989] mb-6">
              Nuestro equipo está aquí para ayudarte
            </p>
            <Link
              href="/contacto"
              className="inline-block bg-[#5db815] text-white px-6 py-3 rounded-md font-medium hover:bg-[#4a9a11] transition-colors"
            >
              Contactar soporte
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

