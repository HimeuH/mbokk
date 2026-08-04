<?php

namespace App\Http\Controllers;

use App\Http\Resources\PersonResource;
use App\Http\Responses\ApiResponse;
use App\Models\Person;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PersonSearchController extends Controller
{
    /**
     * Cross-tree person search for the "link to existing person" relationship
     * UI (docs/mvp-plan.md Phase 4) — not the public search of Phase 6, which
     * doesn't require auth and has different privacy scoping.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate(['q' => ['required', 'string', 'min:2']]);

        $treeIds = $request->user()->familyTrees()->pluck('family_trees.id');

        $people = Person::query()
            ->with('owningFamilyTree')
            ->where(function ($query) use ($request) {
                // whereLike() compiles to ILIKE on Postgres, plain LIKE elsewhere.
                $term = '%'.$request->string('q').'%';
                $query->whereLike('first_name', $term)
                    ->orWhereLike('last_name', $term);
            })
            ->where(function ($query) use ($treeIds) {
                $query->where('is_public', true)
                    ->orWhereIn('owning_family_tree_id', $treeIds);
            })
            ->limit(20)
            ->get();

        return ApiResponse::success(PersonResource::collection($people));
    }
}
