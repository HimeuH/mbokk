"use client";

import { useMemo } from "react";
import { categorizeRelationships } from "@/lib/relationships";
import type { Person, Relationship } from "@/lib/types";

function AvatarGlyph({ person, size }: { person: Person; size: "compact" | "focus" }) {
  const initial = person.first_name.charAt(0).toUpperCase();
  const dimension = size === "focus" ? "size-12 text-base" : "size-9 text-xs";

  return (
    <>
      {person.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={person.photo_url}
          alt=""
          className={`${dimension} rounded-full object-cover ring-2 ring-background`}
        />
      ) : (
        <span
          className={`flex ${dimension} items-center justify-center rounded-full bg-accent/15 font-display text-accent ring-2 ring-background`}
        >
          {initial}
        </span>
      )}
      <span className="max-w-16 truncate font-mono text-[0.6rem] text-muted-foreground">
        {person.first_name}
      </span>
    </>
  );
}

/**
 * Persistent strip anchored on whichever person `TreePersonPanel` is
 * currently focused on: ascendants left, descendants right, one tap to
 * refocus. Doesn't replace the card-based drill-down below it — it exists
 * so "where am I in the lineage" survives after several taps sideways into
 * someone else's branch, which the free-form drill-down alone loses.
 */
export function LineageRail({
  person,
  people,
  relationships,
  onSelectPerson,
}: {
  person: Person;
  people: Person[];
  relationships: Relationship[];
  onSelectPerson: (person: Person) => void;
}) {
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const { parents, children } = useMemo(
    () => categorizeRelationships(relationships, person.id, peopleById),
    [relationships, person.id, peopleById],
  );

  return (
    <div className="flex items-center gap-3 overflow-x-auto border border-border bg-card p-3">
      <div className="flex shrink-0 flex-col items-start gap-1.5">
        <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
          Ascendants
        </span>
        {parents.length > 0 ? (
          <div className="flex gap-2">
            {parents.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPerson(p)}
                className="flex shrink-0 flex-col items-center gap-1"
              >
                <AvatarGlyph person={p} size="compact" />
              </button>
            ))}
          </div>
        ) : (
          <span className="font-mono text-[0.6rem] text-muted-foreground/70 italic">
            aucun parent enregistré
          </span>
        )}
      </div>

      <span aria-hidden className="shrink-0 text-accent">
        ←
      </span>

      <div className="flex shrink-0 flex-col items-center gap-1 px-1">
        <AvatarGlyph person={person} size="focus" />
      </div>

      <span aria-hidden className="shrink-0 text-accent">
        →
      </span>

      <div className="flex shrink-0 flex-col items-start gap-1.5">
        <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
          Descendants
        </span>
        {children.length > 0 ? (
          <div className="flex gap-2">
            {children.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPerson(p)}
                className="flex shrink-0 flex-col items-center gap-1"
              >
                <AvatarGlyph person={p} size="compact" />
              </button>
            ))}
          </div>
        ) : (
          <span className="font-mono text-[0.6rem] text-muted-foreground/70 italic">
            aucun enfant enregistré
          </span>
        )}
      </div>
    </div>
  );
}
