"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError } from "@/lib/api-client";
import { setAuthToken } from "@/lib/auth-token";

type Step = "phone" | "otp";

interface VerifyResponse {
  user: { id: number; name: string | null; phone: string };
  token: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const requestOtp = useMutation({
    mutationFn: () => apiFetch<{ message: string }>("/api/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),
    onSuccess: () => {
      setError(null);
      setStep("otp");
    },
    onError: (err: ApiError) => setError(err.message),
  });

  const verifyOtp = useMutation({
    mutationFn: () => apiFetch<VerifyResponse>("/api/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, otp_code: otpCode, name: name || undefined }),
    }),
    onSuccess: (data) => {
      setError(null);
      setAuthToken(data.token);
      router.push("/");
    },
    onError: (err: ApiError) => setError(err.message),
  });

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm border border-border bg-card p-8">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Mbokk · Connexion
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-balance">
          {step === "phone" ? "Entrez votre numéro" : "Entrez le code reçu"}
        </h1>

        {step === "phone" ? (
          <form
            className="mt-8 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              requestOtp.mutate();
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
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" disabled={requestOtp.isPending}>
              {requestOtp.isPending ? "Envoi…" : "Recevoir le code"}
            </Button>
          </form>
        ) : (
          <form
            className="mt-8 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              verifyOtp.mutate();
            }}
          >
            <p className="font-mono text-sm text-muted-foreground">{phone}</p>
            <label className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Code à 6 chiffres
              </span>
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                className="font-mono tracking-[0.3em]"
                placeholder="••••••"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Nom (première connexion)
              </span>
              <Input
                placeholder="Votre nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" disabled={verifyOtp.isPending}>
              {verifyOtp.isPending ? "Vérification…" : "Se connecter"}
            </Button>
            <button
              type="button"
              className="font-mono text-xs text-muted-foreground underline underline-offset-4"
              onClick={() => {
                setStep("phone");
                setError(null);
              }}
            >
              Changer de numéro
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
