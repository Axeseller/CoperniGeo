"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserPlan } from "@/lib/firestore/plans";
import { UserPlan } from "@/types/plan";
import { getAuth } from "firebase/auth";
import { getDb } from "@/lib/firebase";
import { doc, getDoc, collection, onSnapshot, query, where } from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function PlanesContent() {
  const { user } = useAuth();
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);
  const searchParams = useSearchParams();
  const isSuccess = searchParams?.get("success") === "true";

  useEffect(() => {
    if (user) {
      getUserPlan(user.uid)
        .then((plan) => {
          setUserPlan(plan);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching user plan:", error);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleOpenCustomerPortal = async () => {
    if (!user) return;

    setOpeningPortal(true);
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to open customer portal");
      }

      // Redirect to Stripe customer portal
      window.location.href = data.url;
    } catch (error: any) {
      console.error("Error opening customer portal:", error);
      alert(error.message || "Error al abrir el portal de cliente. Por favor intenta de nuevo.");
      setOpeningPortal(false);
    }
  };

  // Check if user has Stripe subscription (avanzado or empresarial)
  const [hasStripeSubscription, setHasStripeSubscription] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  // Use real-time listener for subscription changes
  useEffect(() => {
    if (!user) {
      setHasStripeSubscription(false);
      setSubscriptionData(null);
      return;
    }

    const db = getDb();
    let unsubscribeCustomer: (() => void) | null = null;
    let unsubscribeSubscriptions: (() => void) | null = null;

    // Listen to customer document in real-time
    const customerRef = doc(db, "customers", user.uid);
    
    unsubscribeCustomer = onSnapshot(
      customerRef,
      (customerDoc) => {
        if (customerDoc.exists()) {
          console.log("[Planes] Customer document exists, setting up subscription listener");
          setHasStripeSubscription(true);

          // Set up real-time listener for subscriptions
          const subscriptionsRef = collection(db, "customers", user.uid, "subscriptions");
          const subscriptionsQuery = query(
            subscriptionsRef,
            where("status", "in", ["active", "trialing", "past_due"])
          );

          // Unsubscribe from previous subscription listener if it exists
          if (unsubscribeSubscriptions) {
            unsubscribeSubscriptions();
          }

          unsubscribeSubscriptions = onSnapshot(
            subscriptionsQuery,
            (snapshot: any) => {
              console.log("[Planes] Subscription snapshot update:", snapshot.size, "subscriptions");
              if (!snapshot.empty) {
                const subData = snapshot.docs[0].data();
                setSubscriptionData(subData);
                setHasStripeSubscription(true);
                console.log("[Planes] Subscription updated via real-time listener:", subData);
              } else {
                setSubscriptionData(null);
                setHasStripeSubscription(true); // Customer exists, just no active subscription
              }
            },
            (error: any) => {
              console.error("[Planes] Error listening to subscriptions:", error);
            }
          );
        } else {
          console.log("[Planes] Customer document does not exist yet");
          setHasStripeSubscription(false);
          setSubscriptionData(null);
          // Unsubscribe from subscriptions if customer no longer exists
          if (unsubscribeSubscriptions) {
            unsubscribeSubscriptions();
            unsubscribeSubscriptions = null;
          }
        }
      },
      (error: any) => {
        console.error("[Planes] Error listening to customer:", error);
      }
    );

    // Cleanup function
    return () => {
      if (unsubscribeCustomer) {
        unsubscribeCustomer();
      }
      if (unsubscribeSubscriptions) {
        unsubscribeSubscriptions();
      }
    };
  }, [user]);

  useEffect(() => {
    if (user && isSuccess) {
      // If coming from successful payment, refresh auth token to get updated custom claims
      const refreshToken = async () => {
        try {
          const auth = getAuth();
          await auth.currentUser?.getIdToken(true); // Force refresh
          console.log("[Planes] Auth token refreshed after successful payment");
        } catch (error) {
          console.error("Error refreshing auth token:", error);
        }
      };
      refreshToken();
    }
  }, [user, isSuccess]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-[#242424] mb-6">Planes y Precios</h1>
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        {isSuccess && !hasStripeSubscription && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 font-medium">
              ¡Pago exitoso! Tu suscripción está siendo procesada. Si no aparece inmediatamente, espera unos segundos mientras se actualiza.
            </p>
          </div>
        )}
        <p className="text-[#898989] mb-4">
          Aquí podrás gestionar tu suscripción y planes de pago.
        </p>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-[#898989]">Cargando información del plan...</p>
          </div>
        ) : hasStripeSubscription ? (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Plan Activo</h3>
              <p className="text-blue-800 mb-2">
                Tienes una suscripción activa al plan <strong>Avanzado</strong>.
              </p>
              {subscriptionData && (
                <div className="mt-3 space-y-1 text-sm text-blue-700">
                  {subscriptionData.status && (
                    <p>Estado: <span className="font-medium capitalize">{subscriptionData.status}</span></p>
                  )}
                  {subscriptionData.current_period_end && (
                    <p>
                      Próxima renovación:{" "}
                      <span className="font-medium">
                        {new Date(subscriptionData.current_period_end.seconds * 1000).toLocaleDateString("es-MX")}
                      </span>
                    </p>
                  )}
                </div>
              )}
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleOpenCustomerPortal}
                  disabled={openingPortal}
                  className="bg-[#5db815] text-white px-6 py-3 rounded-md font-medium hover:bg-[#4a9a11] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {openingPortal ? "Abriendo portal..." : "Gestionar Suscripción"}
                </button>
                <Link
                  href="/precios"
                  className="border border-[#5db815] text-[#5db815] px-6 py-3 rounded-md font-medium hover:bg-[#5db815] hover:text-white transition-colors"
                >
                  Ver Todos los Planes
                </Link>
              </div>
              <p className="text-sm text-blue-700 mt-3">
                Puedes gestionar tu suscripción, actualizar tu método de pago y ver tu historial de facturación desde el portal de cliente.
              </p>
            </div>
          </div>
        ) : userPlan?.planType === "basic" ? (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 mb-4">
                Tienes el plan Básico activo. Para acceder a más funcionalidades, puedes actualizar a un plan de pago.
              </p>
              <Link
                href="/precios"
                className="inline-block bg-[#5db815] text-white px-6 py-3 rounded-md font-medium hover:bg-[#4a9a11] transition-colors"
              >
                Ver Planes Disponibles
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-gray-800 mb-4">
                No tienes un plan activo. Selecciona un plan para comenzar a usar CoperniGeo.
              </p>
              <Link
                href="/precios"
                className="inline-block bg-[#5db815] text-white px-6 py-3 rounded-md font-medium hover:bg-[#4a9a11] transition-colors"
              >
                Ver Planes Disponibles
              </Link>
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-[#242424] mb-4">Planes Disponibles</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-[#242424] mb-2">Plan Básico</h3>
              <p className="text-2xl font-bold text-[#5db815] mb-2">Gratis</p>
              <p className="text-[#898989] text-sm mb-4">1 año</p>
              <ul className="text-[#898989] space-y-2 text-sm mb-4">
                <li>• Hasta 3 áreas de interés</li>
                <li>• 5 reportes mensuales</li>
                <li>• Índices: NDVI, NDRE, EVI</li>
                <li>• Resolución estándar</li>
              </ul>
              {userPlan?.planType === "basic" && (
                <span className="text-sm text-[#5db815] font-medium">Plan Actual</span>
              )}
            </div>
            <div className="border border-[#5db815] rounded-lg p-6">
              <h3 className="text-lg font-semibold text-[#242424] mb-2">Plan Avanzado</h3>
              <p className="text-2xl font-bold text-[#5db815] mb-2">$2,000 MXN</p>
              <p className="text-[#898989] text-sm mb-4">por año</p>
              <ul className="text-[#898989] space-y-2 text-sm mb-4">
                <li>• Áreas ilimitadas</li>
                <li>• Reportes ilimitados</li>
                <li>• Todos los índices satelitales</li>
                <li>• Resolución alta</li>
                <li>• Reportes automatizados</li>
                <li>• Soporte prioritario</li>
              </ul>
              <Link
                href="/precios"
                className="block w-full text-center bg-[#5db815] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#4a9a11] transition-colors"
              >
                {hasStripeSubscription ? "Ver Detalles" : "Suscribirse"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlanesPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl">
        <h1 className="text-3xl font-bold text-[#242424] mb-6">Planes y Precios</h1>
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5db815] mx-auto"></div>
            <p className="mt-4 text-[#898989]">Cargando...</p>
          </div>
        </div>
      </div>
    }>
      <PlanesContent />
    </Suspense>
  );
}

