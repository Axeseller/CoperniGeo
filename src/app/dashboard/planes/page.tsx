export default function PlanesPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold text-[#242424] mb-6">Planes y Precios</h1>
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <p className="text-[#898989] mb-4">
          Aquí podrás gestionar tu suscripción y planes de pago.
        </p>
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800">
            <strong>Nota:</strong> La integración con Stripe se agregará
            próximamente. Podrás seleccionar y gestionar planes de suscripción
            desde esta página.
          </p>
        </div>
        <div className="mt-8 flex justify-center">
          <div className="border-2 border-[#5db815] rounded-lg p-8 max-w-md w-full">
            <h3 className="text-2xl font-semibold text-[#242424] mb-4 text-center">
              Plan Anual
            </h3>
            <p className="text-4xl font-bold text-[#5db815] mb-2 text-center">
              $2,000 MXN
            </p>
            <p className="text-[#898989] text-center mb-6">por año</p>
            <ul className="text-[#898989] space-y-2 mb-6">
              <li className="flex items-start">
                <span className="text-[#5db815] mr-2">✓</span>
                <span>Acceso completo a todas las funcionalidades</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#5db815] mr-2">✓</span>
                <span>Imágenes satelitales de tus campos</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#5db815] mr-2">✓</span>
                <span>Reportes automáticos de NDVI</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#5db815] mr-2">✓</span>
                <span>Soporte técnico incluido</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

