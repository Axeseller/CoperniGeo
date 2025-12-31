"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { getDb } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getUserPlan } from "@/lib/firestore/plans";

export default function PlanRequired({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [hasPlan, setHasPlan] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPlan = async () => {
      if (!user) {
        setHasPlan(false);
        setLoading(false);
        return;
      }

      try {
        // Check for basic plan
        const userPlan = await getUserPlan(user.uid);
        if (userPlan && userPlan.status === "active") {
          setHasPlan(true);
          setLoading(false);
          return;
        }

        // Check for Stripe subscription
        const db = getDb();
        const customerDoc = await getDoc(doc(db, "customers", user.uid));
        if (customerDoc.exists()) {
          // Check for active subscription
          const { collection, getDocs, query, where } = await import("firebase/firestore");
          const subscriptionsQuery = query(
            collection(db, "customers", user.uid, "subscriptions"),
            where("status", "in", ["active", "trialing"])
          );
          const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
          
          if (!subscriptionsSnapshot.empty) {
            setHasPlan(true);
            setLoading(false);
            return;
          }
        }

        setHasPlan(false);
      } catch (error) {
        console.error("Error checking plan:", error);
        setHasPlan(false);
      } finally {
        setLoading(false);
      }
    };

    checkPlan();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[#898989]">Cargando...</p>
      </div>
    );
  }

  if (!hasPlan) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] w-full">
        <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200 text-center max-w-2xl w-full mx-auto">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#121212] mb-4">
              Plan Requerido
            </h2>
            <p className="text-lg text-[#898989] mb-6">
              Necesitas una suscripción activa para acceder a esta funcionalidad.
            </p>
            <p className="text-[#898989] mb-8">
              Suscríbete a uno de nuestros planes para comenzar a usar todas las funcionalidades de CoperniGeo.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/precios"
              className="bg-[#5db815] text-white px-8 py-3 rounded-md font-medium hover:bg-[#4a9a11] transition-colors"
            >
              Ver Planes y Precios
            </Link>
            <Link
              href="/dashboard/planes"
              className="border border-[#5db815] text-[#5db815] px-8 py-3 rounded-md font-medium hover:bg-[#5db815] hover:text-white transition-colors"
            >
              Gestionar Mi Plan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

