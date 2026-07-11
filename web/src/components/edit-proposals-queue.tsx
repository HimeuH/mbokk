"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { EditProposal } from "@/lib/types";

const ACTION_LABELS: Record<EditProposal["action"], string> = {
  create: "Création",
  update: "Modification",
  delete: "Suppression",
};

const TARGET_LABELS: Record<EditProposal["target_type"], string> = {
  person: "personne",
  relationship: "relation",
};

function proposalSummary(proposal: EditProposal): string {
  const label = `${ACTION_LABELS[proposal.action]} · ${TARGET_LABELS[proposal.target_type]}`;
  const fields = proposal.fields;

  if (fields && typeof fields.first_name === "string") {
    return `${label} — ${fields.first_name} ${fields.last_name ?? ""}`.trim();
  }
  if (fields && typeof fields.related_person_id === "number") {
    return `${label} — vers la personne #${fields.related_person_id} (${fields.type ?? ""})`;
  }
  return `${label} — #${proposal.target_id ?? "nouveau"}`;
}

export function EditProposalsQueue({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: proposals, isLoading } = useQuery({
    queryKey: ["proposals", slug],
    queryFn: () =>
      apiFetch<EditProposal[]>(`/api/trees/${slug}/proposals?status=pending`),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["proposals", slug] });
    // An approved proposal changes the person/relationship data too.
    queryClient.invalidateQueries({ queryKey: ["trees", slug] });
  };

  const approve = useMutation({
    mutationFn: (id: number) =>
      apiFetch<EditProposal>(`/api/proposals/${id}/approve`, { method: "POST" }),
    onSuccess: invalidate,
    onError: (err: ApiError) => setError(err.message),
  });

  const reject = useMutation({
    mutationFn: (id: number) =>
      apiFetch<EditProposal>(`/api/proposals/${id}/reject`, { method: "POST" }),
    onSuccess: invalidate,
    onError: (err: ApiError) => setError(err.message),
  });

  return (
    <section className="border border-border bg-card p-6">
      <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        Propositions en attente
      </h2>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <ul className="mt-4 flex flex-col divide-y divide-border border border-border">
        {isLoading && (
          <li className="p-3 font-mono text-xs text-muted-foreground">
            Chargement…
          </li>
        )}
        {proposals?.length === 0 && (
          <li className="p-3 font-mono text-xs text-muted-foreground">
            Aucune proposition en attente.
          </li>
        )}
        {proposals?.map((proposal) => (
          <li key={proposal.id} className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p>{proposalSummary(proposal)}</p>
              <p className="font-mono text-xs text-muted-foreground">
                Proposé par {proposal.proposer?.name ?? `#${proposal.proposer?.id}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={approve.isPending || reject.isPending}
                onClick={() => approve.mutate(proposal.id)}
              >
                Approuver
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={approve.isPending || reject.isPending}
                onClick={() => reject.mutate(proposal.id)}
              >
                Rejeter
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
