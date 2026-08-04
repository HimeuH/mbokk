<?php

namespace App\Policies;

use App\Models\EditProposal;
use App\Models\TreeMember;
use App\Models\User;

class EditProposalPolicy
{
    /** Approving/rejecting a proposal is owner/admin of the proposal's tree only. */
    public function review(User $user, EditProposal $proposal): bool
    {
        return TreeMember::where('family_tree_id', $proposal->family_tree_id)
            ->where('user_id', $user->id)
            ->whereIn('role', ['owner', 'admin'])
            ->exists();
    }
}
