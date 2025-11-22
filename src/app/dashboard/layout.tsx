"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          {/* Sidebar */}
          <aside className="w-64 bg-white shadow-lg min-h-screen">
            <div className="p-6">
              <Link href="/">
                <h1 className="text-2xl font-bold text-green-600 mb-8 hover:text-green-700 cursor-pointer transition-colors">
                  CoperniGeo
                </h1>
              </Link>
              <nav className="space-y-2">
                <Link
                  href="/dashboard"
                  className="block px-4 py-2 text-gray-700 hover:bg-green-50 hover:text-green-600 rounded-md transition-colors"
                >
                  Inicio
                </Link>
                <Link
                  href="/dashboard/planes"
                  className="block px-4 py-2 text-gray-700 hover:bg-green-50 hover:text-green-600 rounded-md transition-colors"
                >
                  Planes
                </Link>
                <Link
                  href="/dashboard/cuenta"
                  className="block px-4 py-2 text-gray-700 hover:bg-green-50 hover:text-green-600 rounded-md transition-colors"
                >
                  Cuenta
                </Link>
                <Link
                  href="/dashboard/ayuda"
                  className="block px-4 py-2 text-gray-700 hover:bg-green-50 hover:text-green-600 rounded-md transition-colors"
                >
                  Ayuda
                </Link>
                <Link
                  href="/dashboard/imagenes"
                  className="block px-4 py-2 text-gray-700 hover:bg-green-50 hover:text-green-600 rounded-md transition-colors"
                >
                  Imágenes
                </Link>
                <Link
                  href="/dashboard/automatizar-reportes"
                  className="block px-4 py-2 text-gray-700 hover:bg-green-50 hover:text-green-600 rounded-md transition-colors"
                >
                  Automatizar reportes
                </Link>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

