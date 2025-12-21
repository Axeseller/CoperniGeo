"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function NotFound() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();

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
                {!authLoading && (
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
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed top-16 right-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-xl z-50 md:hidden transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full">
              <div className="p-6 space-y-4 overflow-y-auto">
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-[#121212] hover:text-[#5db815] py-2 text-base font-medium transition-colors"
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
                {!authLoading && (
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

      {/* 404 Content */}
      <div className="flex items-center justify-center min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-[#5db815]/10 rounded-full mb-6">
              <svg className="w-12 h-12 text-[#5db815]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-6xl md:text-7xl font-bold text-[#121212] mb-4">404</h1>
            <h2 className="text-3xl md:text-4xl font-bold text-[#121212] mb-4">
              Página no encontrada
            </h2>
            <p className="text-xl text-[#898989] mb-8">
              Esta página aún no está disponible. Estamos trabajando en ello y estará disponible pronto.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <p className="text-[#898989] mb-6">
              Mientras tanto, puedes explorar otras secciones de nuestro sitio o contactarnos si tienes alguna pregunta.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="bg-[#5db815] text-white px-6 py-3 rounded-md font-medium hover:bg-[#4a9a11] transition-colors"
              >
                Volver al inicio
              </Link>
              <Link
                href="/contacto"
                className="border border-[#5db815] text-[#5db815] px-6 py-3 rounded-md font-medium hover:bg-[#5db815] hover:text-white transition-colors"
              >
                Contactarnos
              </Link>
            </div>
          </div>

          <p className="text-sm text-[#898989]">
            ¿Quieres ser notificado cuando esta página esté disponible?{" "}
            <Link href="/contacto" className="text-[#5db815] hover:underline">
              Contáctanos
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

