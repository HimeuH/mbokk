"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useRequireAuth } from "@/lib/use-require-auth";
import type { Person, RelationshipPathResult, RelationshipPathStep } from "@/lib/types";

function PersonPicker({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: Person | null;
  onSelect: (person: Person | null) => void;
}) {
  const [query, setQuery] = useState("");

  const { data: results } = useQuery({
    queryKey: ["people-search", query],
    queryFn: () => apiFetch<Person[]>(`/api/people/search?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length >= 2,
  });

  return (
    <div className="flex flex-1 flex-col gap-2">
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
      <Input
        placeholder="Chercher une personne (toutes familles)…"
        value={selected ? `${selected.first_name} ${selected.last_name}` : query}
        onChange={(e) => {
          onSelect(null);
          setQuery(e.target.value);
        }}
      />
      {!selected && results && results.length > 0 && (
        <ul className="flex flex-col divide-y divide-border border border-border">
          {results.map((candidate) => (
            <li key={candidate.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between p-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onSelect(candidate);
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
    </div>
  );
}

function stepLabel(step: RelationshipPathStep): string {
  const [subject, object] =
    step.direction === "forward" ? [step.from, step.to] : [step.to, step.from];
  const relation =
    step.type === "spouse_of"
      ? "conjoint·e de"
      : step.direction === "forward"
        ? "parent de"
        : "enfant de";
  return `${subject.first_name} ${subject.last_name} — ${relation} — ${object.first_name} ${object.last_name}`;
}

export default function RelationshipFinderPage() {
  useRequireAuth();
  const [personA, setPersonA] = useState<Person | null>(null);
  const [personB, setPersonB] = useState<Person | null>(null);
  const [result, setResult] = useState<RelationshipPathResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const findPath = async () => {
    if (!personA || !personB) return;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiFetch<RelationshipPathResult>(
        `/api/people/${personA.id}/relationship/${personB.id}`,
      );
      setResult(data);
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Mbokk · Parenté
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-balance">
          Trouver un lien de parenté
        </h1>
      </header>

      <section className="border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          <PersonPicker label="Première personne" selected={personA} onSelect={setPersonA} />
          <PersonPicker label="Deuxième personne" selected={personB} onSelect={setPersonB} />
        </div>
        <Button
          className="mt-4"
          disabled={!personA || !personB || pending}
          onClick={findPath}
        >
          {pending ? "Recherche…" : "Trouver le lien"}
        </Button>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </section>

      {result && (
        <section className="border border-border bg-card p-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Résultat
          </h2>
          {result.path === null && (
            <p className="mt-3 text-sm text-muted-foreground">
              Aucun lien connu entre ces deux personnes.
            </p>
          )}
          {result.path?.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              C&apos;est la même personne.
            </p>
          )}
          {result.path && result.path.length > 0 && (
            <ol className="mt-3 flex flex-col gap-2">
              {result.path.map((step, index) => (
                <li key={index} className="text-sm">
                  {stepLabel(step)}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
