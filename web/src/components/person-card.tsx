import Link from "next/link";
import type { Person } from "@/lib/types";

// Stored as full ISO dates (YYYY-MM-DD) but we only ever have year precision.
const year = (d: string | null | undefined) => d?.slice(0, 4) ?? null;

const CARD_CLASS =
  "flex w-full items-center gap-3 border border-border bg-card p-3 text-left transition-colors hover:bg-muted";

function CardContent({
  person,
  role,
  interactive,
}: {
  person: Person;
  role?: string;
  interactive?: boolean;
}) {
  const initial = person.first_name.charAt(0).toUpperCase();
  const birth = year(person.birth_date);
  const death = year(person.death_date);
  const dates = birth ? `${birth} – ${death ?? "présent"}` : null;
  const subtitle = [role, dates].filter(Boolean).join(" · ");

  return (
    <>
      {person.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={person.photo_url}
          alt=""
          className="size-11 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/15 font-display text-lg text-accent">
          {initial}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">
          {person.first_name} {person.last_name}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {subtitle || "—"}
        </span>
      </span>
      {interactive && (
        <span className="shrink-0 text-muted-foreground/50 text-sm">›</span>
      )}
    </>
  );
}

/**
 * The primary way relatives are browsed (profile → Parents/Conjoint·e·s/Enfants
 * → tap a card → their own profile). Plain HTML, not SVG — cards read fine at
 * any viewport width, unlike a pan/zoom canvas on a small screen.
 *
 * Defaults to a `Link` to the public profile. Pass `onClick` instead (e.g. the
 * authed in-tree drill-down, where a private person has no public profile to
 * link to) to render a plain button that hands the person back to the caller.
 * Pass `static` for a display-only card (e.g. showing the currently-focused
 * person themselves, who shouldn't link/button back to their own card).
 */
export function PersonCard({
  person,
  role,
  onClick,
  static: isStatic,
}: {
  person: Person;
  role?: string;
  onClick?: (person: Person) => void;
  static?: boolean;
}) {
  if (isStatic) {
    return (
      <div className={CARD_CLASS}>
        <CardContent person={person} role={role} />
      </div>
    );
  }

  if (onClick) {
    return (
      <button type="button" className={CARD_CLASS} onClick={() => onClick(person)}>
        <CardContent person={person} role={role} interactive />
      </button>
    );
  }

  return (
    <Link href={`/people/${person.id}`} className={CARD_CLASS}>
      <CardContent person={person} role={role} interactive />
    </Link>
  );
}
