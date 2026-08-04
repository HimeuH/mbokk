"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError, firstErrorMessage } from "@/lib/api-client";
import { setAuthToken } from "@/lib/auth-token";
import type { InviteClaimResponse } from "@/lib/types";

// Same forced-light palette as /login — this page is the other half of the
// same "opening the livret" moment, just entered by link instead of by hand.
const PAPER_PANEL_STYLE = {
  "--background": "#e2decf",
  "--foreground": "#1b1b22",
  "--card": "#d7d2bf",
  "--card-foreground": "#1b1b22",
  "--border": "#c9c2ac",
  "--input": "#c9c2ac",
  "--muted-foreground": "#55554e",
  "--primary": "#3b4b8c",
  "--primary-foreground": "#f5f3ec",
  "--accent": "#b98a3a",
  "--accent-foreground": "#14182b",
  "--ring": "#b98a3a",
  "--destructive": "#a8483f",
} as CSSProperties;

export default function InviteClaimPage() {
  const tApp = useTranslations("App");
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const [name, setName] = useState("");

  // No auto-fire on mount: claiming is a POST that consumes a single-use
  // token, and chat apps (WhatsApp, etc.) pre-fetch link previews with a
  // plain GET — an explicit tap is what protects the token from being
  // silently burned by a crawler before the real person ever sees this page.
  const claim = useMutation({
    mutationFn: () =>
      apiFetch<InviteClaimResponse>(`/api/invite/${token}`, {
        method: "POST",
        body: JSON.stringify({ name: name || undefined }),
      }),
    onSuccess: (data) => {
      setAuthToken(data.token);
      router.push(`/trees/${data.family_tree.slug}`);
    },
  });

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col items-center justify-center gap-2 bg-[var(--ink)] px-6 py-12 text-center">
        <span className="font-display text-4xl font-medium text-accent italic">
          {tApp("name")}
        </span>
        <span className="font-mono text-[0.65rem] tracking-[0.2em] text-[var(--paper)]/70 uppercase">
          {tApp("tagline")}
        </span>
      </div>

      <div
        style={PAPER_PANEL_STYLE}
        className="flex flex-1 justify-center border-t-2 border-accent bg-background px-6 py-10 text-foreground"
      >
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-semibold text-balance">
            Vous êtes invité·e à rejoindre un registre
          </h1>
          <p className="mt-2 font-mono text-[0.65rem] leading-relaxed text-muted-foreground">
            Ce lien vous a été envoyé par un membre de votre famille — il
            confirme qui vous êtes, aucun code n&apos;est nécessaire.
          </p>

          <form
            className="mt-8 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              claim.mutate();
            }}
          >
            <label className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Votre nom (facultatif)
              </span>
              <Input
                placeholder="Votre nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            {claim.isError && (
              <p className="text-sm text-destructive">
                {firstErrorMessage(claim.error as ApiError)}
              </p>
            )}
            <Button type="submit" disabled={claim.isPending}>
              {claim.isPending ? "Ouverture…" : "Rejoindre le registre"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
