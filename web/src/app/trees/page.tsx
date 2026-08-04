"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError, firstErrorMessage } from "@/lib/api-client";
import { useRequireAuth } from "@/lib/use-require-auth";
import type { FamilyTree } from "@/lib/types";

export default function TreesPage() {
  useRequireAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: trees, isLoading } = useQuery({
    queryKey: ["trees"],
    queryFn: () => apiFetch<FamilyTree[]>("/api/trees"),
  });

  const createTree = useMutation({
    mutationFn: () =>
      apiFetch<FamilyTree>("/api/trees", {
        method: "POST",
        body: JSON.stringify({ name, description: description || undefined }),
      }),
    onSuccess: () => {
      setError(null);
      setName("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["trees"] });
    },
    onError: (err: ApiError) => setError(firstErrorMessage(err)),
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Mbokk
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-balance">
          Mes registres
        </h1>
      </header>

      <section className="border border-border bg-card p-6">
        <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Créer un registre
        </h2>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            createTree.mutate();
          }}
        >
          <label className="flex flex-1 flex-col gap-2">
            <span className="font-mono text-xs text-muted-foreground">Nom</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Famille Diop"
              required
            />
          </label>
          <label className="flex flex-1 flex-col gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              Description (optionnel)
            </span>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={createTree.isPending}>
            {createTree.isPending ? "Création…" : "Créer"}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </section>

      <section className="flex flex-col divide-y divide-border border border-border">
        {isLoading && (
          <p className="p-4 font-mono text-xs text-muted-foreground">
            Chargement…
          </p>
        )}
        {trees?.length === 0 && (
          <p className="p-4 font-mono text-xs text-muted-foreground">
            Aucun registre pour l&apos;instant.
          </p>
        )}
        {trees?.map((tree) => (
          <Link
            key={tree.id}
            href={`/trees/${tree.slug}`}
            className="flex items-center justify-between gap-4 p-4 hover:bg-muted"
          >
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold">
                {tree.name}
              </p>
              {tree.description && (
                <p className="truncate text-sm text-muted-foreground">
                  {tree.description}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!!tree.pending_access_requests_count && (
                <span className="rounded-full bg-primary px-2.5 py-0.5 font-mono text-[0.65rem] font-medium text-primary-foreground">
                  {tree.pending_access_requests_count}{" "}
                  demande{tree.pending_access_requests_count > 1 ? "s" : ""}
                </span>
              )}
              {!!tree.pending_proposals_count && (
                <span className="rounded-full bg-accent px-2.5 py-0.5 font-mono text-[0.65rem] font-medium text-accent-foreground">
                  {tree.pending_proposals_count}{" "}
                  proposition{tree.pending_proposals_count > 1 ? "s" : ""}
                </span>
              )}
              <span className="font-mono text-xs tracking-wider text-accent uppercase">
                {tree.role}
              </span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
