import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PersonCard } from "@/components/person-card";
import { apiFetch, ApiError } from "@/lib/api-client";
import { categorizeRelationships } from "@/lib/relationships";
import type { Person, Relationship } from "@/lib/types";

interface ProfileResponse {
  person: Person;
  relationships: Relationship[];
}

async function getProfile(id: string): Promise<ProfileResponse | null> {
  try {
    return await apiFetch<ProfileResponse>(`/api/people/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) return { title: "Personne introuvable — Mbokk" };
  return { title: `${profile.person.first_name} ${profile.person.last_name} — Mbokk` };
}

// Public, SEO-driven profile page (Architecture Laws) — server-rendered, no auth.
export default async function PersonProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const { person, relationships } = profile;

  const peopleById = new Map<number, Person>();
  for (const rel of relationships) {
    peopleById.set(rel.person.id, rel.person);
    peopleById.set(rel.related_person.id, rel.related_person);
  }
  const { parents, spouses, children } = categorizeRelationships(
    relationships,
    person.id,
    peopleById,
  );
  const hasNoRelations = parents.length === 0 && spouses.length === 0 && children.length === 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex items-center gap-4">
        {person.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.photo_url}
            alt=""
            className="size-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent/15 font-display text-2xl text-accent">
            {person.first_name.charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Mbokk · Profil
          </p>
          <h1 className="font-display text-3xl font-semibold text-balance">
            {person.first_name} {person.last_name}
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            {person.birth_date ?? "?"} – {person.death_date ?? "présent"}
          </p>
        </div>
      </header>

      {person.family_tree && (
        <Link
          href={`/trees/${person.family_tree.slug}`}
          className="-mt-4 w-fit font-mono text-xs uppercase tracking-wider text-accent"
        >
          {person.family_tree.name}
        </Link>
      )}

      {person.bio && <p className="text-muted-foreground">{person.bio}</p>}

      {hasNoRelations && (
        <p className="font-mono text-xs text-muted-foreground">
          Aucune relation publique connue.
        </p>
      )}

      {parents.length > 0 && (
        <section>
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Parents
          </h2>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {parents.map((parent) => (
              <PersonCard key={parent.id} person={parent} />
            ))}
          </div>
        </section>
      )}

      {spouses.length > 0 && (
        <section>
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Conjoint·e·s
          </h2>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {spouses.map((spouse) => (
              <PersonCard key={spouse.id} person={spouse} />
            ))}
          </div>
        </section>
      )}

      {children.length > 0 && (
        <section>
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Enfants
          </h2>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            {children.map((child) => (
              <PersonCard key={child.id} person={child} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
