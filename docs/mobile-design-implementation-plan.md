# Mobile design implementation plan — "Le Livret"

Tracks rolling the mobile design direction (artifact: *Mbokk — Plan de design mobile*, 7 plates) into `/web`. Mirrors `docs/mvp-plan.md`'s phase/checkbox convention — check items off as they land; treat unchecked items as the backlog. This is a visual/UX layer on top of already-shipped Phases 0–7; it does not change the data model, and touches `/api` in exactly two bounded places (flagged in WP-0).

## WP-0 — Decisions to lock before touching code

- [x] **Spouse visibility gap.** Decision: **(b)** — fallback line, show a single "Marié·e à …" row only when `spouses.length > 0 && children.length === 0`, so no relationship silently disappears. Not yet applied in WP-D (still pending).
- [x] **Pending-proposal count on the dashboard.** Confirmed and implemented in WP-B.
- [x] **Griot mode scope for v1.** Confirmed: text-only, template-generated narration, "Maintenir pour écouter" ships inert. Not yet built (WP-E pending).
- [x] **Lineage rail scope.** Confirmed: `/trees/[slug]` only for v1. Not yet built (WP-C pending).

## WP-A — Foundation: tokens & primitives

Everything else depends on this landing first.

- [x] `web/src/app/globals.css` — added `--radius-tap: 0.6rem` in `@theme inline` (auto-generates the `rounded-tap` utility per Tailwind v4 convention). `--radius` untouched, still drives cards/entries/rows.
- [x] `web/src/components/ui/button.tsx` — labels now `font-mono uppercase tracking-wide text-xs`; base + size variants switched from `rounded-lg`/`var(--radius-md)` to `rounded-tap`/`var(--radius-tap)`.
- [x] `web/src/components/ui/input.tsx` — `rounded-lg` → `rounded-tap`. Left typography alone (mono-everywhere would hurt readability on free-text fields like names/descriptions; individual pages opt into mono per-field where the content is data, not prose).
- [x] New `web/src/components/seal.tsx` — `<Seal status="stamped" | "pending" | "half" size="sm" | "md" />`, built on semantic `--accent` (not raw `--brass` hex) so it already tracks dark mode.
- [x] New `web/src/components/photo-frame.tsx` — taped-photo hero treatment, `photo_url` with initial fallback. Not yet wired into any page (that's WP-D).

## WP-B — Dashboard ("Mes registres")

- [x] `api/app/Http/Resources/FamilyTreeResource.php` + `FamilyTreeController@index` — added `pending_proposals_count` via `withCount(['editProposals as pending_proposals_count' => ...->where('status','pending')])`, exposed only `when(pivot role !== 'contributor')`. `web/src/lib/types.ts`'s `FamilyTree` updated to match.
- [x] `web/src/app/trees/page.tsx` — tree name now `font-display`; brass pending-proposals pill added next to the role tag when `pending_proposals_count > 0`.

## WP-C — Registry detail & the lineage rail

- [x] New `web/src/components/lineage-rail.tsx` — persistent strip anchored on whichever person is currently focused: parents left, children right (tap either to refocus), a static focus avatar between them, uses `categorizeRelationships()` against data already loaded via `GET /trees/{slug}` (no new endpoint). Empty state text for root ancestors/childless leaves.
- [x] `web/src/app/trees/[slug]/page.tsx` — mounted above `TreePersonPanel`, both conditional on `selectedTreePerson`, sharing the same `onSelectPerson` setter.
- [x] ~~Add avatar to each relative row~~ — turned out to be a non-issue: `TreePersonPanel` already renders relatives through `PersonCard`, which has had a photo/initial avatar since Phase 7. The original bullet was written from the design artifact's assumption, not a check of the real component — worth remembering to verify before writing the plan next time, not just when building it.

## WP-D — Person fiche

- [x] `web/src/app/people/[id]/page.tsx` and `web/src/components/tree-person-panel.tsx` — both apply WP-0(b): no standalone "Conjoint·e·s" section; a compact "Marié·e à …" line only when `spouses.length > 0 && children.length === 0`. Parents now always renders (with the "Souche du registre" italic empty state for roots) instead of being conditional; Enfants stays flat, no per-mother grouping (unchanged from the original decision).
- [x] Hero avatar swapped to `PhotoFrame` on both — public profile at default size, the tree panel's focused-person header at a new `size="sm"` variant. Building that variant properly (explicit size tokens inside the component) replaced an earlier attempt to shrink it via a passed-in `className`, which doesn't reliably win against the component's own Tailwind classes without `tailwind-merge` — worth remembering for any future size override on `Seal` too, which has the same latent risk if someone tries it.
- [x] `<Seal>` mounted next to both headers — public profile hardcodes `status="stamped"` (the route only ever serves `is_public` people, so it's not conditional there); the tree panel switches on `person.is_public` since it shows both.
- [x] Cross-tree bridge badge — shipped on the **public profile only** (`/people/[id]`, both the spouse fallback line and Parents rows), backed by a real fix: `PersonProfileController` wasn't eager-loading `owningFamilyTree` on the relationship's people, so `family_tree` was always empty there even though `PersonResource` already supported it. Added `->with(['person.owningFamilyTree', 'relatedPerson.owningFamilyTree'])`. **`TreePersonPanel` does not get this badge** — checked `FamilyTreeController@show` and its `people` array is `$tree->people()->get()`, scoped to `owning_family_tree_id = this tree`, so a cross-tree relative structurally never appears in that payload at all (the code comment there already says as much: cross-tree relationships "aren't laid out in this tree's own visualization"). Giving the tree panel the same badge would need a real payload change, not a template tweak — out of scope for this pass.

## WP-E — Griot mode

New surface, no existing equivalent.

- [x] New `web/src/components/griot-mode.tsx` — full-screen `@base-ui/react/dialog` overlay on `--ink`/`--paper` (not the light/dark theme tokens — deliberately a single dark world regardless of ambient theme, like the login/invite shell is deliberately light regardless): brass progress segments per card, tap-left/tap-right zones plus a touch-swipe handler, "Maintenir pour écouter" ships as a disabled button — visually present, functionally inert, per WP-0.
- [x] Narration templating — `web/src/lib/griot-narration.ts`, `buildGriotNarration(person, relationships, categorized)` returns ordered `{heading, body}` cards: opening (birth/death year), bio if present, filiation (parents, or a "souche du registre" line if none), union (spouses + marriage year looked up per-pair from the relationship's `marriage_date`), descendance (children). All gendered off `person.gender` — né/née, décédé/décédée, Fils/Fille de, Marié/Mariée, Père/Mère de.
- [x] Wired "Raconter cette lignée" CTA on both fiches: the public profile (`/people/[id]/page.tsx`, server-rendered) via a new thin client wrapper `web/src/components/griot-trigger.tsx` so the page itself doesn't need to become a client component just to hold the overlay's open state; `TreePersonPanel` (already a client component) opens `GriotMode` directly.

## WP-F — Edit proposals queue (the stamp)

- [x] Interaction: Valider/Rejeter now open a PIN sheet (WP-I) rather than mutating directly — the actual "stamp" moment.
- [x] Visual: each item is now its own bordered card — tag (mono, brass), title (`font-display`), footer combining proposer name and a relative timestamp (`relativeTime()`, new local helper — "il y a 2 h" per the artifact, no library added for one function).
- [x] Per-item `<Seal status="pending">` on the row itself, distinct from the PIN sheet's own 4-dot progress indicator that opens on top of it.

## WP-G — Search results

- [x] `web/src/app/search/page.tsx` — turned out bigger than "token pass": result rows had **no avatar and the person's name wasn't a link at all** (only the tree badge was, via a nested `<Link>` — which would've collided with wrapping the row in a profile link). Fixed: whole row now links to `/people/{id}`, avatar (photo or initial) added matching `PersonCard`'s pattern, tree name demoted to plain disambiguation text under the name (no more nested anchors).

## WP-H — Login cover — **superseded, see WP-I**

- [x] ~~OTP entry step~~ — deleted along with the entire OTP system (`docs/mvp-plan.md` Phase 2, revised 2026-07-24: the app doesn't send SMS/WhatsApp at all anymore). The dual-tone ink/paper cover treatment and the two-tone visual language survived and now belongs to two pages instead of one — see WP-I.

## WP-I — Auth rebuild: invite links + PIN (not in the original 7-plate artifact)

Full rationale in `docs/mvp-plan.md` Phase 2 — this entry just tracks the `/web` + `/api` surface.

- [x] `api`: `AuthController::register` (bootstrap, trust-on-first-use, refuses existing phone numbers), `InviteController::claim`, `InviteToken` model + migration, `users.pin_hash` replacing `otp_code`/`otp_expires_at`/`phone_verified_at`, `EditProposalController::checkPin()` gating `approve`/`reject`. Tests: `AuthFlowTest.php` (new), `EditProposalWorkflowTest.php` + `TreeMemberInviteTest.php` (updated) — **not run, ask the developer to run `composer run test`**.
- [x] `web/src/app/login/page.tsx` — kept the two-tone ink/paper cover from WP-H, dropped to one step (phone + name, no OTP), now explicitly bootstrap-only copy ("déjà invité·e ? ouvrez le lien plutôt que ce formulaire").
- [x] `web/src/app/invite/[token]/page.tsx` — new, same two-tone shell. Claiming requires an explicit tap rather than firing on page load, since a chat app's link-preview crawler hitting the URL with a plain GET must not be able to burn a single-use token before a human sees it.
- [x] `web/src/components/pin-keypad.tsx` — new, `@base-ui/react/dialog`-based bottom sheet in the indigo/brass language, digit progress shown via 4 `<Seal>`s (reusing WP-A's primitive instead of a bespoke dot component).
- [x] `web/src/components/edit-proposals-queue.tsx` — Valider/Rejeter now open the PIN sheet instead of firing the mutation directly; still owes WP-F's visual "prop-row card" restyle (interaction is done, the list styling isn't).
- [x] `web/src/components/tree-members.tsx` — invite response shape changed (`{member, invite_url}`); shows the generated link with Web Share API (clipboard fallback) instead of a plain success message.
- [x] **Self-serve recovery ask, added 2026-07-24**: `api`: `AccessRequest` model/migration, `AccessRequestController` (public `store`, gated `index`/`dismiss`), auto-resolved by `TreeMemberController@store` on re-invite, `pending_access_requests_count` on `FamilyTreeResource` alongside the existing proposals count. `web`: `src/app/trees/[slug]/request-access/page.tsx` (public), `src/components/access-requests-queue.tsx` (mounted next to `TreeMembers`/`EditProposalsQueue`), an indigo dashboard pill distinct from the brass proposals pill, entry links from `/login`'s fineprint and each `/search` tree result. Test: `AccessRequestTest.php`.

## Suggested order

WP-0 (decisions) → WP-A (tokens/primitives) → WP-B, WP-H (self-contained, low risk) → WP-G (smallest) → WP-C → WP-D → WP-F → WP-E (biggest net-new surface, do last since it depends on WP-D's fiche data shape being final).

**Progress: all work packages done (WP-0 through WP-I). Nothing checked off remains in this plan.** Outstanding: `composer run test` and `pnpm lint` haven't been confirmed passing since the auth rebuild (WP-I) landed, and the new migrations (drops `otp_code`/`otp_expires_at`/`phone_verified_at`, adds `pin_hash`; new `invite_tokens`/`access_requests` tables) still need to be run against local dev data.
