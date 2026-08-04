<?php

namespace Tests\Feature;

use App\Models\AccessRequest;
use App\Models\FamilyTree;
use App\Models\TreeMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccessRequestTest extends TestCase
{
    use RefreshDatabase;

    private function makeTreeWithOwner(): array
    {
        $owner = User::factory()->create();
        $tree = FamilyTree::create(['name' => 'Mbacké', 'slug' => 'mbacke', 'owner_user_id' => $owner->id]);
        TreeMember::create(['family_tree_id' => $tree->id, 'user_id' => $owner->id, 'role' => 'owner']);

        return [$owner, $tree];
    }

    public function test_anyone_can_submit_an_access_request_with_no_session(): void
    {
        [, $tree] = $this->makeTreeWithOwner();

        $this->postJson("/api/trees/{$tree->slug}/access-requests", [
            'phone' => '+221770000020',
            'message' => "C'est Awa, la fille de Serigne Fallou.",
        ])->assertStatus(201);

        $this->assertDatabaseHas('access_requests', [
            'family_tree_id' => $tree->id,
            'phone' => '+221770000020',
        ]);
    }

    public function test_resubmitting_while_pending_does_not_duplicate(): void
    {
        [, $tree] = $this->makeTreeWithOwner();

        $this->postJson("/api/trees/{$tree->slug}/access-requests", ['phone' => '+221770000021'])
            ->assertStatus(201);
        $this->postJson("/api/trees/{$tree->slug}/access-requests", ['phone' => '+221770000021'])
            ->assertStatus(200);

        $this->assertDatabaseCount('access_requests', 1);
    }

    public function test_only_owner_or_admin_can_list_or_dismiss_requests(): void
    {
        [$owner, $tree] = $this->makeTreeWithOwner();
        $contributor = User::factory()->create();
        TreeMember::create(['family_tree_id' => $tree->id, 'user_id' => $contributor->id, 'role' => 'contributor']);

        $accessRequest = AccessRequest::create(['family_tree_id' => $tree->id, 'phone' => '+221770000022']);

        Sanctum::actingAs($contributor);
        $this->getJson("/api/trees/{$tree->slug}/access-requests")->assertStatus(403);
        $this->postJson("/api/access-requests/{$accessRequest->id}/dismiss")->assertStatus(403);

        Sanctum::actingAs($owner);
        $this->getJson("/api/trees/{$tree->slug}/access-requests")->assertStatus(200)
            ->assertJsonCount(1, 'data');
        $this->postJson("/api/access-requests/{$accessRequest->id}/dismiss")->assertStatus(200);

        $accessRequest->refresh();
        $this->assertNotNull($accessRequest->resolved_at);
        $this->assertSame($owner->id, $accessRequest->resolved_by_user_id);
    }

    public function test_reinviting_the_phone_number_auto_resolves_the_request(): void
    {
        [$owner, $tree] = $this->makeTreeWithOwner();
        AccessRequest::create(['family_tree_id' => $tree->id, 'phone' => '+221770000023']);

        Sanctum::actingAs($owner);
        $this->postJson("/api/trees/{$tree->slug}/members", [
            'phone' => '+221770000023',
            'role' => 'contributor',
        ])->assertStatus(201);

        $this->assertNotNull(AccessRequest::where('phone', '+221770000023')->first()->resolved_at);
    }
}
