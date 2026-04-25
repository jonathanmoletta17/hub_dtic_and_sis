import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, className }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute bottom-full left-1/2 z-[100] mb-2 w-max max-w-[240px] -translate-x-1/2 rounded-lg bg-surface-3/95 px-3 py-2 text-[10px] font-medium leading-relaxed text-text-1 shadow-xl backdrop-blur-md border border-border-1 pointer-events-none",
              className
            )}
          >
            {content}
            <div className="absolute left-1/2 top-full -translate-x-1/2 border-8 border-transparent border-t-surface-3/95" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
