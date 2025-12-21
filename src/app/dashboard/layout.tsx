"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
      <div className="min-h-screen bg-[#f4f3f4]">
        <div className="flex">
          {/* Sidebar */}
          <aside className="w-64 bg-white shadow-lg min-h-screen border-r border-gray-200">
            <div className="p-6">
              <Link href="/" className="flex items-center space-x-2 mb-8">
                <Image
                  src="/logo2.svg"
                  alt="CoperniGeo Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
                <h1 className="text-2xl font-bold text-[#5db815] hover:text-[#4a9a11] cursor-pointer transition-colors">
                  CoperniGeo
                </h1>
              </Link>
              <nav className="space-y-2">
                <Link
                  href="/dashboard"
                  className="block px-4 py-2 text-[#121212] hover:bg-[#5db815]/10 hover:text-[#5db815] rounded-md transition-colors"
                >
                  Inicio
                </Link>
                <Link
                  href="/dashboard/planes"
                  className="block px-4 py-2 text-[#121212] hover:bg-[#5db815]/10 hover:text-[#5db815] rounded-md transition-colors"
                >
                  Planes
                </Link>
                <Link
                  href="/dashboard/cuenta"
                  className="block px-4 py-2 text-[#121212] hover:bg-[#5db815]/10 hover:text-[#5db815] rounded-md transition-colors"
                >
                  Cuenta
                </Link>
                <Link
                  href="/dashboard/ayuda"
                  className="block px-4 py-2 text-[#121212] hover:bg-[#5db815]/10 hover:text-[#5db815] rounded-md transition-colors"
                >
                  Ayuda
                </Link>
                <Link
                  href="/dashboard/imagenes"
                  className="block px-4 py-2 text-[#121212] hover:bg-[#5db815]/10 hover:text-[#5db815] rounded-md transition-colors"
                >
                  Imágenes
                </Link>
                <Link
                  href="/dashboard/automatizar-reportes"
                  className="block px-4 py-2 text-[#121212] hover:bg-[#5db815]/10 hover:text-[#5db815] rounded-md transition-colors"
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

