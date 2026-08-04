<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePersonRequest;
use App\Http\Requests\UpdatePersonRequest;
use App\Http\Resources\EditProposalResource;
use App\Http\Resources\PersonResource;
use App\Http\Responses\ApiResponse;
use App\Models\EditProposal;
use App\Models\FamilyTree;
use App\Models\Person;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class PersonController extends Controller
{
    public function store(StorePersonRequest $request, FamilyTree $tree): JsonResponse
    {
        $photoPath = $request->file('photo')?->store('people-photos', 'public');

        $fields = [
            ...$request->safe()->except('photo', 'is_public'),
            // Explicit, not left to the DB default — Eloquent won't reflect a
            // DB-applied default on the in-memory model returned by create().
            'is_public' => $request->boolean('is_public', true),
            'photo_path' => $photoPath,
        ];

        // Owner/admin write directly; a contributor's FormRequest passed only
        // via `proposeCreate`, so it becomes an edit_proposals row instead.
        if (Gate::denies('create', [Person::class, $tree])) {
            $proposal = EditProposal::create([
                'family_tree_id' => $tree->id,
                'proposer_user_id' => $request->user()->id,
                'target_type' => 'person',
                'target_id' => null,
                'payload' => ['action' => 'create', 'fields' => $fields],
            ]);

            return ApiResponse::success(new EditProposalResource($proposal), status: 202);
        }

        $person = Person::create([
            ...$fields,
            'owning_family_tree_id' => $tree->id,
            'created_by' => $request->user()->id,
        ]);

        return ApiResponse::success(new PersonResource($person), status: 201);
    }

    public function update(UpdatePersonRequest $request, FamilyTree $tree, Person $person): JsonResponse
    {
        $photoPath = $request->file('photo')?->store('people-photos', 'public');

        $fields = [
            ...$request->safe()->except('photo'),
            ...($photoPath ? ['photo_path' => $photoPath] : []),
        ];

        if (Gate::denies('update', $person)) {
            $proposal = EditProposal::create([
                'family_tree_id' => $tree->id,
                'proposer_user_id' => $request->user()->id,
                'target_type' => 'person',
                'target_id' => $person->id,
                'payload' => ['action' => 'update', 'fields' => $fields],
            ]);

            return ApiResponse::success(new EditProposalResource($proposal), status: 202);
        }

        $person->update($fields);

        return ApiResponse::success(new PersonResource($person));
    }

    public function destroy(Request $request, FamilyTree $tree, Person $person): JsonResponse
    {
        if (Gate::denies('delete', $person)) {
            Gate::authorize('proposeOnPerson', $person);

            $proposal = EditProposal::create([
                'family_tree_id' => $tree->id,
                'proposer_user_id' => $request->user()->id,
                'target_type' => 'person',
                'target_id' => $person->id,
                'payload' => ['action' => 'delete'],
            ]);

            return ApiResponse::success(new EditProposalResource($proposal), status: 202);
        }

        $person->delete();

        return ApiResponse::success(status: 204);
    }
}
