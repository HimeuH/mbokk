<?php

namespace App\Http\Controllers;

use App\Http\Resources\PersonResource;
use App\Http\Responses\ApiResponse;
use App\Models\Person;
use App\Models\Relationship;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class RelationshipFinderController extends Controller
{
    /**
     * Shortest connecting path between two people, BFS over `relationships`
     * treated as an undirected graph (works across trees, same as adding a
     * relationship does). Requires both people to be viewable by the caller
     * (public, or their own tree) — same bar as any other person read.
     */
    public function __invoke(Request $request, Person $person, Person $other): JsonResponse
    {
        Gate::authorize('view', $person);
        Gate::authorize('view', $other);

        if ($person->id === $other->id) {
            return ApiResponse::success(['path' => []]);
        }

        $adjacency = [];
        foreach (Relationship::all(['person_id', 'related_person_id', 'type']) as $relationship) {
            $adjacency[$relationship->person_id][] = [
                'to' => $relationship->related_person_id,
                'type' => $relationship->type,
                'direction' => 'forward',
            ];
            $adjacency[$relationship->related_person_id][] = [
                'to' => $relationship->person_id,
                'type' => $relationship->type,
                'direction' => 'reverse',
            ];
        }

        $visited = [$person->id => true];
        $queue = [[$person->id, []]];

        while ($queue) {
            [$currentId, $path] = array_shift($queue);

            foreach ($adjacency[$currentId] ?? [] as $edge) {
                if (isset($visited[$edge['to']])) {
                    continue;
                }

                $nextPath = [...$path, ['from' => $currentId, ...$edge]];

                if ($edge['to'] === $other->id) {
                    return ApiResponse::success(['path' => $this->hydratePath($nextPath)]);
                }

                $visited[$edge['to']] = true;
                $queue[] = [$edge['to'], $nextPath];
            }
        }

        return ApiResponse::success(['path' => null]);
    }

    /**
     * @param  array<int, array{from: int, to: int, type: string, direction: string}>  $steps
     * @return array<int, array<string, mixed>>
     */
    private function hydratePath(array $steps): array
    {
        $peopleIds = collect($steps)->flatMap(fn ($step) => [$step['from'], $step['to']])->unique();
        $people = Person::whereIn('id', $peopleIds)->get()->keyBy('id');

        return collect($steps)->map(fn ($step) => [
            'from' => new PersonResource($people[$step['from']]),
            'to' => new PersonResource($people[$step['to']]),
            'type' => $step['type'],
            'direction' => $step['direction'],
        ])->all();
    }
}
