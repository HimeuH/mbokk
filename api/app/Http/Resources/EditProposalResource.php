<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EditProposalResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'family_tree_id' => $this->family_tree_id,
            'proposer' => $this->whenLoaded('proposer', fn () => [
                'id' => $this->proposer->id,
                'name' => $this->proposer->name,
                'phone' => $this->proposer->phone,
            ]),
            'target_type' => $this->target_type,
            'target_id' => $this->target_id,
            'action' => $this->payload['action'] ?? null,
            'fields' => $this->payload['fields'] ?? null,
            'status' => $this->status,
            'reviewed_by' => $this->reviewed_by,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
