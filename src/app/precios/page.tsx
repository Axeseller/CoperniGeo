"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getAuth } from "firebase/auth";

function StripeCheckoutButton() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Require authentication before checkout
    if (!user) {
      // Redirect to signup page, then create checkout session after signup
      router.push(`/registrarte?returnUrl=${encodeURIComponent("/precios")}`);
      return;
    }

    setIsLoading(true);
    try {
      // Get auth token
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      // Get the current origin (for redirect URLs)
      const origin = window.location.origin;

      // Create checkout session via API
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ origin }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Open checkout in a new tab
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      alert(error.message || "Error al crear la sesión de pago. Por favor intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={isLoading}
      className="block w-full text-center px-6 py-3 rounded-md text-sm font-medium transition-colors bg-[#5db815] text-white hover:bg-[#4a9a11] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? "Cargando..." : "Suscribirse"}
    </button>
  );
}

export default function PreciosPage() {
  const [remainingSpots, setRemainingSpots] = useState<number | null>(null);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Fetch remaining basic plan spots
    fetch('/api/plans/basic-spots')
      .then(res => res.json())
      .then(data => {
        if (data.remaining !== undefined) {
          setRemainingSpots(data.remaining);
        }
      })
      .catch(err => {
        console.error('Error fetching remaining spots:', err);
      });
  }, []);

  const handleBasicPlanClick = () => {
    router.push('/precios/plan-basico');
  };

  const plans = [
    {
      name: "Básico",
      price: "Gratis",
      period: "1 año",
      description: "Perfecto para empezar a explorar",
      features: [
        "Hasta 3 áreas de interés",
        "5 reportes mensuales",
        "Índices: NDVI, NDRE, EVI",
        "Resolución estándar",
        "Soporte por email",
      ],
      cta: "Comenzar gratis",
      highlighted: false,
      onClick: handleBasicPlanClick,
      badge: remainingSpots !== null && remainingSpots > 0 
        ? `${remainingSpots} espacios disponibles` 
        : null,
    },
    {
      name: "Avanzado",
      price: "$2,000",
      period: "año",
      description: "Para equipos y proyectos serios",
      features: [
        "Áreas ilimitadas",
        "Reportes ilimitados",
        "Todos los índices satelitales",
        "Resolución alta",
        "Reportes automatizados",
        "Análisis histórico",
        "Soporte prioritario",
        "Exportación de datos",
      ],
      cta: "Suscribirse",
      highlighted: true,
      useStripeCheckout: true, // Flag to use Stripe checkout
    },
    {
      name: "Empresarial",
      price: "Personalizado",
      period: "",
      description: "Soluciones a medida para tu organización",
      features: [
        "Todo lo de Avanzado",
        "API dedicada",
        "Integración personalizada",
        "Análisis avanzado con IA",
        "SLA garantizado",
        "Gestor de cuenta dedicado",
        "Capacitación del equipo",
        "Facturación personalizada",
      ],
      cta: "Contactar ventas",
      highlighted: false,
      onClick: () => router.push('/contacto'),
    },
  ];

  return (
    <div className="min-h-screen bg-[#f4f3f4]">
      {/* Hero Section */}
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[#121212] mb-4">
            Planes y Precios
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Elige el plan perfecto para tus necesidades. Comienza gratis y escala cuando lo necesites.
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-105 ${
                  plan.highlighted ? 'ring-2 ring-[#5db815]' : ''
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 right-0 bg-[#5db815] text-white px-4 py-1 text-sm font-semibold">
                    Popular
                  </div>
                )}
                {plan.badge && (
                  <div className="absolute top-0 left-0 bg-yellow-400 text-yellow-900 px-4 py-1 text-xs font-semibold">
                    {plan.badge}
                  </div>
                )}
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-[#121212] mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 mb-6">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-[#121212]">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-gray-600 ml-2">/ {plan.period}</span>
                    )}
                  </div>
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start">
                        <svg
                          className="w-5 h-5 text-[#5db815] mr-3 mt-0.5 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.useStripeCheckout ? (
                    <StripeCheckoutButton />
                  ) : (
                    <button
                      onClick={plan.onClick}
                      className={`block w-full text-center px-6 py-3 rounded-md text-sm font-medium transition-colors ${
                        plan.highlighted
                          ? 'bg-[#5db815] text-white hover:bg-[#4a9a11]'
                          : 'bg-gray-100 text-[#121212] hover:bg-gray-200'
                      }`}
                    >
                      {plan.cta}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-[#121212] mb-8 text-center">
            Preguntas Frecuentes
          </h2>
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-[#121212] mb-2">
                ¿Puedo cambiar de plan en cualquier momento?
              </h3>
              <p className="text-gray-600">
                Sí, puedes actualizar o degradar tu plan en cualquier momento. Los cambios se reflejan inmediatamente y ajustamos el cobro proporcionalmente.
              </p>
            </div>
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-[#121212] mb-2">
                ¿Qué métodos de pago aceptan?
              </h3>
              <p className="text-gray-600">
                Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express) y transferencias bancarias para planes empresariales.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-[#5db815] py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            ¿Listo para comenzar?
          </h2>
          <p className="text-lg text-white/90 mb-8">
            Únete a cientos de agricultores y agrónomos que ya confían en CoperniGeo
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/registrarte"
              className="bg-white text-[#5db815] px-8 py-3 rounded-md text-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Comenzar gratis
            </Link>
            <Link
              href="/contacto"
              className="bg-[#4a9a11] text-white px-8 py-3 rounded-md text-lg font-medium hover:bg-[#3a7a0a] transition-colors"
            >
              Contactar ventas
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

