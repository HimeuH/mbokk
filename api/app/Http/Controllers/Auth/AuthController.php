<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\SetPinRequest;
use App\Http\Resources\UserResource;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Bootstrap-only: creates the account for someone starting their first
     * tree with nobody to invite them yet. Trust-on-first-use, no OTP — the
     * app never sends anything. Deliberately can't be used to log into an
     * *existing* phone number (that would make it a full account-takeover
     * backdoor); anyone with an existing account gets back in via an
     * invite link from a tree they belong to (InviteController), not here.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        if (User::where('phone', $request->validated('phone'))->exists()) {
            throw ValidationException::withMessages([
                'phone' => ['Ce numéro est déjà associé à un compte. Demandez un lien d\'invitation à un membre de votre famille pour vous connecter.'],
            ]);
        }

        $user = User::create([
            'phone' => $request->validated('phone'),
            'name' => $request->validated('name'),
        ]);

        return ApiResponse::success([
            'user' => new UserResource($user),
            'token' => $user->createToken('mobile')->plainTextToken,
        ], status: 201);
    }

    /**
     * Reissues a token for a returning user, by phone + PIN. Deliberately
     * refuses accounts with no pin_hash yet (never trust-on-first-use here,
     * unlike register/invite-claim) — an existing account already has a
     * legitimate owner, so silently letting whoever types the phone number
     * first set the PIN would be a full account-takeover path, not just a
     * claim on an unclaimed number. `pin_hash` is set the same way it always
     * has been: trust-on-first-use inside EditProposalController::checkPin(),
     * which only fires while already holding a valid session token.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('phone', $request->validated('phone'))->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'phone' => ['Aucun compte n\'est associé à ce numéro.'],
            ]);
        }

        if ($user->pin_hash === null) {
            throw ValidationException::withMessages([
                'pin' => ['Aucun code PIN n\'est encore configuré pour ce compte. Validez ou rejetez une proposition depuis un appareil déjà connecté pour en définir un, ou demandez une invitation à un administrateur de votre arbre.'],
            ]);
        }

        if (! Hash::check($request->validated('pin'), $user->pin_hash)) {
            throw ValidationException::withMessages([
                'pin' => ['Code PIN incorrect.'],
            ]);
        }

        return ApiResponse::success([
            'user' => new UserResource($user),
            'token' => $user->createToken('mobile')->plainTextToken,
        ]);
    }

    /**
     * Lets an already-authenticated user set their own PIN proactively
     * (prompted right after register/invite-claim on the frontend), instead
     * of only ever getting one lazily the first time they approve/reject a
     * proposal (EditProposalController::checkPin()). Still refuses to
     * overwrite an existing pin_hash here — changing a known PIN is a
     * different, not-yet-built flow, not this one.
     */
    public function setPin(SetPinRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($user->pin_hash !== null) {
            throw ValidationException::withMessages([
                'pin' => ['Un code PIN est déjà configuré pour ce compte.'],
            ]);
        }

        $user->forceFill(['pin_hash' => Hash::make($request->validated('pin'))])->save();

        return ApiResponse::success(new UserResource($user));
    }
}
