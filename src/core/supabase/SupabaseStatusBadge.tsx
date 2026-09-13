"use client";

import { useEffect, useState } from "react";
import {
  getSupabaseLinkStatus,
  type SupabaseLinkStatus,
} from "@/core/supabase/getLinkStatus";

export function SupabaseStatusBadge() {
  const [status, setStatus] = useState<SupabaseLinkStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSupabaseLinkStatus().then((result) => {
      if (!cancelled) setStatus(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status) {
    return (
      <p className="text-sm text-zinc-500">Supabase : vérification…</p>
    );
  }

  if (status.state === "unconfigured") {
    return (
      <p className="text-sm text-amber-700">
        Supabase : non configuré (renseigner `.env.local` puis redémarrer{" "}
        <code className="text-xs">npm run dev</code>).
      </p>
    );
  }

  if (status.state === "error") {
    return (
      <p className="text-sm text-red-700">
        Supabase : erreur — {status.message}
      </p>
    );
  }

  return (
    <p className="text-sm text-emerald-700">Supabase : {status.message}</p>
  );
}
