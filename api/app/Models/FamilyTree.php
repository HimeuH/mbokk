<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'slug', 'description', 'owner_user_id'])]
class FamilyTree extends Model
{
    use HasFactory;

    /** @return BelongsTo<User, $this> */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    /** @return BelongsToMany<User, $this> */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'tree_members')
            ->withPivot('role')
            ->withTimestamps();
    }

    /** @return HasMany<Person, $this> */
    public function people(): HasMany
    {
        return $this->hasMany(Person::class, 'owning_family_tree_id');
    }

    /** @return HasMany<EditProposal, $this> */
    public function editProposals(): HasMany
    {
        return $this->hasMany(EditProposal::class);
    }

    /** @return HasMany<AccessRequest, $this> */
    public function accessRequests(): HasMany
    {
        return $this->hasMany(AccessRequest::class);
    }
}
