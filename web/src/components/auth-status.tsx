"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { clearAuthToken, getAuthToken } from "@/lib/auth-token";

interface Me {
  id: number;
  name: string | null;
  phone: string;
}

export function AuthStatus() {
  // The server has no localStorage, so it always renders as "logged out" on
  // the first pass. Wait for the client to mount before trusting getAuthToken()
  // — otherwise a logged-in client's very first render diverges from the
  // server-rendered HTML and React throws a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<Me>("/api/user"),
    enabled: mounted && getAuthToken() !== null,
    retry: false,
  });

  if (!mounted || isLoading) {
    return <p className="font-mono text-xs text-muted-foreground">Chargement…</p>;
  }

  if (!data) {
    return (
      <Link href="/login" className={buttonVariants()}>
        Se connecter
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link href="/trees" className={buttonVariants({ variant: "outline" })}>
        Mes registres
      </Link>
      <Link href="/relationship-finder" className={buttonVariants({ variant: "outline" })}>
        Parenté
      </Link>
      <span className="font-mono text-xs text-muted-foreground">
        {data.name ?? data.phone}
      </span>
      <Button
        variant="outline"
        onClick={() => {
          clearAuthToken();
          window.location.reload();
        }}
      >
        Se déconnecter
      </Button>
    </div>
  );
}
