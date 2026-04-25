import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const GlassCard = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "glass relative overflow-hidden rounded-2xl p-8",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-[var(--glass-highlight)] before:to-transparent",
        "shadow-[var(--glass-shadow)]",
        className,
      )}
    >
      {children}
    </div>
  );
};
