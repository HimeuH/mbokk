"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useRef, useState } from "react";
import { buildGriotNarration } from "@/lib/griot-narration";
import type { Person, Relationship } from "@/lib/types";

const SWIPE_THRESHOLD = 40;

/**
 * Full-screen story-card narration, deliberately text-only for v1 (see
 * docs/mobile-design-implementation-plan.md WP-0): "Maintenir pour écouter"
 * ships as an inert affordance, not a real audio feature, so the UI is
 * honest about what it does today rather than promising narration voice.
 */
export function GriotMode({
  open,
  onOpenChange,
  person,
  relationships,
  categorized,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: Person;
  relationships: Relationship[];
  categorized: { parents: Person[]; spouses: Person[]; children: Person[] };
}) {
  const cards = buildGriotNarration(person, relationships, categorized);
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const goNext = () => setIndex((i) => Math.min(i + 1, cards.length - 1));
  const goPrev = () => setIndex((i) => Math.max(i - 1, 0));

  const card = cards[index];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-[var(--ink)] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed inset-0 flex flex-col bg-[var(--ink)] text-[var(--paper)] transition-all data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
          <div className="flex gap-1.5 px-4 pt-4">
            {cards.map((_, i) => (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--paper)]/15">
                <div
                  className="h-full rounded-full bg-[var(--brass)] transition-[width] duration-300"
                  style={{ width: i <= index ? "100%" : "0%" }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-4 pt-3">
            <Dialog.Title className="font-mono text-xs uppercase tracking-widest text-[var(--paper)]/60">
              Griot · {index + 1}/{cards.length}
            </Dialog.Title>
            <Dialog.Close
              className="p-2 font-mono text-sm text-[var(--paper)]/70"
              aria-label="Fermer"
            >
              ✕
            </Dialog.Close>
          </div>

          <div
            className="relative flex flex-1"
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null) return;
              const delta = e.changedTouches[0].clientX - touchStartX.current;
              touchStartX.current = null;
              if (delta > SWIPE_THRESHOLD) goPrev();
              else if (delta < -SWIPE_THRESHOLD) goNext();
            }}
          >
            <button type="button" aria-label="Carte précédente" onClick={goPrev} className="w-1/3" />
            <button type="button" aria-label="Carte suivante" onClick={goNext} className="w-2/3" />

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-[var(--brass)]">
                {card.heading}
              </p>
              <p className="text-balance font-display text-2xl leading-snug">{card.body}</p>
            </div>
          </div>

          <div className="flex justify-center pb-8 pt-4">
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="rounded-full border border-[var(--paper)]/20 px-5 py-2.5 font-mono text-xs uppercase tracking-wider text-[var(--paper)]/50"
            >
              Maintenir pour écouter
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
