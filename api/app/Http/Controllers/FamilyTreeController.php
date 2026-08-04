<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFamilyTreeRequest;
use App\Http\Resources\FamilyTreeResource;
use App\Http\Resources\PersonResource;
use App\Http\Resources\RelationshipResource;
use App\Http\Responses\ApiResponse;
use App\Models\FamilyTree;
use App\Models\Relationship;
use App\Models\TreeMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class FamilyTreeController extends Controller
{
    /**
     * Trees the authenticated user belongs to. Owners always have a
     * tree_members row too (created in store() below), so this single
     * relation covers owned + joined trees — "My trees" dashboard, not a
     * public directory (that's Phase 6/7's job).
     */
    public function index(Request $request): JsonResponse
    {
        return ApiResponse::success(
            FamilyTreeResource::collection(
                $request->user()->familyTrees()
                    ->withCount(['editProposals as pending_proposals_count' => function ($query) {
                        $query->where('status', 'pending');
                    }])
                    ->withCount(['accessRequests as pending_access_requests_count' => function ($query) {
                        $query->whereNull('resolved_at');
                    }])
                    ->get()
            )
        );
    }

    public function store(StoreFamilyTreeRequest $request): JsonResponse
    {
        $tree = FamilyTree::create([
            'name' => $request->validated('name'),
            'slug' => $this->uniqueSlug($request->validated('name')),
            'description' => $request->validated('description'),
            'owner_user_id' => $request->user()->id,
        ]);

        TreeMember::create([
            'family_tree_id' => $tree->id,
            'user_id' => $request->user()->id,
            'role' => 'owner',
        ]);

        return ApiResponse::success(new FamilyTreeResource($tree), status: 201);
    }

    public function show(Request $request, FamilyTree $tree): JsonResponse
    {
        $membership = TreeMember::where('family_tree_id', $tree->id)
            ->where('user_id', $request->user()->id)
            ->first();

        $people = $membership
            ? $tree->people()->get()
            : $tree->people()->public()->get();

        $peopleIds = $people->pluck('id');

        // Only edges between two people already in this response — cross-tree
        // relationships exist (Architecture Laws) but aren't laid out in this
        // tree's own visualization; they still show up via PersonRelationships.
        $relationships = Relationship::whereIn('person_id', $peopleIds)
            ->whereIn('related_person_id', $peopleIds)
            ->get();

        return ApiResponse::success([
            'tree' => new FamilyTreeResource($tree),
            'people' => PersonResource::collection($people),
            'relationships' => RelationshipResource::collection($relationships),
            'is_member' => $membership !== null,
            // Lets the frontend gate the invite/proposals UI without a second request.
            'role' => $membership?->role,
        ]);
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $suffix = 2;

        while (FamilyTree::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
