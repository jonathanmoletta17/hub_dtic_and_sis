import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

export const PremiumInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, className, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = props.id ?? generatedId;

    return (
      <div className="group space-y-2">
        {label ? (
          <label htmlFor={inputId} className="theme-copy-soft block text-[11px] font-semibold uppercase tracking-widest transition-colors group-focus-within:text-accent-blue">
            {label}
          </label>
        ) : null}
        <div className="relative">
          {icon ? (
            <div className="theme-copy-soft absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-accent-blue">
              {icon}
            </div>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "theme-input w-full rounded-xl px-4 py-3 outline-none transition-all duration-200",
              "focus:bg-surface-3 focus:shadow-[0_0_12px_rgba(59,130,246,0.1)]",
              icon ? "pl-12" : "",
              className,
            )}
            {...props}
          />
        </div>
      </div>
    );
  },
);

PremiumInput.displayName = "PremiumInput";
