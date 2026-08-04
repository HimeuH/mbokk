import type { Person, Relationship } from "@/lib/types";

/**
 * French sentence templates for Griot mode. Kept in one file so wording can
 * be reviewed as copy rather than hunted for across JSX. Every template
 * branches on `person.gender` for agreement (né/née, Marié/Mariée,
 * Fils/Fille) instead of defaulting to the masculine form.
 */

export interface GriotCard {
  heading: string;
  body: string;
}

function year(date: string | null): string | null {
  return date ? date.slice(0, 4) : null;
}

function fullName(person: Person): string {
  return `${person.first_name} ${person.last_name}`;
}

function joinNames(names: string[]): string {
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
}

function marriageYearFor(
  person: Person,
  spouse: Person,
  relationships: Relationship[],
): string | null {
  const rel = relationships.find(
    (r) =>
      r.type === "spouse_of" &&
      ((r.person_id === person.id && r.related_person_id === spouse.id) ||
        (r.related_person_id === person.id && r.person_id === spouse.id)),
  );
  return rel ? year(rel.marriage_date) : null;
}

export function buildGriotNarration(
  person: Person,
  relationships: Relationship[],
  categorized: { parents: Person[]; spouses: Person[]; children: Person[] },
): GriotCard[] {
  const { parents, spouses, children } = categorized;
  const isFemale = person.gender === "female";
  const cards: GriotCard[] = [];

  const birthYear = year(person.birth_date);
  const deathYear = year(person.death_date);
  let opening = `${fullName(person)}, ${isFemale ? "née" : "né"}`;
  opening += birthYear ? ` en ${birthYear}` : " à une date inconnue";
  if (deathYear) opening += `, ${isFemale ? "décédée" : "décédé"} en ${deathYear}`;
  opening += ".";
  cards.push({ heading: fullName(person), body: opening });

  if (person.bio) {
    cards.push({ heading: "Portrait", body: person.bio });
  }

  if (parents.length > 0) {
    const verb = isFemale ? "Fille de" : "Fils de";
    cards.push({
      heading: "Filiation",
      body: `${verb} ${joinNames(parents.map(fullName))}.`,
    });
  } else {
    cards.push({
      heading: "Filiation",
      body: `${fullName(person)} est la souche de cette branche du registre — aucun parent n'y est enregistré.`,
    });
  }

  if (spouses.length > 0) {
    const parts = spouses.map((spouse) => {
      const marriedYear = marriageYearFor(person, spouse, relationships);
      return marriedYear ? `${fullName(spouse)} (${marriedYear})` : fullName(spouse);
    });
    cards.push({
      heading: "Union",
      body: `${isFemale ? "Mariée" : "Marié"} à ${joinNames(parts)}.`,
    });
  }

  if (children.length > 0) {
    cards.push({
      heading: "Descendance",
      body: `${isFemale ? "Mère" : "Père"} de ${joinNames(children.map(fullName))}.`,
    });
  }

  return cards;
}
