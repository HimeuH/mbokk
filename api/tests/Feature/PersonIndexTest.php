<?php

namespace Tests\Feature;

use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\TreeMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PersonIndexTest extends TestCase
{
    use RefreshDatabase;

    private function makeTree(User $owner): FamilyTree
    {
        $tree = FamilyTree::create([
            'name' => 'Mbacké',
            'slug' => 'mbacke',
            'owner_user_id' => $owner->id,
        ]);
        TreeMember::create(['family_tree_id' => $tree->id, 'user_id' => $owner->id, 'role' => 'owner']);

        return $tree;
    }

    private function makePerson(FamilyTree $tree, User $owner, string $first, string $last, bool $isPublic = true): Person
    {
        return Person::create([
            'owning_family_tree_id' => $tree->id,
            'first_name' => $first,
            'last_name' => $last,
            'gender' => 'male',
            'is_public' => $isPublic,
            'created_by' => $owner->id,
        ]);
    }

    public function test_paginates_at_thirty_per_page(): void
    {
        $owner = User::factory()->create();
        $tree = $this->makeTree($owner);
        for ($i = 1; $i <= 35; $i++) {
            $this->makePerson($tree, $owner, "Personne{$i}", 'Mbacké');
        }

        Sanctum::actingAs($owner);
        $response = $this->getJson("/api/trees/{$tree->slug}/people");

        $response->assertStatus(200);
        $response->assertJsonCount(30, 'data.people');
        $response->assertJsonPath('data.meta.total', 35);
        $response->assertJsonPath('data.meta.last_page', 2);
        $response->assertJsonPath('data.meta.current_page', 1);

        $page2 = $this->getJson("/api/trees/{$tree->slug}/people?page=2");
        $page2->assertJsonCount(5, 'data.people');
    }

    public function test_orders_alphabetically_by_first_then_last_name(): void
    {
        $owner = User::factory()->create();
        $tree = $this->makeTree($owner);
        $this->makePerson($tree, $owner, 'Zeynab', 'Mbacké');
        $this->makePerson($tree, $owner, 'Ahmadou', 'Mbacké');
        $this->makePerson($tree, $owner, 'Ahmadou', 'Bousso');

        Sanctum::actingAs($owner);
        $response = $this->getJson("/api/trees/{$tree->slug}/people");

        $response->assertStatus(200);
        $names = collect($response->json('data.people'))
            ->map(fn ($p) => "{$p['first_name']} {$p['last_name']}")
            ->all();
        $this->assertSame(['Ahmadou Bousso', 'Ahmadou Mbacké', 'Zeynab Mbacké'], $names);
    }

    public function test_non_member_only_sees_public_people(): void
    {
        $owner = User::factory()->create();
        $tree = $this->makeTree($owner);
        $this->makePerson($tree, $owner, 'Public', 'Person', true);
        $this->makePerson($tree, $owner, 'Private', 'Person', false);

        $outsider = User::factory()->create();
        Sanctum::actingAs($outsider);
        $response = $this->getJson("/api/trees/{$tree->slug}/people");

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data.people');
        $response->assertJsonPath('data.people.0.first_name', 'Public');
    }

    public function test_member_sees_private_people_too(): void
    {
        $owner = User::factory()->create();
        $tree = $this->makeTree($owner);
        $this->makePerson($tree, $owner, 'Public', 'Person', true);
        $this->makePerson($tree, $owner, 'Private', 'Person', false);

        Sanctum::actingAs($owner);
        $response = $this->getJson("/api/trees/{$tree->slug}/people");

        $response->assertStatus(200);
        $response->assertJsonCount(2, 'data.people');
    }
}
