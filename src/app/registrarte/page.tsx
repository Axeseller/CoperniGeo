"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

export default function RegistrartePage() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { signup, user, loading: authLoading } = useAuth();
  const router = useRouter();

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

  const validateForm = (): boolean => {
    if (!email || !password || !confirmPassword) {
      setError("Por favor completa todos los campos requeridos");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Por favor ingresa un email válido");
      return false;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return false;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await signup(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      let errorMessage = "Error al crear la cuenta. Por favor intenta de nuevo.";
      
      if (err.code === "auth/email-already-in-use") {
        errorMessage = "Este email ya está registrado";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Email inválido";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "La contraseña es muy débil";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
        <div>
            <h2 className="text-center text-4xl font-bold text-[#242424] mb-2">
            Crear cuenta
          </h2>
            <p className="mt-2 text-center text-sm text-[#898989]">
            O{" "}
            <Link
              href="/inicia-sesion"
                className="font-medium text-[#5db815] hover:text-[#5db815] transition-colors"
            >
              inicia sesión si ya tienes cuenta
            </Link>
          </p>
        </div>
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
            <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
              <div className="space-y-5">
            <div>
                  <label htmlFor="nombre" className="block text-sm font-medium text-[#242424] mb-2">
                Nombre (opcional)
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 text-[#242424] placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5db815] focus:border-transparent transition-colors"
                placeholder="Tu nombre"
              />
            </div>
            <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#242424] mb-2">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 text-[#242424] placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5db815] focus:border-transparent transition-colors"
                placeholder="tu@email.com"
              />
            </div>
            <div>
                  <label htmlFor="password" className="block text-sm font-medium text-[#242424] mb-2">
                Contraseña *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 text-[#242424] placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5db815] focus:border-transparent transition-colors"
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#242424] mb-2">
                Confirmar contraseña *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 text-[#242424] placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5db815] focus:border-transparent transition-colors"
                placeholder="Confirma tu contraseña"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-base font-semibold rounded-lg text-white bg-[#5db815] hover:bg-[#4a9a11] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5db815] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creando cuenta..." : "Registrarte"}
            </button>
          </div>
        </form>
          </div>
        </div>
      </div>
    </div>
  );
}

