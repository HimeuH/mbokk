<?php

use App\Http\Controllers\AccessRequestController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\EditProposalController;
use App\Http\Controllers\FamilyTreeController;
use App\Http\Controllers\InviteController;
use App\Http\Controllers\PersonController;
use App\Http\Controllers\PersonProfileController;
use App\Http\Controllers\PersonSearchController;
use App\Http\Controllers\RelationshipController;
use App\Http\Controllers\RelationshipFinderController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\TreeMemberController;
use App\Http\Resources\UserResource;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Bootstrap only (first tree, nobody to invite you) — trust-on-first-use,
// no OTP. Everyone else logs in by claiming an invite link below.
Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:10,1');

// Returning-user login: phone + PIN. Tighter throttle than register/invite —
// a 4-digit PIN is a small guess space, this is the brute-force surface.
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

// Claiming a link is how everyone else logs in — see TreeMemberController@store.
Route::post('/invite/{token}', [InviteController::class, 'claim'])->middleware('throttle:10,1');

// Public directory search — no auth, respects `is_public` (Phase 6).
Route::get('/search', SearchController::class);

// Public person profile (Phase 7, SEO) — numeric constraint so this never
// shadows the literal `/people/search` route below.
Route::get('/people/{person}', PersonProfileController::class)->whereNumber('person');

// Public — reaching someone with no session at all is the point (the
// self-serve half of the no-recovery gap, see docs/mvp-plan.md Phase 2).
Route::post('/trees/{tree:slug}/access-requests', [AccessRequestController::class, 'store'])
    ->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', fn (Request $request) => ApiResponse::success(new UserResource($request->user())));

    // Proactive PIN setup (post-login prompt) — refuses if pin_hash is already set.
    Route::post('/user/pin', [AuthController::class, 'setPin']);

    // "My trees" only — not a public directory (that's /search above).
    Route::get('/trees', [FamilyTreeController::class, 'index']);
    Route::post('/trees', [FamilyTreeController::class, 'store']);
    Route::get('/trees/{tree:slug}', [FamilyTreeController::class, 'show']);

    // Paginated — GET /trees/{slug} above still returns every person
    // unpaginated too, for the SVG tree view; this is what the "Liste" tab
    // actually renders from (PersonController::index's own docblock).
    Route::get('/trees/{tree:slug}/people', [PersonController::class, 'index']);

    // Owner/admin write directly (PersonPolicy); any other tree member's
    // write becomes an edit_proposals row instead (see the *Controller's
    // Gate::denies branches) — Phase 5.
    Route::post('/trees/{tree:slug}/people', [PersonController::class, 'store']);
    // PUT, not POST — multipart file uploads use Laravel's `_method` spoofing field.
    Route::put('/trees/{tree:slug}/people/{person}', [PersonController::class, 'update']);
    Route::delete('/trees/{tree:slug}/people/{person}', [PersonController::class, 'destroy']);

    // Roles & the approval queue — owner/admin only (FamilyTreePolicy::manageMembers).
    Route::get('/trees/{tree:slug}/members', [TreeMemberController::class, 'index']);
    Route::post('/trees/{tree:slug}/members', [TreeMemberController::class, 'store']);
    Route::get('/trees/{tree:slug}/proposals', [EditProposalController::class, 'index']);
    Route::post('/proposals/{proposal}/approve', [EditProposalController::class, 'approve']);
    Route::post('/proposals/{proposal}/reject', [EditProposalController::class, 'reject']);
    Route::get('/trees/{tree:slug}/access-requests', [AccessRequestController::class, 'index']);
    Route::post('/access-requests/{accessRequest}/dismiss', [AccessRequestController::class, 'dismiss']);

    // Cross-tree — a person's relationships aren't scoped to one tree's routes.
    Route::get('/people/search', PersonSearchController::class);
    Route::get('/people/{person}/relationships', [RelationshipController::class, 'index']);
    Route::post('/people/{person}/relationships', [RelationshipController::class, 'store']);
    Route::delete('/people/{person}/relationships/{relationship}', [RelationshipController::class, 'destroy']);
    Route::get('/people/{person}/relationship/{other}', RelationshipFinderController::class);
});
