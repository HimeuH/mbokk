<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTreeMemberRequest;
use App\Http\Resources\TreeMemberResource;
use App\Http\Responses\ApiResponse;
use App\Models\AccessRequest;
use App\Models\FamilyTree;
use App\Models\InviteToken;
use App\Models\TreeMember;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TreeMemberController extends Controller
{
    public function index(Request $request, FamilyTree $tree): JsonResponse
    {
        Gate::authorize('manageMembers', $tree);

        $members = TreeMember::with('user')->where('family_tree_id', $tree->id)->get();

        return ApiResponse::success(TreeMemberResource::collection($members));
    }

    /**
     * Invite a contributor/admin by phone number. The account is created
     * (name-less) if it doesn't exist yet, and a fresh single-use invite
     * link is issued every time — including on a re-invite of an existing
     * member, which doubles as "regenerate my invite link" for someone who
     * lost their session (also reachable via AccessRequestController, which
     * this resolves automatically below). The admin is responsible for
     * delivering the link themselves (WhatsApp, in person, however); the
     * app never sends it.
     */
    public function store(StoreTreeMemberRequest $request, FamilyTree $tree): JsonResponse
    {
        $user = User::firstOrCreate(['phone' => $request->validated('phone')]);

        $existing = TreeMember::where('family_tree_id', $tree->id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing?->role === 'owner') {
            throw ValidationException::withMessages([
                'phone' => ['Cette personne est déjà propriétaire de cet arbre.'],
            ]);
        }

        $role = $request->validated('role');

        $member = TreeMember::updateOrCreate(
            ['family_tree_id' => $tree->id, 'user_id' => $user->id],
            ['role' => $role],
        );

        $invite = InviteToken::create([
            'token' => Str::random(40),
            'user_id' => $user->id,
            'family_tree_id' => $tree->id,
            'role' => $role,
            'invited_by_user_id' => $request->user()->id,
            'expires_at' => now()->addDays(7),
        ]);

        AccessRequest::where('family_tree_id', $tree->id)
            ->where('phone', $user->phone)
            ->whereNull('resolved_at')
            ->update(['resolved_at' => now(), 'resolved_by_user_id' => $request->user()->id]);

        return ApiResponse::success([
            'member' => new TreeMemberResource($member->load('user')),
            'invite_url' => rtrim(config('app.frontend_url'), '/')."/invite/{$invite->token}",
        ], status: $existing ? 200 : 201);
    }
}
