"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthStatus } from "@/components/auth-status";
import { Input } from "@/components/ui/input";

export function Nav() {
  const t = useTranslations("Nav");
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-8">
      <Link href="/" className="font-display text-lg font-semibold">
        Mbokk<span className="text-accent">·</span>
      </Link>

      <form
        className="order-3 w-full sm:order-none sm:w-auto sm:flex-1 sm:max-w-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim().length >= 2) {
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
          }
        }}
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search")}
        />
      </form>

      <AuthStatus />
    </header>
  );
}
