<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRelationshipRequest;
use App\Http\Resources\EditProposalResource;
use App\Http\Resources\RelationshipResource;
use App\Http\Responses\ApiResponse;
use App\Models\EditProposal;
use App\Models\Person;
use App\Models\Relationship;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class RelationshipController extends Controller
{
    /**
     * All relationships involving this person, either side — used to render
     * the "current relations" list before adding a new one.
     */
    public function index(Request $request, Person $person): JsonResponse
    {
        Gate::authorize('view', $person);

        $relationships = Relationship::where('person_id', $person->id)
            ->orWhere('related_person_id', $person->id)
            ->with(['person', 'relatedPerson'])
            ->get();

        return ApiResponse::success(RelationshipResource::collection($relationships));
    }

    public function store(StoreRelationshipRequest $request, Person $person): JsonResponse
    {
        $fields = [
            'person_id' => $person->id,
            'related_person_id' => $request->validated('related_person_id'),
            'type' => $request->validated('type'),
            'marriage_date' => $request->validated('marriage_date'),
            'start_date' => $request->validated('start_date'),
            'end_date' => $request->validated('end_date'),
        ];

        // Cycle/duplicate checks already ran in StoreRelationshipRequest::withValidator()
        // regardless of which path this takes.
        if (Gate::denies('update', $person)) {
            $proposal = EditProposal::create([
                'family_tree_id' => $person->owning_family_tree_id,
                'proposer_user_id' => $request->user()->id,
                'target_type' => 'relationship',
                'target_id' => null,
                'payload' => ['action' => 'create', 'fields' => $fields],
            ]);

            return ApiResponse::success(new EditProposalResource($proposal), status: 202);
        }

        $relationship = Relationship::create($fields);

        return ApiResponse::success(
            new RelationshipResource($relationship->load(['person', 'relatedPerson'])),
            status: 201,
        );
    }

    public function destroy(Request $request, Person $person, Relationship $relationship): JsonResponse
    {
        abort_unless(
            $relationship->person_id === $person->id || $relationship->related_person_id === $person->id,
            404,
        );

        if (Gate::denies('update', $person)) {
            Gate::authorize('proposeOnPerson', $person);

            $proposal = EditProposal::create([
                'family_tree_id' => $person->owning_family_tree_id,
                'proposer_user_id' => $request->user()->id,
                'target_type' => 'relationship',
                'target_id' => $relationship->id,
                'payload' => ['action' => 'delete'],
            ]);

            return ApiResponse::success(new EditProposalResource($proposal), status: 202);
        }

        $relationship->delete();

        return ApiResponse::success(status: 204);
    }
}
