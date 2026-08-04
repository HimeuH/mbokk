<?php

namespace App\Http\Controllers;

use App\Http\Resources\EditProposalResource;
use App\Http\Responses\ApiResponse;
use App\Models\EditProposal;
use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\Relationship;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class EditProposalController extends Controller
{
    public function index(Request $request, FamilyTree $tree): JsonResponse
    {
        Gate::authorize('manageMembers', $tree);

        $proposals = EditProposal::where('family_tree_id', $tree->id)
            ->where('status', $request->query('status', 'pending'))
            ->with('proposer')
            ->latest()
            ->get();

        return ApiResponse::success(EditProposalResource::collection($proposals));
    }

    public function approve(Request $request, EditProposal $proposal): JsonResponse
    {
        Gate::authorize('review', $proposal);
        abort_unless($proposal->status === 'pending', 422, 'Cette proposition a déjà été traitée.');
        $this->checkPin($request);

        $this->applyProposal($proposal);

        $proposal->update([
            'status' => 'approved',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return ApiResponse::success(new EditProposalResource($proposal));
    }

    public function reject(Request $request, EditProposal $proposal): JsonResponse
    {
        Gate::authorize('review', $proposal);
        abort_unless($proposal->status === 'pending', 422, 'Cette proposition a déjà été traitée.');
        $this->checkPin($request);

        $proposal->update([
            'status' => 'rejected',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return ApiResponse::success(new EditProposalResource($proposal));
    }

    /**
     * The stamp's PIN: checked on every approve/reject, not on login — see
     * docs/mvp-plan.md Phase 2. A reviewer with no pin_hash yet gets one set
     * from this same request rather than a separate "create your PIN" round
     * trip: they already passed Gate::authorize('review') above, so trusting
     * their first submitted PIN as the one to store is safe.
     */
    private function checkPin(Request $request): void
    {
        $request->validate([
            'pin' => ['required', 'string', 'regex:/^\d{4}$/'],
        ]);

        $user = $request->user();
        $pin = $request->input('pin');

        if ($user->pin_hash === null) {
            $user->forceFill(['pin_hash' => Hash::make($pin)])->save();

            return;
        }

        if (! Hash::check($pin, $user->pin_hash)) {
            throw ValidationException::withMessages([
                'pin' => ['Code PIN incorrect.'],
            ]);
        }
    }

    private function applyProposal(EditProposal $proposal): void
    {
        $action = $proposal->payload['action'] ?? null;
        $fields = $proposal->payload['fields'] ?? [];

        match ([$proposal->target_type, $action]) {
            ['person', 'create'] => Person::create([
                ...$fields,
                'owning_family_tree_id' => $proposal->family_tree_id,
                'created_by' => $proposal->proposer_user_id,
            ]),
            ['person', 'update'] => Person::findOrFail($proposal->target_id)->update($fields),
            ['person', 'delete'] => Person::findOrFail($proposal->target_id)->delete(),
            ['relationship', 'create'] => Relationship::create($fields),
            ['relationship', 'delete'] => Relationship::findOrFail($proposal->target_id)->delete(),
            default => abort(500, 'Type de proposition inconnu.'),
        };
    }
}
