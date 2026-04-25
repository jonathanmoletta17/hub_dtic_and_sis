"use client";

import React from "react";
import { OperationalShell } from "@/components/ui/OperationalShell";

export default function ContextLayout({ children }: { children: React.ReactNode }) {
  return <OperationalShell>{children}</OperationalShell>;
}

