"use client";

import { useMutation } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError, firstErrorMessage } from "@/lib/api-client";
import type { AccessRequest } from "@/lib/types";

// Public — no useRequireAuth() here on purpose. This exists for someone
// with no session and no saved invite link (docs/mvp-plan.md Phase 2);
// resolving it still requires an admin to re-invite the phone number.
export default function RequestAccessPage() {
  const { slug } = useParams<{ slug: string }>();
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const request = useMutation({
    mutationFn: () =>
      apiFetch<AccessRequest>(`/api/trees/${slug}/access-requests`, {
        method: "POST",
        body: JSON.stringify({ phone, message: message || undefined }),
      }),
  });

  if (request.isSuccess) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold text-balance">
          Demande envoyée
        </h1>
        <p className="text-sm text-muted-foreground">
          Un administrateur ou une administratrice de ce registre verra votre
          demande et pourra vous envoyer un nouveau lien d&apos;invitation.
          Il n&apos;y a rien d&apos;autre à faire de votre côté.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 px-6 py-16">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Mbokk · Registre {slug}
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-balance">
          Demander l&apos;accès à ce registre
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vous y aviez déjà accès mais avez perdu votre lien ? Un
          administrateur ou une administratrice pourra vous en renvoyer un.
        </p>
      </header>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          request.mutate();
        }}
      >
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Votre téléphone
          </span>
          <Input
            type="tel"
            inputMode="tel"
            placeholder="+221 77 123 45 67"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Un mot pour vous identifier (facultatif)
          </span>
          <Input
            placeholder="Ex : « C'est Awa, la fille de Serigne Fallou »"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        {request.isError && (
          <p className="text-sm text-destructive">
            {firstErrorMessage(request.error as ApiError)}
          </p>
        )}
        <Button type="submit" disabled={request.isPending}>
          {request.isPending ? "Envoi…" : "Envoyer la demande"}
        </Button>
      </form>
    </div>
  );
}
