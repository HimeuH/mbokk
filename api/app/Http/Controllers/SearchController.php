<?php

namespace App\Http\Controllers;

use App\Http\Resources\FamilyTreeResource;
use App\Http\Resources\PersonResource;
use App\Http\Responses\ApiResponse;
use App\Models\FamilyTree;
use App\Models\Person;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    /**
     * Public directory search — no auth required, unlike PersonSearchController
     * (Phase 4's cross-tree "link to existing person" picker, which also
     * surfaces the searching user's own private people). Only public people
     * and trees by name are ever returned here.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate(['q' => ['required', 'string', 'min:2']]);
        $term = '%'.$request->string('q').'%';

        // whereLike() compiles to ILIKE on Postgres, plain LIKE elsewhere —
        // portable across the pgsql (prod) and sqlite (test) connections.
        $people = Person::query()
            ->public()
            ->where(fn ($query) => $query->whereLike('first_name', $term)
                ->orWhereLike('last_name', $term))
            ->with('owningFamilyTree')
            ->limit(20)
            ->get();

        $trees = FamilyTree::query()
            ->whereLike('name', $term)
            ->limit(10)
            ->get();

        return ApiResponse::success([
            'people' => PersonResource::collection($people),
            'trees' => FamilyTreeResource::collection($trees),
        ]);
    }
}
