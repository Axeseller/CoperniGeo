"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function PrivacidadPage() {
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
            <h1 className="text-4xl md:text-5xl font-bold text-[#242424] mb-6">Política de Privacidad</h1>
            
            <div className="prose prose-lg max-w-none">
              <p className="text-[#898989] text-sm mb-8">Última actualización: Enero 2025</p>

              <h2 className="text-2xl font-bold text-[#242424] mt-8 mb-4">1. Información que Recopilamos</h2>
              <p className="text-[#898989] text-lg leading-relaxed mb-6">
                Recopilamos información que nos proporcionas directamente, como cuando creas una cuenta, 
                configuras áreas de interés, o te comunicas con nosotros. Esto incluye nombre, dirección 
                de correo electrónico, información de pago y datos de tus áreas de monitoreo.
              </p>

              <h2 className="text-2xl font-bold text-[#242424] mt-8 mb-4">2. Cómo Usamos tu Información</h2>
              <p className="text-[#898989] text-lg leading-relaxed mb-6">
                Utilizamos la información recopilada para proporcionar, mantener y mejorar nuestros servicios, 
                procesar transacciones, enviar notificaciones sobre tu cuenta y reportes, y comunicarnos 
                contigo sobre productos y servicios que puedan ser de tu interés.
              </p>

              <h2 className="text-2xl font-bold text-[#242424] mt-8 mb-4">3. Compartir Información</h2>
              <p className="text-[#898989] text-lg leading-relaxed mb-6">
                No vendemos tu información personal. Podemos compartir información con proveedores de 
                servicios que nos ayudan a operar nuestra plataforma, siempre bajo estrictos acuerdos de 
                confidencialidad. También podemos divulgar información si es requerido por ley.
              </p>

              <h2 className="text-2xl font-bold text-[#242424] mt-8 mb-4">4. Seguridad de Datos</h2>
              <p className="text-[#898989] text-lg leading-relaxed mb-6">
                Implementamos medidas de seguridad técnicas y organizativas apropiadas para proteger tu 
                información personal contra acceso no autorizado, alteración, divulgación o destrucción.
              </p>

              <h2 className="text-2xl font-bold text-[#242424] mt-8 mb-4">5. Tus Derechos</h2>
              <p className="text-[#898989] text-lg leading-relaxed mb-6">
                Tienes derecho a acceder, corregir, eliminar o portar tu información personal. También 
                puedes optar por no recibir comunicaciones de marketing. Para ejercer estos derechos, 
                contáctanos a través de nuestro formulario de contacto.
              </p>

              <h2 className="text-2xl font-bold text-[#242424] mt-8 mb-4">6. Contacto</h2>
              <p className="text-[#898989] text-lg leading-relaxed mb-6">
                Si tienes preguntas sobre esta política de privacidad, puedes contactarnos a través de 
                nuestro <Link href="/contacto" className="text-[#5db815] hover:underline">formulario de contacto</Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

