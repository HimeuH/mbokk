"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PinKeypad } from "@/components/pin-keypad";
import { apiFetch, ApiError, firstErrorMessage } from "@/lib/api-client";
import { getAuthToken } from "@/lib/auth-token";
import type { AuthUser } from "@/lib/types";

/**
 * Non-blocking nudge to set a PIN right after register/invite-claim, instead
 * of only ever getting one lazily on a first proposal approve/reject
 * (EditProposalController::checkPin()) — that left a dead end for a sole
 * tree owner who never approves anything and later loses their session,
 * since /auth/login only works once pin_hash is already set.
 */
export function SetPinPrompt() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [dismissed, setDismissed] = useState(false);
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<AuthUser>("/api/user"),
    enabled: mounted && getAuthToken() !== null,
    retry: false,
  });

  const setPin = useMutation({
    mutationFn: (pin: string) =>
      apiFetch<AuthUser>("/api/user/pin", {
        method: "POST",
        body: JSON.stringify({ pin }),
      }),
    onSuccess: () => {
      setError(null);
      setKeypadOpen(false);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: ApiError) => setError(firstErrorMessage(err)),
  });

  if (!mounted || !data || data.has_pin || dismissed) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-accent/40 bg-accent/10 px-4 py-3 sm:px-8">
        <p className="font-mono text-xs text-foreground">
          Vous n&apos;avez pas encore de code PIN — sans lui, impossible de
          vous reconnecter si vous perdez l&apos;accès à cet appareil.
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setKeypadOpen(true)}>
            Définir mon code PIN
          </Button>
          <button
            type="button"
            className="font-mono text-xs text-muted-foreground underline underline-offset-4"
            onClick={() => setDismissed(true)}
          >
            Plus tard
          </button>
        </div>
      </div>

      <PinKeypad
        open={keypadOpen}
        onOpenChange={setKeypadOpen}
        mode="create"
        title="Choisissez votre code PIN"
        error={error}
        pending={setPin.isPending}
        onSubmit={(pin) => setPin.mutate(pin)}
      />
    </>
  );
}
