import Dexie, { type EntityTable } from "dexie";

// Scaffold only — populated in Phase 8 (offline cache of visited trees/people
// + offline edit-proposal queue). docs/mvp-plan.md.
interface CachedPerson {
  id: number;
  familyTreeId: number;
  data: unknown;
  cachedAt: number;
}

interface QueuedProposal {
  id?: number;
  payload: unknown;
  createdAt: number;
}

const db = new Dexie("mbokk") as Dexie & {
  people: EntityTable<CachedPerson, "id">;
  proposalQueue: EntityTable<QueuedProposal, "id">;
};

db.version(1).stores({
  people: "id, familyTreeId, cachedAt",
  proposalQueue: "++id, createdAt",
});

export { db };
