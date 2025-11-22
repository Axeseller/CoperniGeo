import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-green-600">CoperniGeo</h1>
            </div>
            <div className="hidden md:flex space-x-4">
              <button className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium">
                Producto
              </button>
              <button className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium">
                Precios
              </button>
              <button className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium">
                Contacto
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-5xl font-extrabold text-gray-900 sm:text-6xl">
            Monitoreo de Cultivos
            <span className="text-green-600"> por Satélite</span>
          </h2>
          <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
            Obtén información precisa sobre tus cultivos mediante imágenes
            satelitales. Monitorea el crecimiento, detecta problemas y optimiza
            tu producción agrícola con tecnología de vanguardia.
          </p>
          <div className="mt-10 flex justify-center space-x-4">
            <Link
              href="/registrarte"
              className="bg-green-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Registrarte
            </Link>
            <Link
              href="/inicia-sesion"
              className="bg-white text-green-600 border-2 border-green-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-green-50 transition-colors"
            >
              Inicia sesión
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Imágenes Satelitales
            </h3>
            <p className="text-gray-600">
              Accede a imágenes de alta resolución de tus campos desde el
              espacio.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Análisis Inteligente
            </h3>
            <p className="text-gray-600">
              Obtén análisis automáticos de NDVI y salud de cultivos.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Reportes Automáticos
            </h3>
            <p className="text-gray-600">
              Recibe reportes periódicos sobre el estado de tus cultivos.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

