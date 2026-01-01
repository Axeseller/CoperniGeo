/**
 * Reusable Card component - primary UI primitive
 * Mobile-first, designed for future mobile migration
 */

interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: "default" | "interactive";
}

export default function Card({ children, onClick, className = "", variant = "default" }: CardProps) {
  const baseClasses = "bg-white rounded-lg border border-gray-200 p-6";
  const variantClasses = variant === "interactive" && onClick 
    ? "cursor-pointer transition-all hover:shadow-md hover:border-gray-300"
    : "";
  
  return (
    <div 
      className={`${baseClasses} ${variantClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}


