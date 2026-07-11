import Link from "next/link";

export default function PersonNotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Mbokk · Profil
      </p>
      <h1 className="font-display text-2xl font-semibold text-balance">
        Cette personne n&apos;existe pas ou n&apos;est pas publique.
      </h1>
      <Link href="/search" className="font-mono text-xs text-accent underline underline-offset-4">
        Retour à la recherche
      </Link>
    </div>
  );
}
