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
        $request->validate([
            'q' => ['required', 'string', 'min:2'],
            // Optional narrowing, e.g. from PersonRelationships' "uniquement
            // dans cette famille" checkbox — cross-tree search stays the
            // default (Architecture Laws), this is opt-in on the caller's part.
            'tree' => ['nullable', 'string', 'exists:family_trees,slug'],
        ]);

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
            ->when($request->filled('tree'), function ($query) use ($request) {
                // A strict narrowing of the where() above, not a bypass — the
                // requested tree still has to already be one the user belongs
                // to or that's public, same privacy scope either way.
                $query->whereHas(
                    'owningFamilyTree',
                    fn ($q) => $q->where('slug', $request->string('tree')),
                );
            })
            ->limit(20)
            ->get();

        return ApiResponse::success(PersonResource::collection($people));
    }
}
