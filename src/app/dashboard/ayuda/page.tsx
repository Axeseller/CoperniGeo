"use client";

import { useState } from "react";

export default function AyudaPage() {
  const [sugerencia, setSugerencia] = useState("");
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Sugerencia de funcionalidad:", sugerencia);
    setSugerencia("");
    setEnviado(true);
    setTimeout(() => setEnviado(false), 3000);
  };

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Ayuda y Recursos</h1>

      {/* FAQ Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Preguntas Frecuentes
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ¿Qué es CoperniGeo?
            </h3>
            <p className="text-gray-600">
              CoperniGeo es una plataforma de monitoreo agrícola que utiliza
              imágenes satelitales para ayudarte a gestionar tus cultivos de
              manera más eficiente.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ¿Cómo funcionan las imágenes satelitales?
            </h3>
            <p className="text-gray-600">
              Utilizamos datos del programa Copernicus y Google Earth Engine
              para proporcionar imágenes actualizadas de tus campos, permitiendo
              el análisis de índices como NDVI.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ¿Puedo definir múltiples áreas?
            </h3>
            <p className="text-gray-600">
              Sí, puedes definir múltiples áreas con coordenadas específicas.
              El número de áreas depende de tu plan de suscripción.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ¿Con qué frecuencia se actualizan las imágenes?
            </h3>
            <p className="text-gray-600">
              Las imágenes se actualizan según la disponibilidad de los
              satélites, generalmente cada 5-7 días. Puedes configurar reportes
              automáticos para recibir actualizaciones periódicas.
            </p>
          </div>
        </div>
      </div>

      {/* Casos de Uso Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Casos de Uso
        </h2>
        <div className="space-y-3">
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-medium text-gray-900">
              Monitoreo de salud de cultivos
            </h3>
            <p className="text-gray-600 text-sm">
              Detecta problemas de salud en tus cultivos antes de que sean
              visibles a simple vista.
            </p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-medium text-gray-900">
              Optimización de riego
            </h3>
            <p className="text-gray-600 text-sm">
              Identifica áreas que necesitan más o menos agua basándote en
              índices de vegetación.
            </p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-medium text-gray-900">
              Planificación de cosecha
            </h3>
            <p className="text-gray-600 text-sm">
              Determina el momento óptimo para la cosecha mediante análisis de
              madurez de cultivos.
            </p>
          </div>
        </div>
      </div>

      {/* Academia Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Academia</h2>
        <p className="text-gray-600 mb-4">
          Recursos educativos y tutoriales sobre agricultura de precisión y
          monitoreo satelital.
        </p>
        <div className="space-y-2">
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              <strong>Próximamente:</strong> Tutoriales en video, guías de
              interpretación de índices NDVI, y casos de estudio.
            </p>
          </div>
        </div>
      </div>

      {/* Sugerir Funcionalidad Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Sugerir Funcionalidad
        </h2>
        <p className="text-gray-600 mb-4">
          ¿Tienes una idea para mejorar CoperniGeo? Compártela con nosotros.
        </p>
        <form onSubmit={handleSubmit}>
          <textarea
            value={sugerencia}
            onChange={(e) => setSugerencia(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
            placeholder="Describe tu sugerencia aquí..."
            required
          />
          <button
            type="submit"
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Enviar sugerencia
          </button>
          {enviado && (
            <p className="mt-2 text-green-600 text-sm">
              ¡Gracias! Tu sugerencia ha sido registrada.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

