"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

type Step = "form" | "thankyou";

export default function PlanBasicoPage() {
  const [step, setStep] = useState<Step>("form");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [remainingSpots, setRemainingSpots] = useState<number | null>(null);
  
  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedbackAgreement, setFeedbackAgreement] = useState(false);
  const [cropType, setCropType] = useState("");
  const [hectares, setHectares] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { user, signup } = useAuth();
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

  useEffect(() => {
    // Fetch remaining spots
    fetch('/api/plans/basic-spots')
      .then(res => res.json())
      .then(data => {
        if (data.remaining !== undefined) {
          setRemainingSpots(data.remaining);
          if (data.remaining <= 0) {
            setError("Lo sentimos, no hay espacios disponibles para el plan básico.");
          }
        }
      })
      .catch(err => {
        console.error('Error fetching remaining spots:', err);
      });
  }, []);

  // Pre-fill email if user is logged in
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const validateForm = (): boolean => {
    if (!user && (!email || !password || !confirmPassword)) {
      setError("Por favor completa todos los campos requeridos");
      return false;
    }

    if (!user) {
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
    }

    if (!feedbackAgreement) {
      setError("Debes aceptar proporcionar retroalimentación para mantener tu acceso gratuito");
      return false;
    }

    if (!cropType || cropType.trim() === "") {
      setError("Por favor indica el tipo de cultivo");
      return false;
    }

    if (!hectares || parseFloat(hectares) <= 0) {
      setError("Por favor indica un número válido de hectáreas");
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

    if (remainingSpots !== null && remainingSpots <= 0) {
      setError("No hay espacios disponibles");
      return;
    }

    setLoading(true);
    try {
      let userId = user?.uid;

      // Create account if user is not logged in
      if (!userId) {
        // Import Firebase auth to get user from signup result
        const { getAuthInstance } = await import("@/lib/firebase");
        const { createUserWithEmailAndPassword } = await import("firebase/auth");
        const auth = getAuthInstance();
        
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        userId = userCredential.user.uid;
      }

      // Sign up for basic plan
      const response = await fetch('/api/plans/signup-basic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          feedbackAgreement,
          cropType: cropType.trim(),
          hectares: parseFloat(hectares),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al asignar el plan básico");
      }

      // Success - show thank you
      setStep("thankyou");
    } catch (err: any) {
      let errorMessage = "Error al procesar tu solicitud. Por favor intenta de nuevo.";
      
      if (err.code === "auth/email-already-in-use") {
        errorMessage = "Este email ya está registrado. Por favor inicia sesión.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Email inválido";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "La contraseña es muy débil";
      } else if (err.message) {
        errorMessage = err.message;
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
                  <Link href="/precios" className="text-[#5db815] px-3 py-2 rounded-md text-sm font-medium">
                    Precios
                  </Link>
                  <Link href="/contacto" className="text-[#121212] hover:text-[#5db815] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    Contacto
                  </Link>
                </div>
              </div>
              <div className="flex items-center space-x-2 md:space-x-4">
                {!user && (
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
                )}
                {user && (
                  <Link
                    href="/dashboard"
                    className="bg-[#5db815] text-white px-3 md:px-4 py-2 rounded-md text-sm font-medium hover:bg-[#4a9a11] transition-colors"
                  >
                    Dashboard
                  </Link>
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
                  className="block text-[#5db815] py-2 text-base font-medium"
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
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {step === "form" ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-[#121212] mb-4">
                  Plan Básico Gratis
                </h1>
                <p className="text-lg text-gray-600">
                  {remainingSpots !== null && remainingSpots > 0 ? (
                    <span className="text-[#5db815] font-semibold">
                      {remainingSpots} espacios disponibles
                    </span>
                  ) : remainingSpots === 0 ? (
                    <span className="text-red-600 font-semibold">
                      No hay espacios disponibles
                    </span>
                  ) : (
                    "Carga..."
                  )}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                      {error}
                    </div>
                  )}

                  {!user && (
                    <>
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
                    </>
                  )}

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-[#242424] mb-4">
                      Información sobre tu operación
                    </h3>

                    <div className="mb-6">
                      <label htmlFor="cropType" className="block text-sm font-medium text-[#242424] mb-2">
                        Tipo de cultivo *
                      </label>
                      <input
                        id="cropType"
                        name="cropType"
                        type="text"
                        required
                        value={cropType}
                        onChange={(e) => setCropType(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 text-[#242424] placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5db815] focus:border-transparent transition-colors"
                        placeholder="Ej: Maíz, Trigo, Soja, etc."
                      />
                    </div>

                    <div className="mb-6">
                      <label htmlFor="hectares" className="block text-sm font-medium text-[#242424] mb-2">
                        Hectáreas *
                      </label>
                      <input
                        id="hectares"
                        name="hectares"
                        type="number"
                        min="0"
                        step="0.1"
                        required
                        value={hectares}
                        onChange={(e) => setHectares(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 text-[#242424] placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5db815] focus:border-transparent transition-colors"
                        placeholder="Ej: 50"
                      />
                    </div>

                    <div className="flex items-start">
                      <input
                        id="feedbackAgreement"
                        name="feedbackAgreement"
                        type="checkbox"
                        required
                        checked={feedbackAgreement}
                        onChange={(e) => setFeedbackAgreement(e.target.checked)}
                        className="mt-1 h-4 w-4 text-[#5db815] focus:ring-[#5db815] border-gray-300 rounded"
                      />
                      <label htmlFor="feedbackAgreement" className="ml-3 text-sm text-[#242424]">
                        Acepto proporcionar retroalimentación para ayudar a mejorar CoperniGeo y mantener mi acceso gratuito por 1 año. *
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || (remainingSpots !== null && remainingSpots <= 0)}
                    className="w-full flex justify-center py-3 px-4 border border-transparent text-base font-semibold rounded-lg text-white bg-[#5db815] hover:bg-[#4a9a11] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5db815] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? "Procesando..." : "Obtener Plan Básico Gratis"}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="mb-6">
                <svg
                  className="mx-auto h-16 w-16 text-[#5db815]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-[#121212] mb-4">
                ¡Gracias por unirte!
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Tu plan básico gratuito ha sido activado. Tienes acceso completo por 1 año.
              </p>
              <p className="text-gray-600 mb-8">
                Recuerda que para mantener tu acceso gratuito, nos ayudarás proporcionando retroalimentación sobre tu experiencia con CoperniGeo.
              </p>
              <Link
                href="/dashboard"
                className="inline-block bg-[#5db815] text-white px-8 py-3 rounded-md text-lg font-medium hover:bg-[#4a9a11] transition-colors"
              >
                Ir al Dashboard
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

