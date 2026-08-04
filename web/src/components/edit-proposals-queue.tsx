"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PinKeypad } from "@/components/pin-keypad";
import { Seal } from "@/components/seal";
import { apiFetch, ApiError, firstErrorMessage } from "@/lib/api-client";
import type { AuthUser, EditProposal } from "@/lib/types";

const ACTION_LABELS: Record<EditProposal["action"], string> = {
  create: "Création",
  update: "Modification",
  delete: "Suppression",
};

const TARGET_LABELS: Record<EditProposal["target_type"], string> = {
  person: "personne",
  relationship: "relation",
};

function proposalTag(proposal: EditProposal): string {
  return `${ACTION_LABELS[proposal.action]} · ${TARGET_LABELS[proposal.target_type]}`;
}

function proposalTitle(proposal: EditProposal): string {
  const fields = proposal.fields;

  if (fields && typeof fields.first_name === "string") {
    return `${fields.first_name} ${fields.last_name ?? ""}`.trim();
  }
  if (fields && typeof fields.related_person_id === "number") {
    return `Vers la personne #${fields.related_person_id} (${fields.type ?? ""})`;
  }
  return `#${proposal.target_id ?? "nouveau"}`;
}

function relativeTime(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

type PendingAction = { id: number; action: "approve" | "reject" };

export function EditProposalsQueue({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const [pinTarget, setPinTarget] = useState<PendingAction | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  const { data: proposals, isLoading } = useQuery({
    queryKey: ["proposals", slug],
    queryFn: () =>
      apiFetch<EditProposal[]>(`/api/trees/${slug}/proposals?status=pending`),
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<AuthUser>("/api/user"),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["proposals", slug] });
    // An approved proposal changes the person/relationship data too.
    queryClient.invalidateQueries({ queryKey: ["trees", slug] });
    queryClient.invalidateQueries({ queryKey: ["me"] });
  };

  const review = useMutation({
    mutationFn: ({ id, action, pin }: PendingAction & { pin: string }) =>
      apiFetch<EditProposal>(`/api/proposals/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ pin }),
      }),
    onSuccess: () => {
      setPinError(null);
      setPinTarget(null);
      invalidate();
    },
    onError: (err: ApiError) => setPinError(firstErrorMessage(err)),
  });

  return (
    <section className="border border-border bg-card p-6">
      <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        Propositions en attente
      </h2>

      <ul className="mt-4 flex flex-col gap-3">
        {isLoading && (
          <li className="font-mono text-xs text-muted-foreground">
            Chargement…
          </li>
        )}
        {proposals?.length === 0 && (
          <li className="font-mono text-xs text-muted-foreground">
            Aucune proposition en attente.
          </li>
        )}
        {proposals?.map((proposal) => (
          <li key={proposal.id} className="flex flex-col gap-3 border border-border bg-background p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[0.65rem] uppercase tracking-wider text-accent">
                  {proposalTag(proposal)}
                </p>
                <p className="truncate font-display font-semibold">
                  {proposalTitle(proposal)}
                </p>
              </div>
              <Seal status="pending" size="sm" />
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              Proposé par{" "}
              {proposal.proposer?.name
                ? `${proposal.proposer.name} (${proposal.proposer.phone})`
                : (proposal.proposer?.phone ?? `#${proposal.proposer?.id}`)}{" "}
              · {relativeTime(proposal.created_at)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPinError(null);
                  setPinTarget({ id: proposal.id, action: "approve" });
                }}
              >
                Valider
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setPinError(null);
                  setPinTarget({ id: proposal.id, action: "reject" });
                }}
              >
                Rejeter
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <PinKeypad
        open={pinTarget !== null}
        onOpenChange={(open) => !open && setPinTarget(null)}
        mode={me?.has_pin ? "confirm" : "create"}
        title={pinTarget?.action === "reject" ? "Confirmer le rejet" : "Confirmer la validation"}
        error={pinError}
        pending={review.isPending}
        onSubmit={(pin) => {
          if (!pinTarget) return;
          review.mutate({ ...pinTarget, pin });
        }}
      />
    </section>
  );
}
