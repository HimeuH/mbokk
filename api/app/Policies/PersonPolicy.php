<?php

namespace App\Policies;

use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\TreeMember;
use App\Models\User;

/**
 * Direct writes are owner/admin only. Contributors instead pass `proposeCreate`
 * / `proposeOnPerson` — any tree member — and the controller routes them
 * through `edit_proposals` (Phase 5) rather than writing directly.
 */
class PersonPolicy
{
    /** Public people are visible to anyone authenticated; private ones only to tree members. */
    public function view(User $user, Person $person): bool
    {
        return $person->is_public || TreeMember::where('family_tree_id', $person->owning_family_tree_id)
            ->where('user_id', $user->id)
            ->exists();
    }

    public function create(User $user, FamilyTree $tree): bool
    {
        return $this->isOwnerOrAdmin($user, $tree->id);
    }

    public function update(User $user, Person $person): bool
    {
        return $this->isOwnerOrAdmin($user, $person->owning_family_tree_id);
    }

    public function delete(User $user, Person $person): bool
    {
        return $this->isOwnerOrAdmin($user, $person->owning_family_tree_id);
    }

    /** Any member of the tree (including contributors) may propose a new person. */
    public function proposeCreate(User $user, FamilyTree $tree): bool
    {
        return $this->isMember($user, $tree->id);
    }

    /** Any member of the person's tree (including contributors) may propose an edit or deletion. */
    public function proposeOnPerson(User $user, Person $person): bool
    {
        return $this->isMember($user, $person->owning_family_tree_id);
    }

    private function isOwnerOrAdmin(User $user, int $familyTreeId): bool
    {
        return TreeMember::where('family_tree_id', $familyTreeId)
            ->where('user_id', $user->id)
            ->whereIn('role', ['owner', 'admin'])
            ->exists();
    }

    private function isMember(User $user, int $familyTreeId): bool
    {
        return TreeMember::where('family_tree_id', $familyTreeId)
            ->where('user_id', $user->id)
            ->exists();
    }
}
