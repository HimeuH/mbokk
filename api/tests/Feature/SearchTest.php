<?php

namespace Tests\Feature;

use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class SearchTest extends TestCase
{
    use RefreshDatabase;

    private function makeTree(string $name = 'Mbacké'): FamilyTree
    {
        $owner = User::factory()->create();

        return FamilyTree::create([
            'name' => $name,
            'slug' => Str::slug($name),
            'owner_user_id' => $owner->id,
        ]);
    }

    private function makePerson(FamilyTree $tree, array $overrides = []): Person
    {
        return Person::create([
            'owning_family_tree_id' => $tree->id,
            'first_name' => 'Serigne',
            'last_name' => 'Fallou',
            'gender' => 'male',
            'created_by' => $tree->owner_user_id,
            ...$overrides,
        ]);
    }

    public function test_search_requires_no_auth_and_finds_public_people(): void
    {
        $tree = $this->makeTree();
        $this->makePerson($tree, ['first_name' => 'Ibrahima', 'last_name' => 'Fall', 'is_public' => true]);

        $response = $this->getJson('/api/search?q=Ibrahima');

        $response->assertStatus(200);
        $response->assertJsonFragment(['first_name' => 'Ibrahima']);
    }

    public function test_search_excludes_private_people(): void
    {
        $tree = $this->makeTree();
        $this->makePerson($tree, ['first_name' => 'Secrete', 'last_name' => 'Personne', 'is_public' => false]);

        $response = $this->getJson('/api/search?q=Secrete');

        $response->assertStatus(200);
        $response->assertJsonCount(0, 'data.people');
    }

    public function test_search_matches_tree_name(): void
    {
        $this->makeTree('Famille Diallo');

        $response = $this->getJson('/api/search?q=Diallo');

        $response->assertStatus(200);
        $response->assertJsonFragment(['name' => 'Famille Diallo']);
    }

    public function test_search_requires_at_least_two_characters(): void
    {
        $this->getJson('/api/search?q=a')->assertStatus(422);
        $this->getJson('/api/search')->assertStatus(422);
    }
}
