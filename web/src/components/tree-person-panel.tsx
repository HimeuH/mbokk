"use client";

import { useMemo, useState } from "react";
import { GriotMode } from "@/components/griot-mode";
import { PersonCard } from "@/components/person-card";
import { PhotoFrame } from "@/components/photo-frame";
import { Seal } from "@/components/seal";
import { Button } from "@/components/ui/button";
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
  const [griotOpen, setGriotOpen] = useState(false);
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const { parents, spouses, children } = useMemo(
    () => categorizeRelationships(relationships, person.id, peopleById),
    [relationships, person.id, peopleById],
  );
  // Same fallback as the public profile (WP-0(b)) — a spouse with no shared
  // children yet would otherwise never surface anywhere on this panel.
  const showSpouseFallback = spouses.length > 0 && children.length === 0;

  return (
    <div className="flex flex-col gap-4 border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <PhotoFrame person={person} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-mono text-[0.65rem] text-muted-foreground">
            <Seal status={person.is_public ? "stamped" : "pending"} size="sm" />
            {person.is_public ? "Public" : "Privé"}
          </p>
          <p className="truncate font-display text-lg font-semibold">
            {person.first_name} {person.last_name}
          </p>
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

      <Button variant="outline" size="sm" className="w-fit" onClick={() => setGriotOpen(true)}>
        Raconter cette lignée
      </Button>
      <GriotMode
        open={griotOpen}
        onOpenChange={setGriotOpen}
        person={person}
        relationships={relationships}
        categorized={{ parents, spouses, children }}
      />

      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Parents
        </p>
        {parents.length > 0 ? (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {parents.map((p) => (
              <PersonCard key={p.id} person={p} onClick={onSelectPerson} />
            ))}
          </div>
        ) : (
          <p className="mt-2 font-mono text-xs text-muted-foreground italic">
            Souche du registre — aucun parent enregistré.
          </p>
        )}
      </div>

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

      {showSpouseFallback && (
        <p className="font-mono text-xs text-muted-foreground">
          Marié·e à{" "}
          {spouses.map((spouse, i) => (
            <span key={spouse.id}>
              {i > 0 && ", "}
              <button
                type="button"
                onClick={() => onSelectPerson(spouse)}
                className="text-accent underline underline-offset-4"
              >
                {spouse.first_name} {spouse.last_name}
              </button>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
