# Mbokk — Digital Family Register (Senegal) — MVP Plan

## Context

The starting point was `mbacke-genealogy-app.tsx`, a single-file React demo hardcoded to one family (the Mbacké/Mouride lineage). The goal now is to generalize this into a real product: **any family in Senegal can register their family tree**, and the platform surfaces the links **between** different families (e.g. marriages connecting two lineages) — effectively a crowdsourced digital family register.

Decisions already locked in during planning:
- **Collaboration model**: async edit + approval (contributors propose changes, a tree admin/elder approves them) — no real-time editing.
- **Privacy**: public by default, per-person opt-out (so search/SEO works, but sensitive individuals can be hidden).
- **Scale**: small/personal-project scale for now, not architected for national scale on day one.
- **Backend**: Laravel (PHP) + Sanctum token auth, chosen over NestJS/Node because (a) the user already works in Laravel, (b) Eloquent's relationship handling fits a parent/child/spouse graph well, (c) Sanctum tokens cleanly support both the web frontend and a future native mobile app.
- **Auth method**: phone number + OTP (more universal than email for this audience).
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind, chosen over plain Vite/React because public person/search pages benefit from SSR/SSG for Google indexability; authenticated tree-editing views still fetch client-side (TanStack Query).
- **PWA**: Serwist (App-Router-friendly successor to next-pwa) + Dexie for offline caching of visited trees/people and an offline queue for edit proposals.
- **Repo structure**: monorepo, `/api` (Laravel) and `/web` (Next.js).
- **Localization**: scaffold `next-intl` now, ship French-only content for MVP; Wolof strings added post-MVP without a rewrite.
- **Design system**: shadcn/ui (Radix primitives + Tailwind) — copy-in components, no separate styling engine, keeps SSR/App Router simple. Lock a minimal token set (color palette, type scale, spacing) during Phase 0, not a full design system doc.

## Data Model (target schema)

- `users`: id, phone, name, pin_hash
- `family_trees`: id, name, slug, description, owner_user_id, created_at
- `tree_members`: family_tree_id, user_id, role (owner | admin | contributor)
- `invite_tokens`: token, user_id, family_tree_id, role, invited_by_user_id, expires_at, used_at
- `people`: id, owning_family_tree_id, first_name, last_name, gender, birth_date, death_date, bio, photo_path, is_public (bool, default true), created_by
- `relationships`: id, person_id, related_person_id, type (parent_of | spouse_of), marriage_date (nullable), start_date, end_date — spouse rows support polygamy (multiple spouse_of rows per person); parent/child and spouse relationships can reference people owned by *different* trees, which is how cross-family links happen naturally without a separate "link" table.
- `edit_proposals`: id, family_tree_id, proposer_user_id, target_type (person | relationship), target_id (nullable, null = new record), payload (json), status (pending | approved | rejected), reviewed_by, reviewed_at

## Phases

### Phase 0 — Project scaffolding
- [x] Create monorepo with `/api` (Laravel 13) and `/web` (Next.js App Router + TS + Tailwind v4)
- [x] `docker-compose.yml` with Postgres 16 for local dev (host port 5433 — 5432 was already taken by a local Postgres install)
- [x] Laravel: install Sanctum (`install:api`), `HasApiTokens` on `User`, CORS scoped to `FRONTEND_URL` in `config/cors.php`
- [x] Next.js: Tailwind v4, shadcn/ui (`base` library), TanStack Query, Serwist, Dexie, next-intl (scaffold only, `fr` locale)
- [x] Design tokens (Indigo & Brass Ledger palette + Fraunces/Source Serif 4/IBM Plex Mono type system) wired into `web/src/app/globals.css` and `layout.tsx`
- [x] `.env.example` for both `/api` and `/web`

