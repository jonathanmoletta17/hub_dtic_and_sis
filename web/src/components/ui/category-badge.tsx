import React from "react";

export function CategoryBadge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium ${className}`}
      style={{
        color: "color-mix(in srgb, var(--text-secondary) 92%, var(--text-primary) 8%)",
        background: "color-mix(in srgb, var(--bg-surface-alt) 82%, var(--accent-primary-subtle) 18%)",
        border: "1px solid var(--border-default)",
      }}
    >
      {children}
    </span>
  );
}
