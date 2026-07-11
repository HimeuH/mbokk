"use client";

export default function PersonProfileError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-16">
      <p className="text-sm text-destructive">
        Impossible de charger ce profil pour le moment.
      </p>
      <button
        type="button"
        className="w-fit font-mono text-xs text-accent underline underline-offset-4"
        onClick={reset}
      >
        Réessayer
      </button>
    </div>
  );
}
