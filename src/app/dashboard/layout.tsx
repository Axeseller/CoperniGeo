"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Navigation items: max 5, icons + labels, no nested menus
  const navItems = [
    {
      href: "/dashboard",
      label: "Inicio",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: "/dashboard/imagenes",
      label: "Imágenes",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      href: "/dashboard/automatizar-reportes",
      label: "Automatizar reportes",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: "/dashboard/cuenta-y-plan",
      label: "Cuenta y plan",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname?.startsWith(href);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f4f3f4]">
        <div className="flex">
          {/* Minimal Left Nav: icons + labels */}
          <aside className="w-56 bg-white border-r border-gray-200 min-h-screen rounded-r-2xl">
            <div className="p-6">
              <Link href="/" className="flex items-center space-x-2 mb-8">
                <Image
                  src="/logo2.svg"
                  alt="CoperniGeo Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
                <h1 className="text-xl font-bold text-[#5db815]">
                  CoperniGeo
                </h1>
              </Link>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center space-x-3 px-4 py-2.5 rounded-md transition-colors ${
                        active
                          ? "bg-[#5db815]/10 text-[#5db815] font-medium"
                          : "text-[#121212] hover:bg-gray-50"
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content: Center single column, max 720px */}
          <main className="flex-1 flex justify-center px-4 py-8">
            <div className="w-full max-w-[720px]">{children}</div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

