"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useState } from "react";
import { Seal } from "@/components/seal";

const PIN_LENGTH = 4;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

/**
 * The PIN doesn't gate login — it gates the moment a proposal gets stamped
 * (EditProposalController@approve/reject). "create" is shown automatically
 * the first time a reviewer has no pin_hash yet; the same submitted digits
 * become their PIN server-side, so there's no separate setup step.
 */
export function PinKeypad({
  open,
  onOpenChange,
  mode,
  title,
  onSubmit,
  error,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "confirm";
  title: string;
  onSubmit: (pin: string) => void;
  error?: string | null;
  pending?: boolean;
}) {
  const [digits, setDigits] = useState("");

  // Resetting derived state on a prop change belongs during render, not in
  // an effect (react-hooks/set-state-in-effect) — this is React's own
  // recommended pattern for it: https://react.dev/learn/you-might-not-need-an-effect
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setDigits("");
  }

  const press = (key: string) => {
    if (pending) return;
    if (key === "⌫") {
      setDigits((d) => d.slice(0, -1));
      return;
    }
    if (key === "" || digits.length >= PIN_LENGTH) return;
    const next = digits + key;
    setDigits(next);
    if (next.length === PIN_LENGTH) {
      onSubmit(next);
      setDigits("");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-[var(--ink)]/60 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed inset-x-0 bottom-0 flex flex-col gap-5 rounded-t-3xl border-t border-accent/40 bg-primary px-6 pt-6 pb-8 text-primary-foreground shadow-2xl transition-all data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full">
          <div className="mx-auto h-1 w-10 rounded-full bg-primary-foreground/25" />

          <div className="text-center">
            <Dialog.Title className="font-display text-lg font-semibold text-balance">
              {mode === "create" ? "Choisissez votre code PIN" : title}
            </Dialog.Title>
            <p className="mt-1 font-mono text-xs text-primary-foreground/70">
              {mode === "create"
                ? "4 chiffres — il vous sera redemandé à chaque validation."
                : "4 chiffres pour confirmer."}
            </p>
          </div>

          <div className="flex justify-center gap-3">
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <Seal key={i} status={i < digits.length ? "stamped" : "pending"} />
            ))}
          </div>

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}

          <div className="mx-auto grid w-full max-w-[280px] grid-cols-3 gap-3">
            {KEYS.map((key, i) =>
              key === "" ? (
                <span key={i} />
              ) : (
                <button
                  key={i}
                  type="button"
                  disabled={pending}
                  onClick={() => press(key)}
                  className="flex h-16 items-center justify-center rounded-tap bg-primary-foreground/10 font-display text-2xl transition-colors hover:bg-primary-foreground/20 disabled:opacity-50"
                >
                  {key}
                </button>
              ),
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
