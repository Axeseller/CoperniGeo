"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getUserPlan } from "@/lib/firestore/plans";
import { UserPlan } from "@/types/plan";
import { getAuth } from "firebase/auth";
import { getDb } from "@/lib/firebase";
import { doc, getDoc, collection, onSnapshot, query, where } from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";

function CuentaYPlanContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [hasStripeSubscription, setHasStripeSubscription] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
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

  useEffect(() => {
    if (!user) {
      setHasStripeSubscription(false);
      setSubscriptionData(null);
      return;
    }

    const db = getDb();
    let unsubscribeCustomer: (() => void) | null = null;
    let unsubscribeSubscriptions: (() => void) | null = null;

    const customerRef = doc(db, "customers", user.uid);
    
    unsubscribeCustomer = onSnapshot(
      customerRef,
      (customerDoc) => {
        if (customerDoc.exists()) {
          setHasStripeSubscription(true);

          const subscriptionsRef = collection(db, "customers", user.uid, "subscriptions");
          const subscriptionsQuery = query(
            subscriptionsRef,
            where("status", "in", ["active", "trialing", "past_due"])
          );

          if (unsubscribeSubscriptions) {
            unsubscribeSubscriptions();
          }

          unsubscribeSubscriptions = onSnapshot(
            subscriptionsQuery,
            (snapshot: any) => {
              if (!snapshot.empty) {
                const subData = snapshot.docs[0].data();
                setSubscriptionData(subData);
                setHasStripeSubscription(true);
              } else {
                setSubscriptionData(null);
                setHasStripeSubscription(true);
              }
            },
            (error: any) => {
              console.error("[Cuenta y Plan] Error listening to subscriptions:", error);
            }
          );
        } else {
          setHasStripeSubscription(false);
          setSubscriptionData(null);
          if (unsubscribeSubscriptions) {
            unsubscribeSubscriptions();
            unsubscribeSubscriptions = null;
          }
        }
      },
      (error: any) => {
        console.error("[Cuenta y Plan] Error listening to customer:", error);
      }
    );

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
      const refreshToken = async () => {
        try {
          const auth = getAuth();
          await auth.currentUser?.getIdToken(true);
        } catch (error) {
          console.error("Error refreshing auth token:", error);
        }
      };
      refreshToken();
    }
  }, [user, isSuccess]);

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

      window.location.href = data.url;
    } catch (error: any) {
      console.error("Error opening customer portal:", error);
      alert(error.message || "Error al abrir el portal de cliente. Por favor intenta de nuevo.");
      setOpeningPortal(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  // Determine current plan status
  const getCurrentPlanInfo = () => {
    if (hasStripeSubscription) {
      return {
        name: "Avanzado",
        description: "Áreas ilimitadas, reportes ilimitados, todos los índices satelitales",
        isActive: true,
      };
    }
    if (userPlan?.planType === "basic") {
      return {
        name: "Básico",
        description: "Hasta 3 áreas, 5 reportes mensuales, índices estándar",
        isActive: true,
      };
    }
    return {
      name: "Sin plan",
      description: "Selecciona un plan para comenzar",
      isActive: false,
    };
  };

  const planInfo = getCurrentPlanInfo();

  return (
    <div className="space-y-6">
      {/* Account Card */}
      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#242424] mb-2">Cuenta</h2>
            <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
              <p className="text-sm text-[#898989] mb-1">Email</p>
              <p className="text-[#242424] font-medium">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-[#898989] hover:text-[#242424] text-sm transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </Card>

      {/* Plan Card */}
      <Card>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#242424] mb-2">Plan actual</h2>
            {loading ? (
              <div className="text-center py-4">
                <p className="text-[#898989]">Cargando información del plan...</p>
              </div>
            ) : (
              <>
                {isSuccess && !hasStripeSubscription && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-800 font-medium text-sm">
                      ¡Pago exitoso! Tu suscripción está siendo procesada.
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <p className="text-lg font-medium text-[#242424]">{planInfo.name}</p>
                    <p className="text-sm text-[#898989] mt-1">{planInfo.description}</p>
                  </div>
                  {hasStripeSubscription && subscriptionData?.current_period_end && (
                    <p className="text-sm text-[#898989]">
                      Próxima renovación:{" "}
                      {new Date(subscriptionData.current_period_end.seconds * 1000).toLocaleDateString("es-MX")}
                    </p>
                  )}
                  {!planInfo.isActive ? (
                    <Link
                      href="/precios"
                      className="inline-block bg-[#5db815] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#4a9a11] transition-colors"
                    >
                      Ver planes disponibles
                    </Link>
                  ) : hasStripeSubscription ? (
                    <button
                      onClick={handleOpenCustomerPortal}
                      disabled={openingPortal}
                      className="bg-[#5db815] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#4a9a11] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {openingPortal ? "Abriendo portal..." : "Gestionar suscripción"}
                    </button>
                  ) : userPlan?.planType === "basic" ? (
                    <Link
                      href="/precios"
                      className="inline-block bg-[#5db815] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#4a9a11] transition-colors"
                    >
                      Actualizar a plan Avanzado
                    </Link>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function CuentaYPlanPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Card>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5db815] mx-auto"></div>
              <p className="mt-4 text-[#898989]">Cargando...</p>
            </div>
          </Card>
        </div>
      }
    >
      <CuentaYPlanContent />
    </Suspense>
  );
}


