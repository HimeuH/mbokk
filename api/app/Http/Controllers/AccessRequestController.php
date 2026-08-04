<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAccessRequestRequest;
use App\Http\Resources\AccessRequestResource;
use App\Http\Responses\ApiResponse;
use App\Models\AccessRequest;
use App\Models\FamilyTree;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AccessRequestController extends Controller
{
    /**
     * Public — the whole point is reaching someone who has no session and no
     * saved invite link. Doesn't create any access itself; an admin still
     * has to act on it via TreeMemberController@store, same as always.
     */
    public function store(StoreAccessRequestRequest $request, FamilyTree $tree): JsonResponse
    {
        $existing = AccessRequest::where('family_tree_id', $tree->id)
            ->where('phone', $request->validated('phone'))
            ->whereNull('resolved_at')
            ->first();

        if ($existing) {
            return ApiResponse::success(new AccessRequestResource($existing));
        }

        $accessRequest = AccessRequest::create([
            'family_tree_id' => $tree->id,
            'phone' => $request->validated('phone'),
            'message' => $request->validated('message'),
        ]);

        return ApiResponse::success(new AccessRequestResource($accessRequest), status: 201);
    }

    public function index(Request $request, FamilyTree $tree): JsonResponse
    {
        Gate::authorize('manageMembers', $tree);

        $requests = AccessRequest::where('family_tree_id', $tree->id)
            ->whereNull('resolved_at')
            ->latest()
            ->get();

        return ApiResponse::success(AccessRequestResource::collection($requests));
    }

    public function dismiss(Request $request, AccessRequest $accessRequest): JsonResponse
    {
        Gate::authorize('manageMembers', $accessRequest->familyTree);
        abort_if($accessRequest->resolved_at !== null, 422, 'Déjà traitée.');

        $accessRequest->update([
            'resolved_at' => now(),
            'resolved_by_user_id' => $request->user()->id,
        ]);

        return ApiResponse::success(new AccessRequestResource($accessRequest));
    }
}
