"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PersonForm, type PersonFormValues } from "@/components/person-form";
import { apiFetch, ApiError, firstErrorMessage } from "@/lib/api-client";
import {
  isEditProposal,
  type EditProposal,
  type Person,
  type Relationship,
  type RelationshipType,
} from "@/lib/types";

const PROPOSAL_SUBMITTED_MESSAGE =
  "Proposition envoyée — en attente de l'approbation d'un·e administrateur·rice.";

const PERSON_PROPOSAL_THEN_LINK_MESSAGE =
  "Personne proposée — en attente d'approbation. Une fois approuvée, revenez ici pour la lier.";

const TYPE_LABELS: Record<RelationshipType, string> = {
  parent_of: "parent de",
  spouse_of: "conjoint·e de",
};

function relationLabel(rel: Relationship, viewedPersonId: number): string {
  const isSource = rel.person_id === viewedPersonId;
  const other = isSource ? rel.related_person : rel.person;
  const label = isSource
    ? TYPE_LABELS[rel.type]
    : rel.type === "parent_of"
      ? "enfant de"
      : TYPE_LABELS[rel.type];
  return `${label} ${other.first_name} ${other.last_name}`;
}

export function PersonRelationships({ person, slug }: { person: Person; slug: string }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"link" | "create">("link");
  const [query, setQuery] = useState("");
  const [onlyThisFamily, setOnlyThisFamily] = useState(false);
  const [type, setType] = useState<RelationshipType>("parent_of");
  const [selected, setSelected] = useState<Person | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const { data: relationships } = useQuery({
    queryKey: ["relationships", person.id],
    queryFn: () => apiFetch<Relationship[]>(`/api/people/${person.id}/relationships`),
  });

  const { data: results } = useQuery({
    queryKey: ["people-search", query, onlyThisFamily],
    queryFn: () =>
      apiFetch<Person[]>(
        `/api/people/search?q=${encodeURIComponent(query)}${
          onlyThisFamily ? `&tree=${encodeURIComponent(slug)}` : ""
        }`,
      ),
    enabled: query.trim().length >= 2,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["relationships", person.id] });

  const addRelationship = useMutation({
    mutationFn: () =>
      apiFetch<Relationship | EditProposal>(`/api/people/${person.id}/relationships`, {
        method: "POST",
        body: JSON.stringify({ related_person_id: selected?.id, type }),
      }),
    onSuccess: (result) => {
      setError(null);
      setSelected(null);
      setQuery("");
      setInfo(isEditProposal(result) ? PROPOSAL_SUBMITTED_MESSAGE : null);
      invalidate();
    },
    onError: (err: ApiError) => setError(firstErrorMessage(err)),
  });

  const removeRelationship = useMutation({
    mutationFn: (relationshipId: number) =>
      apiFetch<Relationship | null>(`/api/people/${person.id}/relationships/${relationshipId}`, {
        method: "DELETE",
      }),
    onSuccess: (result) => {
      setInfo(isEditProposal(result) ? PROPOSAL_SUBMITTED_MESSAGE : null);
      invalidate();
    },
    onError: (err: ApiError) => setError(firstErrorMessage(err)),
  });

  // Creating a brand-new person who doesn't exist yet, then linking them —
  // the common case (a newborn, a known-but-unrecorded ancestor), instead of
  // the "create an orphaned person, then come back and link them" two-trip
  // dance. Chains two existing endpoints rather than adding a combined one:
  // a proposal can't reference a person who's *also* only a pending
  // proposal, so a contributor's new person stops after step one — the link
  // has to wait until an admin approves the person.
  const createAndLink = useMutation({
    mutationFn: async (formData: FormData) => {
      const created = await apiFetch<Person | EditProposal>(`/api/trees/${slug}/people`, {
        method: "POST",
        body: formData,
      });

      if (isEditProposal(created)) {
        return { linked: false as const };
      }

      const rel = await apiFetch<Relationship | EditProposal>(
        `/api/people/${person.id}/relationships`,
        {
          method: "POST",
          body: JSON.stringify({ related_person_id: created.id, type }),
        },
      );

      return { linked: true as const, proposal: isEditProposal(rel) };
    },
    onSuccess: (result) => {
      setError(null);
      setMode("link");
      if (!result.linked) {
        setInfo(PERSON_PROPOSAL_THEN_LINK_MESSAGE);
      } else {
        setInfo(result.proposal ? PROPOSAL_SUBMITTED_MESSAGE : null);
      }
      invalidate();
    },
    onError: (err: ApiError) => setError(firstErrorMessage(err)),
  });

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        Relations
      </p>

      {relationships?.length === 0 && (
        <p className="font-mono text-xs text-muted-foreground">Aucune relation.</p>
      )}
      <ul className="flex flex-col gap-1">
        {relationships?.map((rel) => (
          <li key={rel.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
            <span>{relationLabel(rel, person.id)}</span>
            <button
              type="button"
              className="font-mono text-xs text-muted-foreground underline underline-offset-4"
              onClick={() => removeRelationship.mutate(rel.id)}
            >
              retirer
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <div className="flex gap-2">
          <select
            className="h-8 border border-input bg-background px-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as RelationshipType)}
          >
            <option value="parent_of">Parent de…</option>
            <option value="spouse_of">Conjoint·e de…</option>
          </select>

          <div className="flex overflow-hidden rounded-tap border border-input">
            <button
              type="button"
              className={`px-2 text-xs ${mode === "link" ? "bg-muted font-medium" : "text-muted-foreground"}`}
              onClick={() => setMode("link")}
            >
              Existante
            </button>
            <button
              type="button"
              className={`px-2 text-xs ${mode === "create" ? "bg-muted font-medium" : "text-muted-foreground"}`}
              onClick={() => setMode("create")}
            >
              Nouvelle
            </button>
          </div>
        </div>

        {mode === "link" ? (
          <>
            <Input
              placeholder={
                onlyThisFamily ? "Chercher dans cette famille…" : "Chercher une personne (toutes familles)…"
              }
              value={selected ? `${selected.first_name} ${selected.last_name}` : query}
              onChange={(e) => {
                setSelected(null);
                setQuery(e.target.value);
              }}
            />

            <label className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={onlyThisFamily}
                onChange={(e) => {
                  setOnlyThisFamily(e.target.checked);
                  setSelected(null);
                }}
              />
              Uniquement dans cette famille
            </label>

            {!selected && results && results.length > 0 && (
              <ul className="flex flex-col divide-y divide-border border border-border">
                {results.map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between p-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setSelected(candidate);
                        setQuery("");
                      }}
                    >
                      <span>
                        {candidate.first_name} {candidate.last_name}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {candidate.family_tree?.name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            {info && <p className="text-sm text-accent">{info}</p>}

            <Button
              variant="outline"
              disabled={!selected || addRelationship.isPending}
              onClick={() => addRelationship.mutate()}
            >
              {addRelationship.isPending ? "Ajout…" : "Lier"}
            </Button>
          </>
        ) : (
          <>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {info && <p className="text-sm text-accent">{info}</p>}
            <PersonForm
              submitLabel={createAndLink.isPending ? "Création…" : "Créer et lier"}
              pending={createAndLink.isPending}
              error={null}
              onSubmit={(values: PersonFormValues) => createAndLink.mutate(values.formData)}
            />
          </>
        )}
      </div>
    </div>
  );
}
