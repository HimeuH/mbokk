"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError, firstErrorMessage } from "@/lib/api-client";
import type { AccessRequest, InviteResult } from "@/lib/types";

/**
 * The admin-facing side of the self-serve recovery flow
 * (`/trees/[slug]/request-access`, docs/mvp-plan.md Phase 2). No PIN here —
 * that's scoped to stamping edit proposals only, not this.
 */
export function AccessRequestsQueue({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["access-requests", slug],
    queryFn: () => apiFetch<AccessRequest[]>(`/api/trees/${slug}/access-requests`),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["access-requests", slug] });
    queryClient.invalidateQueries({ queryKey: ["trees"] });
  };

  const invite = useMutation({
    mutationFn: (phone: string) =>
      apiFetch<InviteResult>(`/api/trees/${slug}/members`, {
        method: "POST",
        body: JSON.stringify({ phone, role: "contributor" }),
      }),
    onSuccess: invalidate,
    onError: (err: ApiError) => setError(firstErrorMessage(err)),
  });

  const dismiss = useMutation({
    mutationFn: (id: number) =>
      apiFetch<AccessRequest>(`/api/access-requests/${id}/dismiss`, { method: "POST" }),
    onSuccess: invalidate,
    onError: (err: ApiError) => setError(firstErrorMessage(err)),
  });

  if (!isLoading && requests?.length === 0) return null;

  return (
    <section className="border border-border bg-card p-6">
      <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        Demandes d&apos;accès
      </h2>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <ul className="mt-4 flex flex-col divide-y divide-border border border-border">
        {isLoading && (
          <li className="p-3 font-mono text-xs text-muted-foreground">
            Chargement…
          </li>
        )}
        {requests?.map((req) => (
          <li key={req.id} className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono">{req.phone}</p>
              {req.message && (
                <p className="text-muted-foreground">{req.message}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={invite.isPending || dismiss.isPending}
                onClick={() => invite.mutate(req.phone)}
              >
                Inviter (contributeur·rice)
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={invite.isPending || dismiss.isPending}
                onClick={() => dismiss.mutate(req.id)}
              >
                Ignorer
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
