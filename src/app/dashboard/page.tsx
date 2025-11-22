"use client";

import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Bienvenido a CoperniGeo
      </h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600 mb-4">
          Hola {user?.email}, bienvenido a tu panel de control.
        </p>
        <p className="text-gray-600 mb-4">
          Desde aquí podrás acceder a todas las funcionalidades de monitoreo de
          cultivos por satélite.
        </p>
        <div className="mt-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Funcionalidades disponibles:
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>
              <strong>Planes:</strong> Gestiona tu suscripción y planes de
              pago
            </li>
            <li>
              <strong>Cuenta:</strong> Administra tu información personal
            </li>
            <li>
              <strong>Ayuda:</strong> Encuentra respuestas a preguntas
              frecuentes y recursos
            </li>
            <li>
              <strong>Imágenes:</strong> Visualiza imágenes satelitales de tus
              campos
            </li>
            <li>
              <strong>Automatizar reportes:</strong> Configura reportes
              automáticos de NDVI
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

