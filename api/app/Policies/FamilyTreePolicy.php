<?php

namespace App\Policies;

use App\Models\FamilyTree;
use App\Models\TreeMember;
use App\Models\User;

class FamilyTreePolicy
{
    /** Inviting/managing members is owner/admin only. */
    public function manageMembers(User $user, FamilyTree $tree): bool
    {
        return TreeMember::where('family_tree_id', $tree->id)
            ->where('user_id', $user->id)
            ->whereIn('role', ['owner', 'admin'])
            ->exists();
    }
}
