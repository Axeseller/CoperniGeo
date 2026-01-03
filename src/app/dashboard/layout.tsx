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
      <div className="min-h-screen bg-[#f4f3f4] flex flex-col">
        {/* Mobile Header - Only visible on mobile */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
          <Link href="/" className="flex items-center space-x-2">
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
        </header>

        <div className="flex flex-1">
          {/* Desktop Sidebar: Hidden on mobile, visible on md+ */}
          <aside className="hidden md:block w-56 bg-white border-r border-gray-200 min-h-screen rounded-r-2xl">
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
          <main className="flex-1 flex justify-center px-4 py-4 md:py-8 pb-20 md:pb-8">
            <div className="w-full max-w-[720px]">{children}</div>
          </main>
        </div>

        {/* Mobile Bottom Navigation - Only visible on mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10 safe-area-bottom">
          <div className="flex justify-around items-center h-16 px-2">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                    active
                      ? "text-[#5db815]"
                      : "text-gray-500"
                  }`}
                >
                  {item.icon}
                  <span className={`text-xs mt-1 ${active ? "font-medium" : ""}`}>
                    {item.label.split(" ")[0]}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </ProtectedRoute>
  );
}

