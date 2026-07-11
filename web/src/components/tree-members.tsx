"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { TreeMember, TreeRole } from "@/lib/types";

const ROLE_LABELS: Record<TreeRole, string> = {
  owner: "Propriétaire",
  admin: "Administrateur·rice",
  contributor: "Contributeur·rice",
};

export function TreeMembers({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Extract<TreeRole, "admin" | "contributor">>(
    "contributor",
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ["tree-members", slug],
    queryFn: () => apiFetch<TreeMember[]>(`/api/trees/${slug}/members`),
  });

  const invite = useMutation({
    mutationFn: () =>
      apiFetch<TreeMember>(`/api/trees/${slug}/members`, {
        method: "POST",
        body: JSON.stringify({ phone, role }),
      }),
    onSuccess: (member) => {
      setError(null);
      setMessage(`${member.user.phone} ajouté·e comme ${ROLE_LABELS[member.role].toLowerCase()}.`);
      setPhone("");
      queryClient.invalidateQueries({ queryKey: ["tree-members", slug] });
    },
    onError: (err: ApiError) => {
      setMessage(null);
      setError(err.message);
    },
  });

  return (
    <section className="border border-border bg-card p-6">
      <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        Membres
      </h2>

      <ul className="mt-4 flex flex-col divide-y divide-border border border-border">
        {isLoading && (
          <li className="p-3 font-mono text-xs text-muted-foreground">
            Chargement…
          </li>
        )}
        {members?.map((member) => (
          <li key={member.id} className="flex items-center justify-between p-3 text-sm">
            <span>{member.user.name ?? member.user.phone}</span>
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {ROLE_LABELS[member.role]}
            </span>
          </li>
        ))}
      </ul>

      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          invite.mutate();
        }}
      >
        <label className="flex flex-1 flex-col gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            Téléphone
          </span>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+221771234567"
            required
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs text-muted-foreground">Rôle</span>
          <select
            className="h-9 border border-input bg-background px-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
          >
            <option value="contributor">Contributeur·rice</option>
            <option value="admin">Administrateur·rice</option>
          </select>
        </label>
        <Button type="submit" disabled={invite.isPending}>
          {invite.isPending ? "Invitation…" : "Inviter"}
        </Button>
      </form>
      {message && <p className="mt-2 text-sm text-accent">{message}</p>}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </section>
  );
}
