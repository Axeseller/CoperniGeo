"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function IniciaSesionPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      let errorMessage = "Error al iniciar sesión. Por favor intenta de nuevo.";
      
      if (err.code === "auth/user-not-found") {
        errorMessage = "No existe una cuenta con este email";
      } else if (err.code === "auth/wrong-password") {
        errorMessage = "Contraseña incorrecta";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Email inválido";
      } else if (err.code === "auth/invalid-credential") {
        errorMessage = "Credenciales inválidas";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation Bar */}
      <nav className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/">
                <h1 className="text-2xl font-bold text-green-500">CoperniGeo</h1>
              </Link>
              <div className="hidden md:flex space-x-6">
                <Link href="#" className="text-gray-300 hover:text-green-500 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Producto
                </Link>
                <Link href="#" className="text-gray-300 hover:text-green-500 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Recursos
                </Link>
                <Link href="#" className="text-gray-300 hover:text-green-500 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Precios
                </Link>
                <Link href="#" className="text-gray-300 hover:text-green-500 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Clientes
                </Link>
                <Link href="#" className="text-gray-300 hover:text-green-500 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Contacto
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/inicia-sesion"
                className="text-gray-300 hover:text-green-500 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Inicia sesión
              </Link>
              <Link
                href="/registrarte"
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Registrarte
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="text-center text-4xl font-bold text-white mb-2">
              Inicia sesión
            </h2>
            <p className="mt-2 text-center text-sm text-gray-400">
              O{" "}
              <Link
                href="/registrarte"
                className="font-medium text-green-500 hover:text-green-400 transition-colors"
              >
                crea una cuenta nueva
              </Link>
            </p>
          </div>
          <div className="bg-[#151b24] rounded-2xl p-8 border border-gray-800/50 shadow-lg">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
              <div className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    placeholder="tu@email.com"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    Contraseña
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    placeholder="Tu contraseña"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-base font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Iniciando sesión..." : "Iniciar sesión"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

