<?php

namespace App\Http\Resources;

use App\Models\Person;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read Person $person
 * @property-read Person $relatedPerson
 */
class RelationshipResource extends JsonResource
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
            'person_id' => $this->person_id,
            'related_person_id' => $this->related_person_id,
            'type' => $this->type,
            'marriage_date' => $this->marriage_date?->toDateString(),
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'person' => $this->whenLoaded('person', fn () => new PersonResource($this->person)),
            'related_person' => $this->whenLoaded('relatedPerson', fn () => new PersonResource($this->relatedPerson)),
        ];
    }
}
