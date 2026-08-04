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
                <li key={person.id}>
                  <Link
                    href={`/people/${person.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-muted"
                  >
                    {person.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={person.photo_url}
                        alt=""
                        className="size-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 font-display text-sm text-accent">
                        {person.first_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {person.first_name} {person.last_name}
                      </span>
                      {person.family_tree && (
                        <span className="block truncate font-mono text-xs text-muted-foreground">
                          {person.family_tree.name}
                        </span>
                      )}
                    </span>
                  </Link>
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
                <li key={tree.id} className="flex items-center justify-between p-4">
                  <Link href={`/trees/${tree.slug}`} className="hover:underline">
                    {tree.name}
                  </Link>
                  <Link
                    href={`/trees/${tree.slug}/request-access`}
                    className="font-mono text-xs text-accent underline underline-offset-4"
                  >
                    Demander l&apos;accès
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
