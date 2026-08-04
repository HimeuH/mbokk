"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError, firstErrorMessage } from "@/lib/api-client";
import { isEditProposal, type Person, type Relationship, type RelationshipType } from "@/lib/types";

const PROPOSAL_SUBMITTED_MESSAGE =
  "Proposition envoyée — en attente de l'approbation d'un·e administrateur·rice.";

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

export function PersonRelationships({ person }: { person: Person }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<RelationshipType>("parent_of");
  const [selected, setSelected] = useState<Person | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const { data: relationships } = useQuery({
    queryKey: ["relationships", person.id],
    queryFn: () => apiFetch<Relationship[]>(`/api/people/${person.id}/relationships`),
  });

  const { data: results } = useQuery({
    queryKey: ["people-search", query],
    queryFn: () => apiFetch<Person[]>(`/api/people/search?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length >= 2,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["relationships", person.id] });

  const addRelationship = useMutation({
    mutationFn: () =>
      apiFetch<Relationship>(`/api/people/${person.id}/relationships`, {
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
          <Input
            placeholder="Chercher une personne (toutes familles)…"
            value={selected ? `${selected.first_name} ${selected.last_name}` : query}
            onChange={(e) => {
              setSelected(null);
              setQuery(e.target.value);
            }}
          />
        </div>

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
      </div>
    </div>
  );
}
