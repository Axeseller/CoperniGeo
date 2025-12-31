"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

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
  const { user, loading } = useAuth();
  const [selectedFeature, setSelectedFeature] = useState<FeatureType>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (selectedFeature) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedFeature]);

  // Handle scroll for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
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

  // Handle carousel touch events to distinguish horizontal vs vertical swipes
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    let isHorizontalSwipe = false;
    let hasMoved = false;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isHorizontalSwipe = false;
      hasMoved = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartX.current || !touchStartY.current) return;

      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const diffX = Math.abs(touchX - touchStartX.current);
      const diffY = Math.abs(touchY - touchStartY.current);

      if (!hasMoved && (diffX > 5 || diffY > 5)) {
        hasMoved = true;
        // Determine swipe direction on first significant movement
        isHorizontalSwipe = diffX > diffY;
      }

      // If it's a horizontal swipe, let the carousel handle it
      // If it's vertical, don't interfere - let page scroll naturally
      if (hasMoved && !isHorizontalSwipe && diffY > 10) {
        // Vertical swipe detected - stop tracking to allow page scroll
        touchStartX.current = 0;
        touchStartY.current = 0;
      }
    };

    const handleTouchEnd = () => {
      touchStartX.current = 0;
      touchStartY.current = 0;
      isHorizontalSwipe = false;
      hasMoved = false;
    };

    carousel.addEventListener('touchstart', handleTouchStart, { passive: true });
    carousel.addEventListener('touchmove', handleTouchMove, { passive: true });
    carousel.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      carousel.removeEventListener('touchstart', handleTouchStart);
      carousel.removeEventListener('touchmove', handleTouchMove);
      carousel.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const features: Feature[] = [
    {
      id: "satellite",
      title: "Diseñado para monitoreo satelital",
      icon: (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="w-16 h-16 bg-[#5db815]/20 rounded-xl flex items-center justify-center">
            <svg className="w-8 h-8 text-[#5db815]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    <div className="w-24 h-24 bg-[#5db815]/20 rounded-lg border border-[#5db815]/30 transform rotate-12"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-[#5db815]/10 rounded-lg border border-[#5db815]/20"></div>
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
          <div className="w-16 h-16 bg-[#5db815]/20 rounded-xl flex items-center justify-center">
            <svg className="w-8 h-8 text-[#5db815]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <div className="text-6xl font-bold text-[#5db815] mb-2">50ms</div>
                <div className="text-gray-400 text-sm">Tiempo de procesamiento</div>
              </div>
            </div>
            <div className="absolute top-4 left-4 flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-[#5db815]"></div>
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
          <div className="w-16 h-16 bg-[#5db815]/20 rounded-xl flex items-center justify-center">
            <svg className="w-8 h-8 text-[#5db815]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  <div className="h-2 bg-[#5db815]/30 rounded"></div>
                  <div className="h-2 bg-[#5db815]/50 rounded w-3/4"></div>
                  <div className="h-2 bg-[#5db815]/30 rounded w-1/2"></div>
                </div>
                <div className="mt-4 flex items-center space-x-2">
                  <div className="w-8 h-8 bg-[#5db815]/20 rounded border border-[#5db815]/30"></div>
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
    <div className="min-h-screen bg-[#f4f3f4] overflow-x-hidden">
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
                  <Link href="/" className="text-[#5db815] px-3 py-2 rounded-md text-sm font-medium">
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
                {!loading && (
                  user ? (
                    <Link
                      href="/dashboard"
                      className="bg-[#5db815] text-white px-3 md:px-4 py-2 rounded-md text-sm font-medium hover:bg-[#4a9a11] transition-colors"
                    >
                      Ir a mi cuenta
                    </Link>
                  ) : (
                    <>
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
                    </>
                  )
                )}
                {/* Hamburger Menu Button */}
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

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed top-16 right-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-xl z-50 md:hidden transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full">
              <div className="p-6 space-y-4 overflow-y-auto">
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-[#5db815] py-2 text-base font-medium"
                >
                  Producto
                </Link>
                <Link
                  href="/precios"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-[#121212] hover:text-[#5db815] py-2 text-base font-medium transition-colors"
                >
                  Precios
                </Link>
                <Link
                  href="/contacto"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-[#121212] hover:text-[#5db815] py-2 text-base font-medium transition-colors"
                >
                  Contacto
                </Link>
              </div>
              <div className="border-t border-gray-200 p-6 mt-auto space-y-3">
                {!loading && (
                  user ? (
                    <Link
                      href="/dashboard"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full text-center bg-[#5db815] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#4a9a11] transition-colors"
                    >
                      Ir a mi cuenta
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/inicia-sesion"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block w-full text-center text-[#121212] hover:text-[#5db815] px-4 py-2 rounded-md text-sm font-medium transition-colors border border-gray-300"
                      >
                        Inicia sesión
                      </Link>
                      <Link
                        href="/registrarte"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block w-full text-center bg-[#5db815] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#4a9a11] transition-colors"
                      >
                        Registrarte
                      </Link>
                    </>
                  )
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-16 sm:pb-32">
        <div className="text-center">
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#242424] mb-4 sm:mb-6">
            Detecta problemas en tu cultivo antes de que afecten el rendimiento
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-[#898989] max-w-3xl mx-auto px-2">
            Conoce el sistema para el monitoreo agrícola moderno. Optimiza el seguimiento de áreas, proyectos y análisis de cultivos mediante imágenes satelitales.
          </p>
          <div className="mt-8 sm:mt-10 flex flex-col items-center gap-3 sm:gap-4">
            {!loading && (
              user ? (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto bg-[#5db815] text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg text-base sm:text-lg font-semibold hover:bg-[#4a9a11] transition-colors"
                >
                  Ir a mi cuenta
                </Link>
              ) : (
                <>
                  <Link
                    href="/free-report"
                    className="w-full sm:w-auto bg-[#5db815] text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg text-base sm:text-lg font-semibold hover:bg-[#4a9a11] transition-colors text-center flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="block">Descubre la Salud de tu Cultivo</span>
                  </Link>
                  <p className="text-sm text-[#898989] text-center">
                    Toma menos de 2 minutos, sin tarjeta de crédito
                  </p>
                </>
              )
            )}
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="mt-24 max-w-7xl mx-auto">
          {/* Mobile Carousel */}
          <div className="md:hidden relative">
            <div 
              ref={carouselRef}
              className="overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 flex gap-4"
              style={{ 
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
                overscrollBehaviorX: 'contain',
                overscrollBehaviorY: 'auto',
                touchAction: 'pan-x pan-y',
                willChange: 'scroll-position'
              }}
            >
              {/* Left Dashboard Preview - Mobile */}
              <div className="w-[calc(100vw-2rem)] flex-shrink-0 snap-center" style={{ perspective: '1000px' }}>
            <div className="bg-gray-800 rounded-lg shadow-2xl overflow-hidden border border-gray-700" style={{ 
              transform: 'perspective(1000px) rotateY(6deg) rotateX(0deg) scale(1.02)',
              transformStyle: 'preserve-3d'
            }}>
              {/* Mock Dashboard Header */}
              <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#5db815]"></div>
                </div>
                <div className="text-gray-400 text-xs">copernigeo.com/dashboard</div>
              </div>

              {/* Mock Dashboard Content */}
              <div className="flex">
                {/* Sidebar */}
                <div className="w-48 bg-gray-900 border-r border-gray-700 p-4">
                  <h2 className="text-lg font-bold text-[#5db815] mb-4">CoperniGeo</h2>
                  <nav className="space-y-1.5">
                    <div className="px-3 py-1.5 text-[#5db815] bg-[#5db815]/10 rounded-md text-xs font-medium">
                      Inicio
                    </div>
                    <div className="px-3 py-1.5 text-gray-400 hover:text-[#5db815] rounded-md text-xs font-medium cursor-pointer">
                      Imágenes
                    </div>
                    <div className="px-3 py-1.5 text-gray-400 hover:text-[#5db815] rounded-md text-xs font-medium cursor-pointer">
                      Automatizar reportes
                    </div>
                    <div className="px-3 py-1.5 text-gray-400 hover:text-[#5db815] rounded-md text-xs font-medium cursor-pointer">
                      Planes
                    </div>
                    <div className="px-3 py-1.5 text-gray-400 hover:text-[#5db815] rounded-md text-xs font-medium cursor-pointer">
                      Cuenta
                    </div>
                  </nav>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 bg-gray-50 p-6">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      Bienvenido a CoperniGeo
                    </h3>
                    <p className="text-sm text-gray-600">
                      Monitorea tus cultivos mediante imágenes satelitales
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">Áreas monitoreadas</div>
                      <div className="text-xl font-bold text-gray-900">3</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">Reportes activos</div>
                      <div className="text-xl font-bold text-gray-900">5</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-sm text-gray-900 mb-3">Áreas recientes</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                        <div>
                          <div className="font-medium text-sm text-gray-900">Campo Norte</div>
                          <div className="text-xs text-gray-500">Última actualización: hace 2 días</div>
                        </div>
                        <div className="px-2 py-0.5 bg-[#5db815]/20 text-[#4a9a11] rounded-full text-xs font-medium">
                          NDVI: 0.72
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                        <div>
                          <div className="font-medium text-sm text-gray-900">Campo Sur</div>
                          <div className="text-xs text-gray-500">Última actualización: hace 5 días</div>
                        </div>
                        <div className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          NDVI: 0.58
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <div>
                          <div className="font-medium text-sm text-gray-900">Campo Este</div>
                          <div className="text-xs text-gray-500">Última actualización: hace 1 semana</div>
                        </div>
                        <div className="px-2 py-0.5 bg-[#5db815]/20 text-[#4a9a11] rounded-full text-xs font-medium">
                          NDVI: 0.81
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
              </div>

              {/* Right Dashboard Preview - Mobile */}
              <div className="w-[calc(100vw-2rem)] flex-shrink-0 snap-center" style={{ perspective: '1000px' }}>
            <div className="bg-gray-800 rounded-lg shadow-2xl overflow-hidden border border-gray-700" style={{ 
              transform: 'perspective(1000px) rotateY(-6deg) rotateX(0deg) scale(1.02)',
              transformStyle: 'preserve-3d'
            }}>
              {/* Analysis Header */}
              <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#5db815]"></div>
                </div>
                <div className="text-gray-400 text-xs">copernigeo.com/analisis</div>
              </div>

              {/* Analysis Content */}
              <div className="flex">
                {/* Sidebar */}
                <div className="w-48 bg-gray-900 border-r border-gray-700 p-4">
                  <h2 className="text-lg font-bold text-[#5db815] mb-4">CoperniGeo</h2>
                  <nav className="space-y-1.5">
                    <div className="px-3 py-1.5 text-gray-400 hover:text-[#5db815] rounded-md text-xs font-medium cursor-pointer">
                      Inicio
                    </div>
                    <div className="px-3 py-1.5 text-[#5db815] bg-[#5db815]/10 rounded-md text-xs font-medium">
                      Imágenes
                    </div>
                    <div className="px-3 py-1.5 text-gray-400 hover:text-[#5db815] rounded-md text-xs font-medium cursor-pointer">
                      Automatizar reportes
                    </div>
                    <div className="px-3 py-1.5 text-gray-400 hover:text-[#5db815] rounded-md text-xs font-medium cursor-pointer">
                      Planes
                    </div>
                    <div className="px-3 py-1.5 text-gray-400 hover:text-[#5db815] rounded-md text-xs font-medium cursor-pointer">
                      Cuenta
                    </div>
                  </nav>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 bg-gray-50 p-6">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      Campo Norte
            </h3>
                    <p className="text-sm text-gray-600">
                      Análisis NDVI - 15 Dic 2024
                    </p>
                  </div>

                  {/* Satellite Image with NDVI Overlay */}
                  <div className="relative h-48 bg-gradient-to-br from-green-600 via-green-400 to-yellow-300 rounded-lg overflow-hidden mb-4 border border-gray-200">
                    {/* Simulated satellite imagery with NDVI colors */}
                    <div className="absolute inset-0">
                      {/* Green areas (healthy vegetation) */}
                      <div className="absolute top-0 left-0 w-1/3 h-2/3 bg-gradient-to-br from-green-600 to-green-500 opacity-80"></div>
                      <div className="absolute top-1/4 right-1/4 w-1/4 h-1/3 bg-green-500 opacity-70"></div>
                      {/* Yellow areas (moderate vegetation) */}
                      <div className="absolute bottom-0 right-0 w-2/5 h-1/3 bg-gradient-to-tl from-yellow-400 to-yellow-300 opacity-75"></div>
                      <div className="absolute top-1/2 left-1/2 w-1/5 h-1/4 bg-yellow-400 opacity-60"></div>
                      {/* Red areas (low vegetation) */}
                      <div className="absolute bottom-1/4 left-1/3 w-1/6 h-1/5 bg-red-400 opacity-50"></div>
                      {/* Grid overlay for satellite look */}
                      <div className="absolute inset-0" style={{
                        backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                      }}></div>
                    </div>
                    
                    {/* NDVI Legend */}
                    <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded px-2 py-1.5 shadow-lg">
                      <div className="text-xs font-semibold text-gray-900 mb-1">NDVI</div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">
                          <div className="w-2.5 h-2.5 bg-red-500 rounded"></div>
                          <span className="text-xs text-gray-600">0.0-0.3</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <div className="w-2.5 h-2.5 bg-yellow-400 rounded"></div>
                          <span className="text-xs text-gray-600">0.3-0.6</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <div className="w-2.5 h-2.5 bg-green-500 rounded"></div>
                          <span className="text-xs text-gray-600">0.6-1.0</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm text-gray-900">Análisis NDVI</h4>
                      <div className="px-2 py-0.5 bg-[#5db815]/20 text-[#4a9a11] rounded-full text-xs font-medium">
                        NDVI: 0.72
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-gray-700">Alta (0.6-1.0)</span>
                        </div>
                        <span className="text-xs font-medium text-gray-900">68%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          <span className="text-xs text-gray-700">Media (0.3-0.6)</span>
                        </div>
                        <span className="text-xs font-medium text-gray-900">26%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                          <span className="text-xs text-gray-700">Baja (0.0-0.3)</span>
                        </div>
                        <span className="text-xs font-medium text-gray-900">6%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
              </div>
            </div>
            {/* Carousel Indicators */}
            <div className="flex justify-center gap-2 mt-6">
              <div className="w-2 h-2 rounded-full bg-[#5db815]"></div>
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            </div>
          </div>

          {/* Desktop Side-by-Side Layout */}
          <div className="hidden md:flex justify-center items-center gap-8" style={{ perspective: '1000px' }}>
            {/* Left Dashboard Preview */}
            <div className="flex-1 max-w-[48%]" style={{ perspective: '1000px' }}>
              <div className="bg-gray-800 rounded-lg shadow-2xl overflow-hidden border border-gray-700" style={{ 
                transform: 'perspective(1000px) rotateY(6deg) rotateX(0deg) scale(1.02)',
                transformStyle: 'preserve-3d'
              }}>
                {/* Mock Dashboard Header */}
                <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#5db815]"></div>
                  </div>
                  <div className="text-gray-400 text-xs">copernigeo.com/dashboard</div>
                </div>

                {/* Mock Dashboard Content */}
                <div className="flex">
                  {/* Sidebar */}
                  <div className="w-48 bg-gray-900 border-r border-gray-700 p-4">
                    <h2 className="text-lg font-bold text-[#5db815] mb-4">CoperniGeo</h2>
                    <nav className="space-y-1.5">
                      <div className="px-3 py-1.5 text-[#5db815] bg-[#5db815]/10 rounded-md text-xs font-medium">
                        Inicio
                      </div>
                      <div className="px-3 py-1.5 text-gray-400 hover:text-[#5db815] rounded-md text-xs font-medium cursor-pointer">
                        Imágenes
                      </div>
                      <div className="px-3 py-1.5 text-gray-400 hover:text-[#5db815] rounded-md text-xs font-medium cursor-pointer">
                        Automatizar reportes
                      </div>
                      <div className="px-3 py-1.5 text-gray-400 hover:text-[#5db815] rounded-md text-xs font-medium cursor-pointer">
                        Planes
                      </div>
                      <div className="px-3 py-1.5 text-gray-400 hover:text-[#5db815] rounded-md text-xs font-medium cursor-pointer">
                        Cuenta
                      </div>
                    </nav>
                  </div>

                  {/* Main Content Area */}
                  <div className="flex-1 bg-gray-50 p-6">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        Bienvenido a CoperniGeo
                      </h3>
                      <p className="text-sm text-gray-600">
                        Monitorea tus cultivos mediante imágenes satelitales
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Áreas monitoreadas</div>
                        <div className="text-xl font-bold text-gray-900">3</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Reportes activos</div>
                        <div className="text-xl font-bold text-gray-900">5</div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-sm text-gray-900 mb-3">Áreas recientes</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                          <div>
                            <div className="font-medium text-sm text-gray-900">Campo Norte</div>
                            <div className="text-xs text-gray-500">Última actualización: hace 2 días</div>
                          </div>
                          <div className="px-2 py-0.5 bg-[#5db815]/20 text-[#4a9a11] rounded-full text-xs font-medium">
                            NDVI: 0.72
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                          <div>
                            <div className="font-medium text-sm text-gray-900">Campo Sur</div>
                            <div className="text-xs text-gray-500">Última actualización: hace 5 días</div>
                          </div>
                          <div className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            NDVI: 0.58
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-1.5">
                          <div>
                            <div className="font-medium text-sm text-gray-900">Campo Este</div>
                            <div className="text-xs text-gray-500">Última actualización: hace 1 semana</div>
                          </div>
                          <div className="px-2 py-0.5 bg-[#5db815]/20 text-[#4a9a11] rounded-full text-xs font-medium">
                            NDVI: 0.81
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Dashboard Preview - Desktop */}
            <div className="flex-1 max-w-[48%]" style={{ perspective: '1000px' }}>
              <div className="bg-gray-800 rounded-lg shadow-2xl overflow-hidden border border-gray-700" style={{ 
                transform: 'perspective(1000px) rotateY(-6deg) rotateX(0deg) scale(1.02)',
                transformStyle: 'preserve-3d'
              }}>
                {/* Analysis Header */}
                <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#5db815]"></div>
                  </div>
                  <div className="text-gray-400 text-xs">copernigeo.com/analisis</div>
                </div>

                {/* Analysis Content */}
                <div className="flex">
                  {/* Sidebar */}
                  <div className="w-48 bg-gray-900 border-r border-gray-700 p-4">
                    <h2 className="text-lg font-bold text-[#5db815] mb-4">CoperniGeo</h2>
                    <nav className="space-y-1.5">
                      <div className="px-3 py-1.5 text-gray-400 hover:text-[#5db815] rounded-md text-xs font-medium cursor-pointer">
                        Inicio
                      </div>
                      <div className="px-3 py-1.5 text-[#5db815] bg-[#5db815]/10 rounded-md text-xs font-medium">
                        Imágenes
                      </div>
                      <div className="px-3 py-1.5 text-gray-400 hover:text-[#5db815] rounded-md text-xs font-medium cursor-pointer">
                        Automatizar reportes
                      </div>
                      <div className="px-3 py-1.5 text-gray-400 hover:text-[#5db815] rounded-md text-xs font-medium cursor-pointer">
                        Planes
                      </div>
                      <div className="px-3 py-1.5 text-gray-400 hover:text-[#5db815] rounded-md text-xs font-medium cursor-pointer">
                        Cuenta
                      </div>
                    </nav>
                  </div>

                  {/* Main Content Area */}
                  <div className="flex-1 bg-gray-50 p-6">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        Campo Norte
            </h3>
                      <p className="text-sm text-gray-600">
                        Análisis NDVI - 15 Dic 2024
                      </p>
                    </div>

                    {/* Satellite Image with NDVI Overlay */}
                    <div className="relative h-48 bg-gradient-to-br from-green-600 via-green-400 to-yellow-300 rounded-lg overflow-hidden mb-4 border border-gray-200">
                      {/* Simulated satellite imagery with NDVI colors */}
                      <div className="absolute inset-0">
                        {/* Green areas (healthy vegetation) */}
                        <div className="absolute top-0 left-0 w-1/3 h-2/3 bg-gradient-to-br from-green-600 to-green-500 opacity-80"></div>
                        <div className="absolute top-1/4 right-1/4 w-1/4 h-1/3 bg-green-500 opacity-70"></div>
                        {/* Yellow areas (moderate vegetation) */}
                        <div className="absolute bottom-0 right-0 w-2/5 h-1/3 bg-gradient-to-tl from-yellow-400 to-yellow-300 opacity-75"></div>
                        <div className="absolute top-1/2 left-1/2 w-1/5 h-1/4 bg-yellow-400 opacity-60"></div>
                        {/* Red areas (low vegetation) */}
                        <div className="absolute bottom-1/4 left-1/3 w-1/6 h-1/5 bg-red-400 opacity-50"></div>
                        {/* Grid overlay for satellite look */}
                        <div className="absolute inset-0" style={{
                          backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
                          backgroundSize: '20px 20px'
                        }}></div>
                      </div>
                      
                      {/* NDVI Legend */}
                      <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded px-2 py-1.5 shadow-lg">
                        <div className="text-xs font-semibold text-gray-900 mb-1">NDVI</div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-0.5">
                            <div className="w-2.5 h-2.5 bg-red-500 rounded"></div>
                            <span className="text-xs text-gray-600">0.0-0.3</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <div className="w-2.5 h-2.5 bg-yellow-400 rounded"></div>
                            <span className="text-xs text-gray-600">0.3-0.6</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <div className="w-2.5 h-2.5 bg-green-500 rounded"></div>
                            <span className="text-xs text-gray-600">0.6-1.0</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm text-gray-900">Análisis NDVI</h4>
                        <div className="px-2 py-0.5 bg-[#5db815]/20 text-[#4a9a11] rounded-full text-xs font-medium">
                          NDVI: 0.72
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-gray-700">Alta (0.6-1.0)</span>
                          </div>
                          <span className="text-xs font-medium text-gray-900">68%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                            <span className="text-xs text-gray-700">Media (0.3-0.6)</span>
                          </div>
                          <span className="text-xs font-medium text-gray-900">26%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                            <span className="text-xs text-gray-700">Baja (0.0-0.3)</span>
                          </div>
                          <span className="text-xs font-medium text-gray-900">6%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Section */}
        <div className="mt-16 sm:mt-24 md:mt-32 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto px-4 sm:px-0">
          {features.map((feature) => (
            <button
              key={feature.id}
              onClick={() => setSelectedFeature(feature.id)}
              className="bg-white rounded-2xl p-6 sm:p-8 transition-all text-left group relative overflow-hidden aspect-square flex flex-col hover:bg-gray-50 border border-gray-200 shadow-lg shadow-gray-200/50 hover:border-gray-300 hover:shadow-xl hover:shadow-gray-300/50"
            >
              {/* Subtle inner glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gray-100/50 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <div className="absolute top-4 left-4 w-7 h-7 flex items-center justify-center text-gray-600 group-hover:text-[#5db815] transition-colors z-10 rounded-full border border-gray-300 group-hover:border-[#5db815]/50">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1 flex items-center justify-center mb-6">{feature.icon}</div>
              <div className="mt-auto">
                <h3 className="text-xl font-semibold text-[#242424] mb-2">{feature.title}</h3>
                <p className="text-[#898989] text-sm">{feature.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Additional Content Section 1 */}
        <div className="mt-16 sm:mt-24 md:mt-32 max-w-6xl mx-auto px-4 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#242424] mb-4 sm:mb-6">
                Monitoreo en tiempo real
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-[#898989] leading-relaxed mb-4 sm:mb-6">
                Obtén actualizaciones automáticas sobre el estado de tus cultivos cada 5 días. Nuestro sistema procesa imágenes satelitales de Copernicus Sentinel-2 para proporcionarte datos precisos y actualizados.
              </p>
              <p className="text-sm sm:text-base md:text-lg text-[#898989]">
                Detecta problemas antes de que se vuelvan críticos. Monitorea el crecimiento, identifica áreas de estrés hídrico y optimiza el uso de recursos agrícolas con datos basados en evidencia.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Actualización automática</span>
                  <span className="text-[#5db815] font-semibold">Cada 5 días</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Resolución espacial</span>
                  <span className="text-[#5db815] font-semibold">10 metros</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Cobertura</span>
                  <span className="text-[#5db815] font-semibold">Global</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Content Section 2 */}
        <div className="mt-16 sm:mt-24 md:mt-32 max-w-6xl mx-auto px-4 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-lg">
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Índice NDVI</div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-[#5db815]" style={{ width: '75%' }}></div>
                    </div>
                    <div className="text-[#242424] font-semibold mt-2">0.72 - Saludable</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Índice NDRE</div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-[#5db815]" style={{ width: '68%' }}></div>
                    </div>
                    <div className="text-[#242424] font-semibold mt-2">0.68 - Normal</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Índice EVI</div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-[#5db815]" style={{ width: '82%' }}></div>
                    </div>
                    <div className="text-[#242424] font-semibold mt-2">0.82 - Excelente</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#242424] mb-4 sm:mb-6">
                Análisis de índices de vegetación
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-[#898989] leading-relaxed mb-4 sm:mb-6">
                Calcula automáticamente NDVI, NDRE y EVI para cada área monitoreada. Visualiza la salud de tus cultivos con mapas de calor y gráficos de tendencias.
              </p>
              <p className="text-sm sm:text-base md:text-lg text-[#898989]">
                Compara el rendimiento entre diferentes campos y períodos. Identifica patrones y toma decisiones informadas basadas en datos científicos precisos.
              </p>
            </div>
          </div>
        </div>

        {/* Quote Section */}
        <div className="mt-16 sm:mt-24 max-w-4xl mx-auto text-center px-4 sm:px-0">
          <div className="bg-white rounded-2xl p-6 sm:p-8 md:p-12 border border-gray-200 shadow-lg">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-[#5db815] mx-auto mb-4 sm:mb-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.996 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.984zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
            </svg>
            <blockquote className="text-lg sm:text-xl md:text-2xl font-semibold text-[#242424] mb-4 sm:mb-6 leading-relaxed px-2">
              &ldquo;CoperniGeo ha transformado la forma en que monitoreamos nuestros cultivos. Los datos satelitales nos permiten tomar decisiones informadas y optimizar nuestra producción agrícola de manera nunca antes posible.&rdquo;
            </blockquote>
            <div className="flex items-center justify-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#5db815]/20 rounded-full flex items-center justify-center">
                <span className="text-[#5db815] font-bold text-base sm:text-lg">JM</span>
              </div>
              <div className="text-left">
                <div className="text-[#242424] font-semibold text-sm sm:text-base">Juan Martínez</div>
                <div className="text-[#898989] text-xs sm:text-sm">Agricultor, Agrícola del Valle</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#f4f3f4] border-t border-gray-300 -mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* CTA Section */}
          <div className="pb-12 sm:pb-16 mb-12 sm:mb-16 border-b border-gray-800">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 sm:gap-8">
              <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#242424] mb-3 sm:mb-4">
                ¿Listo para comenzar?
              </h2>
                <p className="text-base sm:text-lg md:text-xl text-[#898989]">
                Únete a agricultores y profesionales agrícolas que ya están optimizando sus cultivos con CoperniGeo.
              </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                {!loading && (
                  user ? (
                    <Link
                      href="/dashboard"
                      className="bg-[#5db815] text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg text-base sm:text-lg font-semibold hover:bg-[#4a9a11] transition-colors whitespace-nowrap text-center"
                    >
                      Ir a mi cuenta
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/registrarte"
                        className="bg-[#5db815] text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg text-base sm:text-lg font-semibold hover:bg-[#4a9a11] transition-colors whitespace-nowrap text-center"
                      >
                        Comenzar gratis
                      </Link>
                      <Link
                        href="/inicia-sesion"
                        className="bg-white text-[#242424] border border-gray-300 px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg text-base sm:text-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-colors whitespace-nowrap text-center"
                      >
                        Contactar ventas
                      </Link>
                    </>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8">
            {/* Features */}
            <div>
              <img src="/logo.svg" alt="CoperniGeo" className="h-24 sm:h-32 md:h-40 w-auto mb-4 sm:mb-6" />
            </div>

            {/* Product */}
            <div>
              <h3 className="text-gray-400 font-bold text-sm mb-4">Producto</h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/precios" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Precios
                  </Link>
                </li>
                <li>
                  <Link href="/especificaciones" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Especificaciones
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-gray-400 font-bold text-sm mb-4">Empresa</h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/sobre-nosotros" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Sobre nosotros
                  </Link>
                </li>
                <li>
                  <Link href="/clientes" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Clientes
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-gray-400 font-bold text-sm mb-4">Recursos</h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/dashboard/ayuda" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Ayuda
                  </Link>
                </li>
                <li>
                  <Link href="/guias" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Guías
                  </Link>
                </li>
                <li>
                  <Link href="/privacidad" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Privacidad
                  </Link>
                </li>
                <li>
                  <Link href="/terminos" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Términos
                  </Link>
                </li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h3 className="text-gray-400 font-bold text-sm mb-4">Conectar</h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/contacto" className="text-gray-400 hover:text-white transition-colors text-sm">
                    Contacto
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                    X (Twitter)
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
          className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center pt-12 overflow-hidden"
          onClick={() => setSelectedFeature(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div 
            className="bg-white rounded-t-2xl max-w-4xl w-full h-[calc(100vh-3rem)] shadow-2xl flex flex-col overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
            style={{ marginTop: '3rem' }}
          >
            {/* Close Button - Inside modal at top right */}
            <button
              onClick={() => setSelectedFeature(null)}
              className="absolute top-4 right-4 z-20 text-gray-600 hover:text-gray-900 transition-colors bg-white rounded-full p-2 hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Scrollable Content */}
            <div 
              className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db #f3f4f6' }}
            >
              {/* Icon - Part of scrollable content */}
              <div className="px-12 pt-8 pb-6 flex flex-col items-center">
                <div className="mb-6 flex items-center justify-center">
                  <div className="w-20 h-20 bg-[#5db815]/20 rounded-xl flex items-center justify-center">
                    {selectedFeatureData.id === "satellite" && (
                      <svg className="w-10 h-10 text-[#5db815]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 002 2h2.945M15 15v.01M20 12a8 8 0 11-16 0 8 8 0 0116 0z" />
                      </svg>
                    )}
                    {selectedFeatureData.id === "analysis" && (
                      <svg className="w-10 h-10 text-[#5db815]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    )}
                    {selectedFeatureData.id === "reports" && (
                      <svg className="w-10 h-10 text-[#5db815]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  <h2 className="text-4xl font-bold text-[#242424] text-center">{selectedFeatureData.detailedContent.heading}</h2>
                </div>

                {/* Text Content */}
                <div className="space-y-6">
                  {selectedFeatureData.detailedContent.paragraphs.map((paragraph, index) => (
                    <p key={index} className="text-[#898989] leading-relaxed text-lg">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {/* Statistics Section */}
                <div className="mt-16 grid grid-cols-3 gap-8">
                  {selectedFeatureData.detailedContent.statistics.map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="text-6xl font-bold text-[#242424] mb-2">{stat.value}</div>
                      <div className="text-gray-600 text-sm">{stat.label}</div>
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

