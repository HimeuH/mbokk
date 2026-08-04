<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FamilyTreeResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'owner_user_id' => $this->owner_user_id,
            'role' => $this->whenPivotLoaded('tree_members', fn () => $this->pivot->role),
            // Only owners/admins act on the proposals queue (FamilyTreePolicy::manageMembers()) —
            // contributors don't get the count, so a bare "N" pill never implies an ability they lack.
            'pending_proposals_count' => $this->whenPivotLoaded(
                'tree_members',
                fn () => $this->pivot->role !== 'contributor' ? $this->pending_proposals_count : null
            ),
            'pending_access_requests_count' => $this->whenPivotLoaded(
                'tree_members',
                fn () => $this->pivot->role !== 'contributor' ? $this->pending_access_requests_count : null
            ),
            'created_at' => $this->created_at,
        ];
    }
}
