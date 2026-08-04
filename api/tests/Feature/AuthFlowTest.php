<?php

namespace Tests\Feature;

use App\Models\FamilyTree;
use App\Models\InviteToken;
use App\Models\TreeMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_creates_an_account_with_no_verification(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'phone' => '+221770000010',
            'name' => 'Awa Sy',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', ['phone' => '+221770000010', 'name' => 'Awa Sy']);
    }

    public function test_register_refuses_an_already_used_phone_number(): void
    {
        User::factory()->create(['phone' => '+221770000011']);

        $this->postJson('/api/auth/register', ['phone' => '+221770000011'])
            ->assertStatus(422);
    }

    public function test_claiming_an_invite_link_logs_in_without_a_code(): void
    {
        $owner = User::factory()->create();
        $tree = FamilyTree::create(['name' => 'Mbacké', 'slug' => 'mbacke', 'owner_user_id' => $owner->id]);
        TreeMember::create(['family_tree_id' => $tree->id, 'user_id' => $owner->id, 'role' => 'owner']);

        $invitee = User::factory()->create(['name' => null]);
        $invite = InviteToken::create([
            'token' => 'test-token-123',
            'user_id' => $invitee->id,
            'family_tree_id' => $tree->id,
            'role' => 'contributor',
            'invited_by_user_id' => $owner->id,
            'expires_at' => now()->addDays(7),
        ]);

        $response = $this->postJson('/api/invite/test-token-123', ['name' => 'Fatou']);

        $response->assertStatus(200);
        $response->assertJsonPath('data.family_tree.slug', 'mbacke');
        $this->assertNotNull($response->json('data.token'));
        $invite->refresh();
        $this->assertNotNull($invite->used_at);
        $this->assertSame('Fatou', $invitee->fresh()->name);
    }

    public function test_an_already_used_invite_link_cannot_be_claimed_again(): void
    {
        $owner = User::factory()->create();
        $tree = FamilyTree::create(['name' => 'Mbacké', 'slug' => 'mbacke', 'owner_user_id' => $owner->id]);
        $invitee = User::factory()->create();

        InviteToken::create([
            'token' => 'used-token',
            'user_id' => $invitee->id,
            'family_tree_id' => $tree->id,
            'role' => 'contributor',
            'invited_by_user_id' => $owner->id,
            'expires_at' => now()->addDays(7),
            'used_at' => now(),
        ]);

        $this->postJson('/api/invite/used-token')->assertStatus(422);
    }

    public function test_an_expired_invite_link_cannot_be_claimed(): void
    {
        $owner = User::factory()->create();
        $tree = FamilyTree::create(['name' => 'Mbacké', 'slug' => 'mbacke', 'owner_user_id' => $owner->id]);
        $invitee = User::factory()->create();

        InviteToken::create([
            'token' => 'expired-token',
            'user_id' => $invitee->id,
            'family_tree_id' => $tree->id,
            'role' => 'contributor',
            'invited_by_user_id' => $owner->id,
            'expires_at' => now()->subDay(),
        ]);

        $this->postJson('/api/invite/expired-token')->assertStatus(422);
    }
}
