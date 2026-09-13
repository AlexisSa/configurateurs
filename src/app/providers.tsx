"use client";

import { ClientProvider } from "@/core/client-context/ClientProvider";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <ClientProvider>{children}</ClientProvider>;
}
