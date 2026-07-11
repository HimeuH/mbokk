"use client";

import { useMemo } from "react";
import { PersonCard } from "@/components/person-card";
import { categorizeRelationships } from "@/lib/relationships";
import type { Person, Relationship } from "@/lib/types";

/**
 * The authed equivalent of the public `/people/[id]` profile's card
 * drill-down, shown inline below the Arbre view instead of navigating —
 * a private person has no public profile to link to, so clicking their
 * tree node opens this panel instead (using data the tree page already
 * loaded, no extra request).
 */
export function TreePersonPanel({
  person,
  people,
  relationships,
  onSelectPerson,
  onClose,
}: {
  person: Person;
  people: Person[];
  relationships: Relationship[];
  onSelectPerson: (person: Person) => void;
  onClose?: () => void;
}) {
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const { parents, spouses, children } = useMemo(
    () => categorizeRelationships(relationships, person.id, peopleById),
    [relationships, person.id, peopleById],
  );

  return (
    <div className="flex flex-col gap-4 border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <PersonCard person={person} static />
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-2 font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fermer"
          >
            ✕
          </button>
        )}
      </div>

      {parents.length > 0 && (
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Parents
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {parents.map((p) => (
              <PersonCard key={p.id} person={p} onClick={onSelectPerson} />
            ))}
          </div>
        </div>
      )}

      {spouses.length > 0 && (
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Conjoint·e·s
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {spouses.map((p) => (
              <PersonCard key={p.id} person={p} onClick={onSelectPerson} />
            ))}
          </div>
        </div>
      )}

      {children.length > 0 && (
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Enfants
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {children.map((p) => (
              <PersonCard key={p.id} person={p} onClick={onSelectPerson} />
            ))}
          </div>
        </div>
      )}

      {parents.length === 0 && spouses.length === 0 && children.length === 0 && (
        <p className="font-mono text-xs text-muted-foreground">Aucune relation connue.</p>
      )}
    </div>
  );
}
