<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['family_tree_id', 'user_id', 'role'])]
class TreeMember extends Model
{
    public function familyTree(): BelongsTo
    {
        return $this->belongsTo(FamilyTree::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
