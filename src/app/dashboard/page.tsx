"use client";

import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-[#242424] mb-6">
        Bienvenido a CoperniGeo
      </h1>
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <p className="text-[#898989] mb-4">
          Hola {user?.email}, bienvenido a tu panel de control.
        </p>
        <p className="text-[#898989] mb-4">
          Desde aquí podrás acceder a todas las funcionalidades de monitoreo de
          cultivos por satélite.
        </p>
        <div className="mt-6 space-y-4">
          <h2 className="text-xl font-semibold text-[#242424]">
            Funcionalidades disponibles:
          </h2>
          <ul className="list-disc list-inside space-y-2 text-[#898989]">
            <li>
              <strong className="text-[#242424]">Planes:</strong> Gestiona tu suscripción y planes de
              pago
            </li>
            <li>
              <strong className="text-[#242424]">Cuenta:</strong> Administra tu información personal
            </li>
            <li>
              <strong className="text-[#242424]">Ayuda:</strong> Encuentra respuestas a preguntas
              frecuentes y recursos
            </li>
            <li>
              <strong className="text-[#242424]">Imágenes:</strong> Visualiza imágenes satelitales de tus
              campos
            </li>
            <li>
              <strong className="text-[#242424]">Automatizar reportes:</strong> Configura reportes
              automáticos de NDVI
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

