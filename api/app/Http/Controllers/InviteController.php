<?php

namespace App\Http\Controllers;

use App\Http\Resources\FamilyTreeResource;
use App\Http\Resources\UserResource;
use App\Http\Responses\ApiResponse;
use App\Models\InviteToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class InviteController extends Controller
{
    /**
     * Claiming a link *is* logging in — no code, nothing the app sent. The
     * person who invited this phone number already vouches for it
     * (TreeMemberController@store), so opening the link is proof enough.
     * Single-use and expiring; a lost session just means asking that same
     * admin to invite the phone number again (a fresh token, same tree_members
     * row via updateOrCreate — no dead end).
     */
    public function claim(Request $request, string $token): JsonResponse
    {
        $invite = InviteToken::where('token', $token)->first();

        if (! $invite || ! $invite->isUsable()) {
            throw ValidationException::withMessages([
                'token' => ['Ce lien d\'invitation est invalide ou a expiré.'],
            ]);
        }

        $user = $invite->user;

        if ($request->filled('name') && $user->name === null) {
            $user->update(['name' => $request->input('name')]);
        }

        $invite->update(['used_at' => now()]);

        return ApiResponse::success([
            'user' => new UserResource($user),
            'token' => $user->createToken('mobile')->plainTextToken,
            'family_tree' => new FamilyTreeResource($invite->familyTree),
        ]);
    }
}
