"use client";

import { useState } from "react";
import { GriotMode } from "@/components/griot-mode";
import { Button } from "@/components/ui/button";
import type { Person, Relationship } from "@/lib/types";

/**
 * Thin client wrapper so the server-rendered public profile can mount the
 * CTA without itself becoming a client component just to hold `open` state.
 */
export function GriotTrigger({
  person,
  relationships,
  categorized,
}: {
  person: Person;
  relationships: Relationship[];
  categorized: { parents: Person[]; spouses: Person[]; children: Person[] };
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Raconter cette lignée
      </Button>
      <GriotMode
        open={open}
        onOpenChange={setOpen}
        person={person}
        relationships={relationships}
        categorized={categorized}
      />
    </>
  );
}
