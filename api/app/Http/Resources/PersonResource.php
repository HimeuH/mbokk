<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class PersonResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'owning_family_tree_id' => $this->owning_family_tree_id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'gender' => $this->gender,
            'birth_date' => $this->birth_date?->toDateString(),
            'death_date' => $this->death_date?->toDateString(),
            'bio' => $this->bio,
            'photo_url' => $this->photo_path ? Storage::disk('public')->url($this->photo_path) : null,
            'is_public' => $this->is_public,
            'created_by' => $this->created_by,
            // Only present when eager-loaded (search results across trees) —
            // lets the "link to existing person" UI disambiguate same-name matches.
            'family_tree' => $this->whenLoaded('owningFamilyTree', fn () => [
                'id' => $this->owningFamilyTree->id,
                'name' => $this->owningFamilyTree->name,
                'slug' => $this->owningFamilyTree->slug,
            ]),
        ];
    }
}
