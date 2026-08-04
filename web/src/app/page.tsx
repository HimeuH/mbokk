import Link from "next/link";
import { PhotoFrame } from "@/components/photo-frame";
import { Seal } from "@/components/seal";
import { buttonVariants } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import type { Person, SearchResults } from "@/lib/types";

// Illustrative only — every field the fallback card can render is filled
// in, but no id/tree/created_by is real. Labelled "Spécimen" in the UI so
// it's never mistaken for a seeded person. Used only if the live search
// below finds nothing (e.g. a fresh install with no tree seeded yet) — a
// real public fiche is more convincing than an abstract placeholder, so
// that's preferred whenever one exists.
const SPECIMEN_PERSON: Person = {
  id: 0,
  owning_family_tree_id: 0,
  first_name: "Prénom",
  last_name: "Nom",
  gender: "female",
  birth_date: null,
  death_date: null,
  bio: null,
  photo_url: null,
  is_public: true,
  created_by: 0,
};

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function HeroCard({ person }: { person: Person | null }) {
  const isExample = person !== null;
  const displayed = person ?? SPECIMEN_PERSON;

  const card = (
    <div className="rotate-1 border border-border bg-card p-5 shadow-lg">
      <p className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
        {isExample
          ? `N° ${String(displayed.id).padStart(3, "0")} · Exemple`
          : "N° 014 · Spécimen"}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <PhotoFrame person={displayed} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold text-foreground/80">
            {displayed.first_name} {displayed.last_name}
          </p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {isExample && displayed.bio ? truncate(displayed.bio, 48) : "2 enfants · 1 union"}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-dashed border-border pt-3">
        <Seal status="stamped" size="sm" />
        <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          Fiche scellée
        </span>
      </div>
    </div>
  );

  return isExample ? (
    <Link href={`/people/${displayed.id}`} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}

const STEPS: { seal: "pending" | "half" | "stamped"; title: string; body: string }[] = [
  {
    seal: "pending",
    title: "Un proche invite",
    body: "On rejoint un registre par lien d'invitation — sans mot de passe ni SMS, juste un lien partagé par la personne qui tient déjà le registre.",
  },
  {
    seal: "half",
    title: "On propose",
    body: "Ajouter une naissance, corriger une fiche, relier deux familles : chaque écriture part en attente de validation.",
  },
  {
    seal: "stamped",
    title: "Le registre est scellé",
    body: "La personne responsable appose son code à quatre chiffres, et la proposition devient une fiche du registre.",
  },
];

const FEATURES = [
  {
    label: "Vie privée par personne",
    body: "Chaque fiche est publique ou privée — pas le registre entier. On choisit qui apparaît dans les recherches.",
  },
  {
    label: "Familles reliées",
    body: "Un mariage relie deux registres sans dupliquer personne : la même personne reste unique, vue depuis deux lignées.",
  },
  {
    label: "Plusieurs unions",
    body: "La polygamie est prise en charge nativement — une fiche peut porter plusieurs unions, aucune ne s'efface au profit d'une autre.",
  },
  {
    label: "Le griot raconte",
    body: "Depuis une fiche, la lignée se lit aussi comme un récit — parents, union, descendance — plutôt qu'un tableau.",
  },
];

// Public, SEO-driven page (Architecture Laws) — server-rendered, no auth.
export default async function Home() {
  const results = await apiFetch<SearchResults>(
    `/api/search?q=${encodeURIComponent("Ahmadou Bamba")}`,
  ).catch(() => null);
  const examplePerson = results?.people[0] ?? null;

  return (
    <div className="flex flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-col-reverse items-center gap-10 px-6 py-16 sm:px-8 lg:flex-row lg:py-24">
        <div className="flex flex-1 flex-col items-start gap-5">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Registre de famille numérique du Sénégal
          </p>
          <h1 className="max-w-xl font-display text-4xl font-semibold text-balance sm:text-5xl">
            Le registre, pas le tableau de bord.
          </h1>
          <p className="max-w-md text-muted-foreground">
            Mbokk conserve les parents, les enfants, les unions et les alliances entre familles —
            comme un livret qu&apos;on tient à jour ensemble, une génération à la fois.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/search" className={buttonVariants({ size: "lg" })}>
              Consulter le registre
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Ouvrir mon registre
            </Link>
          </div>
        </div>

        <div className="w-full max-w-xs shrink-0 lg:w-72">
          <HeroCard person={examplePerson} />
        </div>
      </section>

      <section className="border-t border-border px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Comment ça marche
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Seal status={step.seal} />
                  <span className="font-mono text-xs text-muted-foreground">Étape {i + 1}</span>
                </div>
                <h3 className="font-display text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border px-6 py-16 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Ce que garde le registre
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.label} className="border-l-2 border-accent pl-4">
                <h3 className="font-display text-lg font-semibold">{feature.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-primary px-6 py-16 text-primary-foreground sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-4">
          <h2 className="max-w-lg font-display text-2xl font-semibold text-balance">
            Aucun SMS. Aucun mot de passe. Un lien pour rejoindre, un code à quatre chiffres pour
            signer et se reconnecter.
          </h2>
          <Link href="/login" className={buttonVariants({ variant: "secondary", size: "lg" })}>
            Commencer un registre
          </Link>
        </div>
      </section>
    </div>
  );
}
