"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getAuthToken } from "./auth-token";

// Authed views are client-only (Architecture Laws) — call this at the top of
// any page under /trees to bounce unauthenticated visitors to /login.
export function useRequireAuth() {
  const router = useRouter();

  useEffect(() => {
    if (getAuthToken() === null) {
      router.replace("/login");
    }
  }, [router]);
}
