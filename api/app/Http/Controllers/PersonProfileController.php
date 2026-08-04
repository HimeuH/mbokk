<?php

namespace App\Http\Controllers;

use App\Http\Resources\PersonResource;
use App\Http\Resources\RelationshipResource;
use App\Http\Responses\ApiResponse;
use App\Models\Person;
use App\Models\Relationship;
use Illuminate\Http\JsonResponse;

class PersonProfileController extends Controller
{
    /**
     * Public, unauthenticated profile page (Phase 7) — only ever shows
     * `is_public` people, and only their relationships to other public
     * people, so a public profile can't be used to leak a private relative's
     * identity.
     */
    public function __invoke(Person $person): JsonResponse
    {
        abort_unless($person->is_public, 404);

        $relationships = Relationship::where('person_id', $person->id)
            ->orWhere('related_person_id', $person->id)
            // Eager-loaded so PersonResource's `family_tree` field (normally
            // just for search) can power the frontend's cross-tree "bridge"
            // indicator on a Parents row — a parent from a different family's
            // register is exactly the case that field exists to disambiguate.
            ->with(['person.owningFamilyTree', 'relatedPerson.owningFamilyTree'])
            ->get()
            ->filter(fn (Relationship $relationship) => $relationship->person->is_public
                && $relationship->relatedPerson->is_public)
            ->values();

        return ApiResponse::success([
            'person' => new PersonResource($person->load('owningFamilyTree')),
            'relationships' => RelationshipResource::collection($relationships),
        ]);
    }
}
