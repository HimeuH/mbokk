export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <main className="flex flex-1 flex-col items-start justify-center gap-3 px-8">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Registre de famille numérique du Sénégal
        </p>
        <h1 className="max-w-xl text-3xl font-semibold text-balance">
          Le registre, pas le tableau de bord.
        </h1>
      </main>
    </div>
  );
}
