"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
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

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  // Hide navbar on dashboard pages
  const isDashboardPage = pathname?.startsWith('/dashboard');
  if (isDashboardPage) {
    return null;
  }

  return (
    <>
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
                  <Link 
                    href="/" 
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/') 
                        ? 'text-[#5db815]' 
                        : 'text-[#121212] hover:text-[#5db815]'
                    }`}
                  >
                    Producto
                  </Link>
                  <Link 
                    href="/precios" 
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/precios') 
                        ? 'text-[#5db815]' 
                        : 'text-[#121212] hover:text-[#5db815]'
                    }`}
                  >
                    Precios
                  </Link>
                  <Link 
                    href="/contacto" 
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/contacto') 
                        ? 'text-[#5db815]' 
                        : 'text-[#121212] hover:text-[#5db815]'
                    }`}
                  >
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
                  className={`block py-2 text-base font-medium transition-colors ${
                    isActive('/') 
                      ? 'text-[#5db815]' 
                      : 'text-[#121212] hover:text-[#5db815]'
                  }`}
                >
                  Producto
                </Link>
                <Link
                  href="/precios"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block py-2 text-base font-medium transition-colors ${
                    isActive('/precios') 
                      ? 'text-[#5db815]' 
                      : 'text-[#121212] hover:text-[#5db815]'
                  }`}
                >
                  Precios
                </Link>
                <Link
                  href="/contacto"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block py-2 text-base font-medium transition-colors ${
                    isActive('/contacto') 
                      ? 'text-[#5db815]' 
                      : 'text-[#121212] hover:text-[#5db815]'
                  }`}
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
    </>
  );
}

