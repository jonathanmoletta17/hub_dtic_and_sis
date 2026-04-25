import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

export const PremiumButton = ({
  children,
  className,
  variant = "primary",
  size = "md",
  icon,
  ...props
}: ButtonProps) => {
  const sizeClasses = {
    sm: "min-h-[36px] rounded-lg px-4 py-1.5 text-xs",
    md: "min-h-[48px] rounded-xl px-6 py-2",
    lg: "min-h-[56px] rounded-2xl px-8 py-3 text-lg",
  };

  const variants = {
    primary:
      "theme-button-primary shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:brightness-110 active:scale-[0.98]",
    secondary:
      "theme-button-secondary active:scale-[0.98]",
    ghost: "bg-transparent text-text-2 hover:bg-[var(--bg-surface-alt)] hover:text-text-1",
  };

  return (
    <button
      className={cn(
        "group relative flex items-center justify-center gap-2 overflow-hidden font-semibold transition-all duration-200",
        variants[variant],
        sizeClasses[size],
        "before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent hover:before:animate-[shimmer_1.5s_infinite]",
        className,
      )}
      {...props}
    >
      {icon ? <span className="relative z-10 shrink-0">{icon}</span> : null}
      <span className="relative z-10">{children}</span>
      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </button>
  );
};
