<?php

namespace Tests\Feature;

use App\Models\FamilyTree;
use App\Models\TreeMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TreeMemberInviteTest extends TestCase
{
    use RefreshDatabase;

    private function makeTreeWithOwner(): array
    {
        $owner = User::factory()->create();
        $tree = FamilyTree::create([
            'name' => 'Mbacké',
            'slug' => 'mbacke',
            'owner_user_id' => $owner->id,
        ]);
        TreeMember::create(['family_tree_id' => $tree->id, 'user_id' => $owner->id, 'role' => 'owner']);

        return [$owner, $tree];
    }

    public function test_owner_can_invite_a_contributor_by_phone_creating_the_user_if_missing(): void
    {
        [$owner, $tree] = $this->makeTreeWithOwner();
        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/trees/{$tree->slug}/members", [
            'phone' => '+221770000001',
            'role' => 'contributor',
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure(['data' => ['member', 'invite_url']]);
        $this->assertDatabaseHas('users', ['phone' => '+221770000001']);
        $newUser = User::where('phone', '+221770000001')->first();
        $this->assertDatabaseHas('tree_members', [
            'family_tree_id' => $tree->id,
            'user_id' => $newUser->id,
            'role' => 'contributor',
        ]);
        $this->assertDatabaseHas('invite_tokens', [
            'user_id' => $newUser->id,
            'family_tree_id' => $tree->id,
        ]);
    }

    public function test_admin_can_invite_but_contributor_cannot(): void
    {
        [$owner, $tree] = $this->makeTreeWithOwner();

        $admin = User::factory()->create();
        TreeMember::create(['family_tree_id' => $tree->id, 'user_id' => $admin->id, 'role' => 'admin']);

        $contributor = User::factory()->create();
        TreeMember::create(['family_tree_id' => $tree->id, 'user_id' => $contributor->id, 'role' => 'contributor']);

        Sanctum::actingAs($admin);
        $this->postJson("/api/trees/{$tree->slug}/members", [
            'phone' => '+221770000002',
            'role' => 'contributor',
        ])->assertStatus(201);

        Sanctum::actingAs($contributor);
        $this->postJson("/api/trees/{$tree->slug}/members", [
            'phone' => '+221770000003',
            'role' => 'contributor',
        ])->assertStatus(403);
    }

    public function test_invite_cannot_downgrade_the_owner(): void
    {
        [$owner, $tree] = $this->makeTreeWithOwner();
        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/trees/{$tree->slug}/members", [
            'phone' => $owner->phone,
            'role' => 'contributor',
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('tree_members', [
            'family_tree_id' => $tree->id,
            'user_id' => $owner->id,
            'role' => 'owner',
        ]);
    }

    public function test_role_must_be_admin_or_contributor(): void
    {
        [$owner, $tree] = $this->makeTreeWithOwner();
        Sanctum::actingAs($owner);

        $this->postJson("/api/trees/{$tree->slug}/members", [
            'phone' => '+221770000004',
            'role' => 'owner',
        ])->assertStatus(422);
    }
}
