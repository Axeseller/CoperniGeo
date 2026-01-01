"use client";

import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import StepCard from "@/components/ui/StepCard";

export default function DashboardPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Welcome Card: Short, reassuring, orientation + confidence */}
      <Card>
        <h1 className="text-2xl font-bold text-[#242424] mb-2">
        Bienvenido a CoperniGeo
      </h1>
        <p className="text-[#898989]">
          Monitorea tus cultivos con imágenes satelitales. Empieza en 3 pasos simples.
        </p>
      </Card>

      {/* Subtitle: 3 pasos para empezar */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-medium text-[#242424]">3 pasos para empezar</h2>
        </div>

      {/* 3 Vertical Step Cards: One sentence, one CTA */}
      <div className="space-y-4">
        <StepCard
          title="1. Selecciona tu parcela"
          description="Dibuja o carga el polígono de tu área de cultivo en el mapa."
          cta={{
            label: "Ir a Imágenes",
            onClick: () => router.push("/dashboard/imagenes"),
          }}
        />
        <StepCard
          title="2. Analiza su estado"
          description="Revisa los índices de salud de tus cultivos calculados automáticamente."
          cta={{
            label: "Ver análisis",
            onClick: () => router.push("/dashboard/imagenes"),
          }}
        />
        <StepCard
          title="3. Automatiza reportes"
          description="Configura reportes periódicos por email o WhatsApp y recibe actualizaciones automáticas."
          cta={{
            label: "Configurar reportes",
            onClick: () => router.push("/dashboard/automatizar-reportes"),
          }}
        />
      </div>
    </div>
  );
}

