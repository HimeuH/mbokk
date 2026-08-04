<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'phone'])]
#[Hidden(['pin_hash', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /** @return HasMany<FamilyTree, $this> */
    public function ownedFamilyTrees(): HasMany
    {
        return $this->hasMany(FamilyTree::class, 'owner_user_id');
    }

    /** @return BelongsToMany<FamilyTree, $this> */
    public function familyTrees(): BelongsToMany
    {
        return $this->belongsToMany(FamilyTree::class, 'tree_members')
            ->withPivot('role')
            ->withTimestamps();
    }
}
