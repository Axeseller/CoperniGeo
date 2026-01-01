/**
 * Step Card component for progressive disclosure flows
 * Used in onboarding and multi-step processes
 */

interface StepCardProps {
  title: string;
  description: string;
  cta?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function StepCard({ title, description, cta, className = "" }: StepCardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 space-y-4 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold text-[#242424] mb-2">{title}</h3>
        <p className="text-[#898989]">{description}</p>
      </div>
      {cta && (
        <button
          onClick={cta.onClick}
          className="w-full bg-[#5db815] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#4a9a11] transition-colors"
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}


