import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GriotTrigger } from "@/components/griot-trigger";
import { PersonCard } from "@/components/person-card";
import { PhotoFrame } from "@/components/photo-frame";
import { Seal } from "@/components/seal";
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
  // Spouses aren't listed on their own anymore — a spouse who's also a
  // parent surfaces naturally when their child's own fiche is opened
  // (Parents section there). The one gap that leaves: a spouse with no
  // shared children yet would otherwise never appear anywhere on this
  // profile, so that specific case gets a compact fallback line instead of
  // a full section (docs/mobile-design-implementation-plan.md WP-0(b)).
  const showSpouseFallback = spouses.length > 0 && children.length === 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex items-center gap-4">
        <PhotoFrame person={person} />
        <div>
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Mbokk · Profil
            <Seal status="stamped" size="sm" />
            <span>Public</span>
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

      <GriotTrigger
        person={person}
        relationships={relationships}
        categorized={{ parents, spouses, children }}
      />

      <section>
        <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Parents
        </h2>
        {parents.length > 0 ? (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {parents.map((parent) => (
              <div key={parent.id} className="flex flex-col gap-1">
                <PersonCard person={parent} />
                {parent.family_tree && person.family_tree && parent.family_tree.slug !== person.family_tree.slug && (
                  <span className="w-fit rounded-full border border-primary px-2 py-0.5 font-mono text-[0.6rem] text-primary">
                    Registre {parent.family_tree.name}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 font-mono text-xs text-muted-foreground italic">
            Souche du registre — aucun parent enregistré.
          </p>
        )}
      </section>

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

      {showSpouseFallback && (
        <p className="font-mono text-xs text-muted-foreground">
          Marié·e à{" "}
          {spouses.map((spouse, i) => (
            <span key={spouse.id}>
              {i > 0 && ", "}
              <Link href={`/people/${spouse.id}`} className="text-accent underline underline-offset-4">
                {spouse.first_name} {spouse.last_name}
              </Link>
              {spouse.family_tree && person.family_tree && spouse.family_tree.slug !== person.family_tree.slug && (
                <span className="ml-1 rounded-full border border-primary px-1.5 py-0.5 text-[0.6rem] text-primary">
                  {spouse.family_tree.name}
                </span>
              )}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
