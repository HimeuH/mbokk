import type { Person, RelationshipType } from "@/lib/types";

interface RelationshipEdge {
  person_id: number;
  related_person_id: number;
  type: RelationshipType;
}

/**
 * Splits a person's relationships into the three groups the card-based
 * drill-down needs, resolving each edge's other side via `peopleById` rather
 * than requiring nested `person`/`related_person` objects — the public
 * `/people/[id]` profile has those nested (it's a single-person response),
 * but the tree's bulk `relationships` payload only carries ids (the `people`
 * array already has the full objects, so nesting them again would just
 * duplicate the same data many times over).
 */
export function categorizeRelationships(
  relationships: RelationshipEdge[],
  personId: number,
  peopleById: Map<number, Person>,
) {
  const parentsMap = new Map<number, Person>();
  const spousesMap = new Map<number, Person>();
  const childrenMap = new Map<number, Person>();

  for (const rel of relationships) {
    const isSource = rel.person_id === personId;
    const other = peopleById.get(isSource ? rel.related_person_id : rel.person_id);
    if (!other) continue;

    if (rel.type === "spouse_of") {
      spousesMap.set(other.id, other);
    } else if (isSource) {
      childrenMap.set(other.id, other);
    } else {
      parentsMap.set(other.id, other);
    }
  }

  return {
    parents: Array.from(parentsMap.values()),
    spouses: Array.from(spousesMap.values()),
    children: Array.from(childrenMap.values()),
  };
}
