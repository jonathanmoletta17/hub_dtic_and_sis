"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/ThemeProvider";

interface ThemeToggleProps {
  className?: string;
  variant?: "surface" | "sidebar";
}

export function ThemeToggle({ className = "", variant = "surface" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className={`h-9 w-[140px] rounded-full ${variant === "sidebar" ? "theme-sidebar-surface" : "theme-shell-button"} ${className}`}
      />
    );
  }

  const isDark = theme === "dark";
  const variantClasses =
    variant === "sidebar"
      ? "theme-sidebar-surface theme-sidebar-button"
      : "theme-shell-button";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors ${variantClasses} ${className}`}
      title={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      {isDark ? <Sun size={14} className="text-warning" /> : <Moon size={14} className="text-info" />}
      <span>{isDark ? "Modo claro" : "Modo escuro"}</span>
    </button>
  );
}
