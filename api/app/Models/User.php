<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'phone'])]
#[Hidden(['pin_hash', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /** @return \Illuminate\Database\Eloquent\Relations\HasMany<FamilyTree, $this> */
    public function ownedFamilyTrees(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(FamilyTree::class, 'owner_user_id');
    }

    /** @return \Illuminate\Database\Eloquent\Relations\BelongsToMany<FamilyTree, $this> */
    public function familyTrees(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(FamilyTree::class, 'tree_members')
            ->withPivot('role')
            ->withTimestamps();
    }
}
