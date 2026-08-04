"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError, firstErrorMessage } from "@/lib/api-client";
import type { InviteResult, TreeMember, TreeRole } from "@/lib/types";

const ROLE_LABELS: Record<TreeRole, string> = {
  owner: "Propriétaire",
  admin: "Administrateur·rice",
  contributor: "Contributeur·rice",
};

export function TreeMembers({ slug, treeName }: { slug: string; treeName: string }) {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Extract<TreeRole, "admin" | "contributor">>(
    "contributor",
  );
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [invitedPhone, setInvitedPhone] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: members, isLoading } = useQuery({
    queryKey: ["tree-members", slug],
    queryFn: () => apiFetch<TreeMember[]>(`/api/trees/${slug}/members`),
  });

  const invite = useMutation({
    mutationFn: () =>
      apiFetch<InviteResult>(`/api/trees/${slug}/members`, {
        method: "POST",
        body: JSON.stringify({ phone, role }),
      }),
    onSuccess: ({ invite_url }) => {
      setError(null);
      setCopied(false);
      setInviteUrl(invite_url);
      setInvitedPhone(phone);
      setPhone("");
      queryClient.invalidateQueries({ queryKey: ["tree-members", slug] });
    },
    onError: (err: ApiError) => {
      setInviteUrl(null);
      setError(firstErrorMessage(err));
    },
  });

  // wa.me wants the destination number as bare digits (country code, no "+",
  // spaces or leading zeros) — this still just opens WhatsApp with the
  // message pre-typed in the admin's own account, they tap send themselves,
  // same "the app never sends anything itself" rule as the invite link.
  const whatsappUrl = (() => {
    if (!inviteUrl || !invitedPhone) return null;
    const digits = invitedPhone.replace(/\D/g, "");
    if (!digits) return null;
    const message = [
      `Bonjour ! Vous êtes invité·e à rejoindre le registre familial « ${treeName} » sur Mbokk.`,
      "",
      `Ouvrez ce lien pour rejoindre : ${inviteUrl}`,
      "",
      "Lien à usage unique, valable 7 jours.",
    ].join("\n");
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  })();

  const copyInviteLink = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
  };

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

      {inviteUrl && (
        <div className="mt-3 flex flex-col gap-2 border border-accent/40 bg-accent/10 p-3">
          <p className="font-mono text-xs text-muted-foreground">
            Invitation prête, à usage unique et valable 7 jours —
            l&apos;application ne l&apos;envoie pas elle-même, c&apos;est
            vous qui l&apos;envoyez.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ size: "sm" })}
              >
                Envoyer via WhatsApp
              </a>
            )}
            <Button type="button" size="sm" variant="outline" onClick={copyInviteLink}>
              {copied ? "Copié !" : "Copier le lien (pour l'envoyer autrement)"}
            </Button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </section>
  );
}
