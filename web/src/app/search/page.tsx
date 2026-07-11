import type { Metadata } from "next";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import type { SearchResults } from "@/lib/types";

export const metadata: Metadata = {
  title: "Recherche — Mbokk",
};

// Public, SEO-driven page (Architecture Laws) — server-rendered, no auth.
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results =
    query.length >= 2
      ? await apiFetch<SearchResults>(`/api/search?q=${encodeURIComponent(query)}`)
      : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Mbokk · Recherche
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-balance">
          {query ? `Résultats pour « ${query} »` : "Rechercher"}
        </h1>
      </header>

      {!results && (
        <p className="font-mono text-xs text-muted-foreground">
          Entrez au moins deux caractères pour lancer une recherche.
        </p>
      )}

      {results && (
        <>
          <section>
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Personnes
            </h2>
            <ul className="mt-2 flex flex-col divide-y divide-border border border-border">
              {results.people.length === 0 && (
                <li className="p-4 font-mono text-xs text-muted-foreground">
                  Aucune personne publique trouvée.
                </li>
              )}
              {results.people.map((person) => (
                <li key={person.id} className="flex items-center justify-between p-4">
                  <span>
                    {person.first_name} {person.last_name}
                  </span>
                  {person.family_tree && (
                    <Link
                      href={`/trees/${person.family_tree.slug}`}
                      className="font-mono text-xs uppercase tracking-wider text-accent"
                    >
                      {person.family_tree.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Registres
            </h2>
            <ul className="mt-2 flex flex-col divide-y divide-border border border-border">
              {results.trees.length === 0 && (
                <li className="p-4 font-mono text-xs text-muted-foreground">
                  Aucun registre trouvé.
                </li>
              )}
              {results.trees.map((tree) => (
                <li key={tree.id}>
                  <Link
                    href={`/trees/${tree.slug}`}
                    className="flex items-center justify-between p-4 hover:bg-muted"
                  >
                    <span>{tree.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
