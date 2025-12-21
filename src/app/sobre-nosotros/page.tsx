"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function SobreNosotrosPage() {
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
          <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
            <h1 className="text-4xl md:text-5xl font-bold text-[#242424] mb-6">Sobre Nosotros</h1>
            
            <div className="prose prose-lg max-w-none">
              <p className="text-[#898989] text-lg leading-relaxed mb-6">
                CoperniGeo es una plataforma innovadora de monitoreo satelital diseñada para ayudar a agricultores, 
                investigadores y empresas a tomar decisiones informadas basadas en datos precisos de imágenes satelitales.
              </p>

              <h2 className="text-2xl font-bold text-[#242424] mt-8 mb-4">Nuestra Misión</h2>
              <p className="text-[#898989] text-lg leading-relaxed mb-6">
                Democratizar el acceso a la tecnología de monitoreo satelital, proporcionando herramientas 
                accesibles y fáciles de usar que permitan a cualquier persona obtener insights valiosos sobre 
                sus tierras y cultivos.
              </p>

              <h2 className="text-2xl font-bold text-[#242424] mt-8 mb-4">Nuestra Visión</h2>
              <p className="text-[#898989] text-lg leading-relaxed mb-6">
                Ser la plataforma líder en monitoreo satelital para agricultura y gestión de tierras, 
                combinando tecnología de vanguardia con una experiencia de usuario excepcional.
              </p>

              <h2 className="text-2xl font-bold text-[#242424] mt-8 mb-4">Tecnología</h2>
              <p className="text-[#898989] text-lg leading-relaxed mb-6">
                Utilizamos datos de satélites Sentinel-2 de la Agencia Espacial Europea (ESA) y Google Earth Engine 
                para proporcionar análisis precisos de índices de vegetación como NDVI, NDRE y EVI. Nuestra plataforma 
                procesa millones de píxeles de datos satelitales para ofrecerte insights accionables en tiempo real.
              </p>

              <h2 className="text-2xl font-bold text-[#242424] mt-8 mb-4">Equipo</h2>
              <p className="text-[#898989] text-lg leading-relaxed mb-6">
                Somos un equipo apasionado de ingenieros, científicos de datos y expertos en agricultura, 
                comprometidos con hacer que la tecnología satelital sea accesible para todos.
              </p>
            </div>

            <div className="mt-12">
              <Link
                href="/contacto"
                className="inline-block bg-[#5db815] text-white px-6 py-3 rounded-md font-medium hover:bg-[#4a9a11] transition-colors"
              >
                Contáctanos
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

