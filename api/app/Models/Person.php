<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Collection;

#[Fillable([
    'owning_family_tree_id', 'first_name', 'last_name', 'gender',
    'birth_date', 'death_date', 'bio', 'photo_path', 'is_public', 'created_by',
])]
class Person extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'death_date' => 'date',
            'is_public' => 'boolean',
        ];
    }

    /** @return BelongsTo<FamilyTree, $this> */
    public function owningFamilyTree(): BelongsTo
    {
        return $this->belongsTo(FamilyTree::class, 'owning_family_tree_id');
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * People this person is `parent_of`. May belong to a different family_tree
     * than this person — cross-family links are relationships, not a separate table.
     *
     * @return BelongsToMany<Person, $this>
     */
    public function children(): BelongsToMany
    {
        return $this->belongsToMany(Person::class, 'relationships', 'person_id', 'related_person_id')
            ->wherePivot('type', 'parent_of');
    }

    /** @return BelongsToMany<Person, $this> */
    public function parents(): BelongsToMany
    {
        return $this->belongsToMany(Person::class, 'relationships', 'related_person_id', 'person_id')
            ->wherePivot('type', 'parent_of');
    }

    /**
     * Spouses, in either direction — `spouse_of` rows aren't stored with a
     * canonical direction, so this merges both sides of the pivot.
     *
     * @return Collection<int, Person>
     */
    public function spouses(): Collection
    {
        $asPerson = $this->belongsToMany(Person::class, 'relationships', 'person_id', 'related_person_id')
            ->wherePivot('type', 'spouse_of')
            ->withPivot(['marriage_date', 'start_date', 'end_date'])
            ->get();

        $asRelated = $this->belongsToMany(Person::class, 'relationships', 'related_person_id', 'person_id')
            ->wherePivot('type', 'spouse_of')
            ->withPivot(['marriage_date', 'start_date', 'end_date'])
            ->get();

        return $asPerson->merge($asRelated);
    }

    public function scopePublic(Builder $query): void
    {
        $query->where('is_public', true);
    }

    /**
     * True if $parentId is already a descendant of $childId — i.e. adding a
     * `parent_of($parentId, $childId)` relationship would make $parentId its
     * own ancestor. Call before inserting any new parent_of relationship.
     */
    public static function wouldCreateCycle(int $parentId, int $childId): bool
    {
        if ($parentId === $childId) {
            return true;
        }

        $visited = [];
        $queue = [$parentId];

        while ($queue !== []) {
            $currentId = array_shift($queue);

            if (in_array($currentId, $visited, true)) {
                continue;
            }
            $visited[] = $currentId;

            if ($currentId === $childId) {
                return true;
            }

            $current = static::find($currentId);
            $queue = [...$queue, ...$current?->parents()->pluck('people.id')->all() ?? []];
        }

        return false;
    }
}
