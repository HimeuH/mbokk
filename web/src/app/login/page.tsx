"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError, firstErrorMessage } from "@/lib/api-client";
import { setAuthToken } from "@/lib/auth-token";
import type { AuthResponse } from "@/lib/types";

// The cover always renders in the light "paper" palette, regardless of the
// viewer's light/dark preference — it's the title page of the livret, a
// fixed brand moment rather than a themed app screen. Scoping the palette
// as CSS custom properties (instead of touching Button/Input) means both
// components keep picking up --primary/--border/etc. normally, just
// resolved against these forced values within this subtree.
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

export default function LoginPage() {
  const tApp = useTranslations("App");
  const router = useRouter();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Bootstrap only — creating the very first account, with nobody to invite
  // you yet. Trust-on-first-use, no code to wait for. Everyone else arrives
  // via an invite link shared by someone already in their family's register
  // (see /invite/[token]) and never sees this form at all.
  const register = useMutation({
    mutationFn: () =>
      apiFetch<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ phone, name: name || undefined }),
      }),
    onSuccess: (data) => {
      setError(null);
      setAuthToken(data.token);
      router.push("/trees");
    },
    onError: (err: ApiError) => setError(firstErrorMessage(err)),
  });

  // Returning user — a lost/cleared session on a new device. Only works once
  // a PIN exists on the account (set the first time this user approves or
  // rejects an edit proposal from an already-logged-in device); there is
  // deliberately no way to set a PIN from this unauthenticated form.
  const login = useMutation({
    mutationFn: () =>
      apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ phone, pin }),
      }),
    onSuccess: (data) => {
      setError(null);
      setAuthToken(data.token);
      router.push("/trees");
    },
    onError: (err: ApiError) => setError(firstErrorMessage(err)),
  });

  const pending = mode === "register" ? register.isPending : login.isPending;

  return (
    <div className="flex flex-1 flex-col">
      {/* Top tone — the cover, fixed to its content, ink regardless of theme. */}
      <div className="flex flex-col items-center justify-center gap-2 bg-[var(--ink)] px-6 py-12 text-center">
        <span className="font-display text-4xl font-medium text-accent italic">
          {tApp("name")}
        </span>
        <span className="font-mono text-[0.65rem] tracking-[0.2em] text-[var(--paper)]/70 uppercase">
          {tApp("tagline")}
        </span>
      </div>

      {/* Bottom tone — the first page: paper, fills the rest of the screen,
          seamed to the cover above by a single brass rule rather than a
          floating card, so the two tones read as one object, not a modal. */}
      <div
        style={PAPER_PANEL_STYLE}
        className="flex flex-1 justify-center border-t-2 border-accent bg-background px-6 py-10 text-foreground"
      >
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-semibold text-balance">
            {mode === "register" ? "Créez votre premier registre" : "Connexion"}
          </h1>

          {mode === "register" ? (
            <>
              <p className="mt-2 font-mono text-[0.65rem] leading-relaxed text-muted-foreground">
                Déjà invité·e par un membre de votre famille ? Ouvrez le lien
                reçu plutôt que ce formulaire — c&apos;est comme ça que tout
                le monde se connecte.
              </p>
              <p className="font-mono text-[0.65rem] leading-relaxed text-muted-foreground">
                Vous aviez déjà accès mais avez perdu ce lien ?{" "}
                <Link href="/search" className="text-accent underline underline-offset-4">
                  Cherchez votre registre
                </Link>{" "}
                pour en demander un nouveau.
              </p>
            </>
          ) : (
            <p className="mt-2 font-mono text-[0.65rem] leading-relaxed text-muted-foreground">
              Ne fonctionne que si un code PIN a déjà été défini sur ce
              compte (en validant ou rejetant une proposition depuis un
              appareil déjà connecté). Sinon, demandez une invitation à un
              administrateur de votre arbre.
            </p>
          )}

          <button
            type="button"
            className="mt-3 font-mono text-[0.65rem] text-accent underline underline-offset-4"
            onClick={() => {
              setError(null);
              setMode(mode === "register" ? "login" : "register");
            }}
          >
            {mode === "register"
              ? "Vous avez déjà un compte ? Connectez-vous avec votre code PIN"
              : "Pas encore de compte ? Créez votre premier registre"}
          </button>

          <form
            className="mt-8 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (mode === "register") {
                register.mutate();
              } else {
                login.mutate();
              }
            }}
          >
            <label className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Téléphone
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
            {mode === "register" ? (
              <label className="flex flex-col gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Nom
                </span>
                <Input
                  placeholder="Votre nom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            ) : (
              <label className="flex flex-col gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Code PIN
                </span>
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  required
                />
              </label>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={pending}>
              {mode === "register"
                ? pending
                  ? "Création…"
                  : "Créer mon registre"
                : pending
                  ? "Connexion…"
                  : "Se connecter"}
            </Button>
            {mode === "register" && (
              <p className="font-mono text-[0.65rem] leading-relaxed text-muted-foreground">
                Aucun mot de passe, aucun code envoyé — ce numéro devient
                simplement l&apos;identifiant de votre registre.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
