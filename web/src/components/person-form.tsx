"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Person } from "@/lib/types";

export interface PersonFormValues {
  formData: FormData;
}

interface PersonFormProps {
  initial?: Person;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  onSubmit: (values: PersonFormValues) => void;
}

export function PersonForm({
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
}: PersonFormProps) {
  const [firstName, setFirstName] = useState(initial?.first_name ?? "");
  const [lastName, setLastName] = useState(initial?.last_name ?? "");
  const [gender, setGender] = useState<"male" | "female">(
    initial?.gender ?? "male",
  );
  const [birthDate, setBirthDate] = useState(initial?.birth_date ?? "");
  const [deathDate, setDeathDate] = useState(initial?.death_date ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? true);
  const [photo, setPhoto] = useState<File | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.set("first_name", firstName);
        formData.set("last_name", lastName);
        formData.set("gender", gender);
        if (birthDate) formData.set("birth_date", birthDate);
        if (deathDate) formData.set("death_date", deathDate);
        if (bio) formData.set("bio", bio);
        formData.set("is_public", isPublic ? "1" : "0");
        if (photo) formData.set("photo", photo);
        onSubmit({ formData });
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs text-muted-foreground">Prénom</span>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs text-muted-foreground">Nom</span>
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-mono text-xs text-muted-foreground">Genre</span>
        <select
          className="h-8 border border-input bg-background px-2 text-sm"
          value={gender}
          onChange={(e) => setGender(e.target.value as "male" | "female")}
        >
          <option value="male">Homme</option>
          <option value="female">Femme</option>
        </select>
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            Naissance
          </span>
          <Input
            type="date"
            value={birthDate ?? ""}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs text-muted-foreground">Décès</span>
          <Input
            type="date"
            value={deathDate ?? ""}
            onChange={(e) => setDeathDate(e.target.value)}
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-mono text-xs text-muted-foreground">
          Biographie
        </span>
        <textarea
          className="min-h-20 border border-input bg-background p-2 text-sm"
          value={bio ?? ""}
          onChange={(e) => setBio(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-mono text-xs text-muted-foreground">Photo</span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
      </label>

      <label className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
        />
        Profil public (recherche, SEO)
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : submitLabel}
      </Button>
    </form>
  );
}