### Phase 1 — Database schema & models
- [x] Migrations for `users` (phone/OTP columns, no email/password), `family_trees`, `tree_members`, `people`, `relationships`, `edit_proposals`
- [x] Eloquent models with relationships (`Person::children()`/`parents()` as real `BelongsToMany` through `relationships`; `Person::spouses()` merges both pivot directions since `spouse_of` isn't stored with a canonical side; `Person::scopePublic()`)
- [x] Cycle-prevention validation — `Person::wouldCreateCycle(int $parentId, int $childId)`, BFS up the `parents()` chain; not yet wired into a controller (there isn't one until Phase 3/4)
- [x] Seeder: `FamilyTreeSeeder` converts `familyDataStore` (12 people + 13 spouses matched by name to dedupe shared mothers) into `family_trees`/`people`/`relationships` rows — verified via `php artisan migrate:fresh --seed`

### Phase 2 — Auth (invite links + PIN, supersedes the original OTP design)
**Revised 2026-07-24: the app never sends SMS/WhatsApp messages at all.** The original phone+OTP design meant a message on every login; replaced with: invite links for joining an existing tree (free, human-delivered), trust-on-first-use for bootstrapping the very first tree, long-lived sessions (Sanctum's default — tokens don't expire) so re-auth is rare regardless, and a PIN that gates the one truly sensitive action (stamping a proposal) instead of gating login at all. `OtpController` and its two `FormRequest`s were deleted, not deprecated in place.
- [x] `POST /api/auth/register` — bootstrap only (first tree, nobody to invite you yet). Creates the account with **no verification** — refuses an already-registered phone number outright (`AuthController::register`), so it can't double as an account-takeover path; existing users always come back via an invite link, never this form.
- [x] `POST /api/invite/{token}` — claiming a link *is* logging in. `TreeMemberController@store` issues a fresh single-use, 7-day-expiring `InviteToken` on every invite (including re-inviting an existing member, which doubles as "regenerate my invite link" for someone who lost their session). The admin delivers the link themselves (WhatsApp, in person); the app never sends it. `InviteController::claim` validates + consumes the token and issues a Sanctum token — no code, no waiting.
- [x] **Self-serve recovery, added 2026-07-24.** There's still no self-serve *login* recovery (no password/OTP to reset) — but `AccessRequestController` gives the lost-access ask itself a self-serve path: `POST /trees/{slug}/access-requests` (public, `web/src/app/trees/[slug]/request-access/page.tsx`, reachable from `/login`'s fineprint and each tree result on `/search`) lets someone with no session tell an admin "I need back in." An admin sees it in `AccessRequestsQueue` (mounted alongside `TreeMembers`/`EditProposalsQueue`) and resolves it with one tap, which re-invites the phone number — `TreeMemberController@store` auto-resolves any matching pending request. Still fully admin-mediated by design; this only removes the friction of the ask, not the dependency.
- [x] PIN — `users.pin_hash`, checked only in `EditProposalController::checkPin()`, called from `approve`/`reject`. A reviewer with no PIN yet has their first submitted 4-digit PIN become their PIN in that same request (no separate "create PIN" round trip) — safe because `Gate::authorize('review', $proposal)` already ran. Not used anywhere else — not login, not a device lock.
- [x] Next.js: `web/src/app/login/page.tsx` (bootstrap form, phone+name, no OTP step), `web/src/app/invite/[token]/page.tsx` (claim landing page — requires an explicit tap, not an auto-fire on load, since chat apps pre-fetch link previews with a plain GET and would otherwise burn the single-use token before a human sees it), `web/src/components/pin-keypad.tsx` (the PIN sheet, mounted from `EditProposalsQueue`'s Valider/Rejeter buttons).

### Phase 3 — Family trees & people CRUD
- [x] `POST/GET /trees`, `GET /trees/{slug}` — `FamilyTreeController`, slugs auto-uniqued (`famille-diop`, `famille-diop-2`, …). `GET /trees/{slug}` shows all people to members, only `is_public` ones to everyone else.
- [x] `POST/PUT/DELETE /trees/{slug}/people` — `PersonController` + `PersonPolicy` (owner/admin only; contributors get a real 403 until Phase 5's `edit_proposals` path exists — verified via curl)
- [x] Photo upload via Laravel Storage — `storage:link`'d, verified a real upload is servable at `/storage/people-photos/...`
- [x] Next.js: `/trees` (dashboard + create form), `/trees/[slug]` (people list + add/edit/delete via a shared `PersonForm`, multipart with PUT-via-`_method`-spoofing for edits)

Validation/Resources: all endpoints use dedicated `FormRequest` classes (`StoreFamilyTreeRequest`, `Store`/`UpdatePersonRequest`, `Auth\RegisterRequest`) and API Resources (`FamilyTreeResource`, `PersonResource`, `UserResource`) rather than inline `$request->validate()`/raw models — `InviteController::claim` and `EditProposalController::checkPin()` are the two exceptions, using plain `Request` + inline `$request->validate()` since each is a single tiny field, not worth a dedicated class.

Response envelope (cross-cutting, applies to every phase from here on): added `App\Http\Responses\ApiResponse` with `success()`/`error()`, used by every controller. Thrown exceptions (`ValidationException`, `AuthenticationException`, `AuthorizationException`, `ModelNotFoundException`, 404s) render through the same envelope via `bootstrap/app.php`'s `withExceptions()`. Also added `lang/fr/validation.php` — without it, validation errors rendered as raw untranslated keys (`"validation.required"`) since `APP_LOCALE=fr` has no French Laravel validation strings by default. Frontend's `apiFetch()` unwraps `{success, data, message}` automatically.

### Phase 4 — Relationships & cross-family linking
- [x] `POST /people/{id}/relationships` — `RelationshipController`, authorized via `PersonPolicy::update` on the acting (route) person. Cross-tree linking verified: a Diallo-tree person was linked as `parent_of` two Mbacké-tree people with no special-casing needed.
- [x] Validation against cycles and duplicate relationships — both live in `StoreRelationshipRequest::withValidator()`. Cycle check calls `Person::wouldCreateCycle()`; duplicate check covers both directions for `spouse_of` (no canonical side) and exact direction for `parent_of`. Verified: self-link rejected, exact-duplicate rejected, reverse-duplicate spouse rejected, and a genuine 2-hop cycle rejected with the real cross-tree data.
- [x] Frontend: "link to existing person" search-and-select — `GET /api/people/search?q=` (new `PersonSearchController`, cross-tree, `is_public` or own-tree scoped) + `PersonRelationships` component (search results, pick, add, remove) embedded per-person on `/trees/[slug]` behind a "Relations" toggle.

Also added: `PersonPolicy::view()` (public people visible to any authenticated user; private ones only to tree members) — used to gate `GET /people/{id}/relationships`. And a real bug fix: Laravel converts `AuthorizationException` to `AccessDeniedHttpException` internally *before* dispatching to `withExceptions()` render callbacks, so the naive handler for `AuthorizationException` silently never fired — had to add a handler for `AccessDeniedHttpException` instead (see `ApiResponse::authorizationMessage()`).

### Phase 5 — Access control & approval workflow
- [x] Roles per tree: owner, admin, contributor (`tree_members`) — schema existed since Phase 1; `FamilyTreePolicy::manageMembers()` now gates who can assign them.
- [x] Invite contributor by phone number — `POST /trees/{slug}/members` (`TreeMemberController`), `User::firstOrCreate(['phone' => ...])` same as OTP login; role limited to `admin`/`contributor` (owner is fixed at tree creation).
- [x] Contributor writes create an `edit_proposals` row instead of writing directly — `PersonController`/`RelationshipController` branch on `Gate::denies('create'|'update'|'delete', ...)`; a tree member who fails that check but passes `PersonPolicy::proposeCreate()`/`proposeOnPerson()` gets an `EditProposal` instead of a 403. Cycle/duplicate relationship validation still runs before a proposal is even created.
- [x] `GET /trees/{slug}/proposals`, `POST /proposals/{id}/approve|reject` (admin/owner only) — `EditProposalController`; approving replays the stored `payload` (`action` + `fields`) through the same `Person`/`Relationship` models a direct write would use. Verified by `tests/Feature/TreeMemberInviteTest.php` + `tests/Feature/EditProposalWorkflowTest.php` (16 tests, `composer run test`).
- [x] Frontend: pending-proposals queue for admins, proposal submission flow for contributors — `TreeMembers`/`EditProposalsQueue` components (owner/admin only, gated by the new `role` field on `GET /trees/{slug}`); existing `PersonForm`/`PersonRelationships` mutations now detect a 202 `EditProposal` response (`isEditProposal()`) and show "en attente d'approbation" instead of assuming the write applied.

### Phase 6 — Search & relationship finder
- [x] `GET /search?q=` — full-text search over public people/trees, respecting `is_public` — `SearchController`, unauthenticated (distinct from Phase 4's `PersonSearchController`, which is cross-tree but auth-scoped for the "link to existing person" picker). Verified by `tests/Feature/SearchTest.php`.
- [x] `GET /people/{id}/relationship/{otherId}` — BFS graph traversal over `relationships`, works across trees — `RelationshipFinderController`, treats `relationships` as an undirected graph (parent_of/spouse_of edges plus their reverse), gated by `PersonPolicy::view()` on both people. Verified by `tests/Feature/RelationshipFinderTest.php` (direct link, multi-hop, disconnected, reverse-direction labeling, privacy boundary).
- [x] Frontend: global search bar, relationship-finder UI (pick two people, show the connecting path) — `Nav` component (search bar, mounted in `layout.tsx`, first real consumer of the `Nav.*` next-intl strings), `/search` (SSR results page per the public-page Architecture Law), `/relationship-finder` (authed client page, two person-pickers + path rendering, linked from `AuthStatus`).

### Phase 7 — Tree visualization & person pages
- [x] Rebuild the tree view (zoom/pan) from `mbacke-genealogy-app.tsx` as a reusable Next.js component, generalized for any tree's data — `FamilyTreeView` computes generation depth via Kahn's algorithm over `parent_of` edges (handles multi-parent people correctly, unlike the reference file's static `generation` field) instead of relying on a stored value; `GET /trees/{slug}` now also returns `relationships` (only edges between two people already in that response) so the frontend doesn't need N+1 requests. Zoom in/out/reset only — the reference file's "pan" was decorative (no working drag), so nothing was lost by not porting it.
- [x] Person detail page — SSR/SSG for SEO on public profiles — `PersonProfileController` (`GET /people/{id}`, unauthenticated, numeric-constrained route so it doesn't shadow `/people/search`), only ever serves `is_public` people and filters their relationships to public counterparts (so a public profile can't leak a private relative's identity). Frontend: `/people/[id]`, server-rendered, `generateMetadata()` for the page title.
- [x] Loading/empty/error states throughout — `loading.tsx`/`error.tsx`/`not-found.tsx` added for the two new SSR routes (`/search`, `/people/[id]`); existing client pages already had manual loading/error text from earlier phases.

### Phase 8 — PWA & offline
- [ ] Serwist service worker: cache shell + visited tree/person data
- [ ] Dexie local store mirroring visited data
- [ ] Offline queue: edit proposals submitted while offline sync on reconnect
- [ ] Install prompt / manifest

### Phase 9 — SEO polish
- [ ] Meta tags (title/description/OG) on public person and search pages
- [ ] `sitemap.xml` generation for public profiles
- [ ] `robots.txt`

### Phase 10 — Testing & deployment
- [ ] Laravel feature tests: auth, tree/person CRUD, relationships, proposal approval, privacy scoping
- [ ] Manual end-to-end walkthrough of: register → create tree → add people → link to another tree → invite contributor → contributor proposes edit → admin approves → search finds a public person → relationship finder works cross-tree
- [ ] Deploy Laravel API (VPS or managed Postgres + PHP host) and Next.js (Node-capable host, since SSR needs a running server, not static hosting)
- [ ] Production env config: CORS, Sanctum stateful domains, OTP SMS provider swapped in for real sends

## Verification

Each phase should end with the relevant walkthrough from Phase 10's list actually exercised manually (not just automated tests), since the multi-tree/cross-family linking and approval workflow are the parts most likely to have logic bugs. Track progress against the checkboxes above phase by phase.
