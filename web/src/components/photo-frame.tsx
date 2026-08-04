import type { Person } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The one deliberate departure from the grid on a person's fiche: a
 * slightly rotated, tape-mounted photo instead of a flat circular avatar —
 * like a real photo glued into a livret de famille. Scoped to hero/flagship
 * contexts only (the focused person on a fiche); list rows keep the compact
 * circular avatar from `PersonCard` so this detail keeps its effect.
 */
const FRAME_SIZES = {
  default: { frame: "h-28 w-24", tape: "-top-2.5 -left-3.5 h-5 w-14", ring: "ring-4", text: "text-2xl" },
  sm: { frame: "h-20 w-16", tape: "-top-1.5 -left-2.5 h-4 w-10", ring: "ring-2", text: "text-lg" },
} as const;

export function PhotoFrame({
  person,
  size = "default",
  className,
}: {
  person: Person;
  size?: keyof typeof FRAME_SIZES;
  className?: string;
}) {
  const initial = person.first_name.charAt(0).toUpperCase();
  const s = FRAME_SIZES[size];

  return (
    <div className={cn("relative -rotate-2 drop-shadow-lg", s.frame, className)}>
      <span
        aria-hidden
        className={cn("absolute -rotate-[42deg] bg-accent/60 shadow-sm", s.tape)}
      />
      {person.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={person.photo_url}
          alt=""
          className={cn("size-full object-cover ring-background", s.ring)}
        />
      ) : (
        <span
          className={cn(
            "flex size-full items-center justify-center bg-gradient-to-br from-primary to-[var(--ink)] font-display text-primary-foreground ring-background",
            s.ring,
            s.text,
          )}
        >
          {initial}
        </span>
      )}
    </div>
  );
}
