export type TreeRole = "owner" | "admin" | "contributor";

export interface FamilyTree {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  owner_user_id: number;
  role?: TreeRole;
  pending_proposals_count?: number | null;
  pending_access_requests_count?: number | null;
  created_at: string;
}

// Someone with no session and no saved invite link asking an admin to
// re-invite them — the self-serve half of the no-recovery gap (see
// docs/mvp-plan.md Phase 2). Resolving still means a real invite.
export interface AccessRequest {
  id: number;
  family_tree_id: number;
  phone: string;
  message: string | null;
  created_at: string;
}

export interface TreeMember {
  id: number;
  role: TreeRole;
  user: { id: number; name: string | null; phone: string };
}

// Every invite (new or re-invite, TreeMemberController@store) returns a
// fresh single-use link — the admin shares it themselves, the app never does.
export interface InviteResult {
  member: TreeMember;
  invite_url: string;
}

export interface AuthUser {
  id: number;
  name: string | null;
  phone: string;
  // Set on first proposal approve/reject, not at login — see EditProposalController.
  has_pin: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface InviteClaimResponse extends AuthResponse {
  family_tree: FamilyTree;
}

export type EditProposalAction = "create" | "update" | "delete";

export interface EditProposal {
  id: number;
  family_tree_id: number;
  proposer: { id: number; name: string | null; phone: string } | null;
  target_type: "person" | "relationship";
  target_id: number | null;
  action: EditProposalAction;
  fields: Record<string, unknown> | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Person {
  id: number;
  owning_family_tree_id: number;
  first_name: string;
  last_name: string;
  gender: "male" | "female";
  birth_date: string | null;
  death_date: string | null;
  bio: string | null;
  photo_url: string | null;
  is_public: boolean;
  created_by: number;
  // Present only on search results (person eager-loads owningFamilyTree there).
  family_tree?: { id: number; name: string; slug: string };
}

export type RelationshipType = "parent_of" | "spouse_of";

export interface Relationship {
  id: number;
  person_id: number;
  related_person_id: number;
  type: RelationshipType;
  marriage_date: string | null;
  start_date: string | null;
  end_date: string | null;
  person: Person;
  related_person: Person;
}

// A contributor's write returns an EditProposal (HTTP 202) instead of the
// resource itself (HTTP 200/201) — this distinguishes the two response shapes.
export function isEditProposal(value: unknown): value is EditProposal {
  return (
    !!value &&
    typeof value === "object" &&
    "target_type" in value &&
    "action" in value
  );
}

export interface SearchResults {
  people: Person[];
  trees: FamilyTree[];
}

export interface RelationshipPathStep {
  from: Person;
  to: Person;
  type: RelationshipType;
  direction: "forward" | "reverse";
}

export interface RelationshipPathResult {
  path: RelationshipPathStep[] | null;
}
