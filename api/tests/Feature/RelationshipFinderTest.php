<?php

namespace Tests\Feature;

use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\Relationship;
use App\Models\TreeMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RelationshipFinderTest extends TestCase
{
    use RefreshDatabase;

    private FamilyTree $tree;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create();
        $this->tree = FamilyTree::create([
            'name' => 'Mbacké',
            'slug' => 'mbacke',
            'owner_user_id' => $this->owner->id,
        ]);
        TreeMember::create(['family_tree_id' => $this->tree->id, 'user_id' => $this->owner->id, 'role' => 'owner']);
    }

    private function makePerson(array $overrides = []): Person
    {
        return Person::create([
            'owning_family_tree_id' => $this->tree->id,
            'first_name' => 'Prénom',
            'last_name' => 'Nom',
            'gender' => 'male',
            'created_by' => $this->owner->id,
            ...$overrides,
        ]);
    }

    public function test_same_person_returns_an_empty_path(): void
    {
        $person = $this->makePerson();
        Sanctum::actingAs($this->owner);

        $response = $this->getJson("/api/people/{$person->id}/relationship/{$person->id}");

        $response->assertStatus(200);
        $response->assertJson(['data' => ['path' => []]]);
    }

    public function test_finds_a_direct_parent_child_path(): void
    {
        $parent = $this->makePerson(['first_name' => 'Cheikh']);
        $child = $this->makePerson(['first_name' => 'Serigne']);
        Relationship::create(['person_id' => $parent->id, 'related_person_id' => $child->id, 'type' => 'parent_of']);

        Sanctum::actingAs($this->owner);
        $response = $this->getJson("/api/people/{$parent->id}/relationship/{$child->id}");

        $response->assertStatus(200);
        $path = $response->json('data.path');
        $this->assertCount(1, $path);
        $this->assertSame($parent->id, $path[0]['from']['id']);
        $this->assertSame($child->id, $path[0]['to']['id']);
        $this->assertSame('parent_of', $path[0]['type']);
        $this->assertSame('forward', $path[0]['direction']);
    }

    public function test_finds_a_multi_hop_path_across_generations(): void
    {
        $grandparent = $this->makePerson(['first_name' => 'Bamba']);
        $parent = $this->makePerson(['first_name' => 'Moustapha']);
        $child = $this->makePerson(['first_name' => 'Saliou']);

        Relationship::create(['person_id' => $grandparent->id, 'related_person_id' => $parent->id, 'type' => 'parent_of']);
        Relationship::create(['person_id' => $parent->id, 'related_person_id' => $child->id, 'type' => 'parent_of']);

        Sanctum::actingAs($this->owner);
        $response = $this->getJson("/api/people/{$grandparent->id}/relationship/{$child->id}");

        $response->assertStatus(200);
        $path = $response->json('data.path');
        $this->assertCount(2, $path);
        $this->assertSame($grandparent->id, $path[0]['from']['id']);
        $this->assertSame($parent->id, $path[0]['to']['id']);
        $this->assertSame($parent->id, $path[1]['from']['id']);
        $this->assertSame($child->id, $path[1]['to']['id']);
    }

    public function test_returns_null_path_when_not_connected(): void
    {
        $person = $this->makePerson();
        $stranger = $this->makePerson(['first_name' => 'Autre']);

        Sanctum::actingAs($this->owner);
        $response = $this->getJson("/api/people/{$person->id}/relationship/{$stranger->id}");

        $response->assertStatus(200);
        $response->assertJson(['data' => ['path' => null]]);
    }

    public function test_reverse_direction_is_reported_when_traversing_child_to_parent(): void
    {
        $parent = $this->makePerson(['first_name' => 'Cheikh']);
        $child = $this->makePerson(['first_name' => 'Serigne']);
        Relationship::create(['person_id' => $parent->id, 'related_person_id' => $child->id, 'type' => 'parent_of']);

        Sanctum::actingAs($this->owner);
        $response = $this->getJson("/api/people/{$child->id}/relationship/{$parent->id}");

        $response->assertStatus(200);
        $path = $response->json('data.path');
        $this->assertSame('reverse', $path[0]['direction']);
    }

    public function test_cannot_look_up_a_relationship_involving_a_private_person_outside_the_tree(): void
    {
        $person = $this->makePerson(['is_public' => false]);

        $outsider = User::factory()->create();
        $otherTree = FamilyTree::create([
            'name' => 'Autre',
            'slug' => 'autre',
            'owner_user_id' => $outsider->id,
        ]);
        TreeMember::create(['family_tree_id' => $otherTree->id, 'user_id' => $outsider->id, 'role' => 'owner']);
        $otherPerson = Person::create([
            'owning_family_tree_id' => $otherTree->id,
            'first_name' => 'Autre',
            'last_name' => 'Personne',
            'gender' => 'female',
            'created_by' => $outsider->id,
        ]);

        Sanctum::actingAs($outsider);
        $this->getJson("/api/people/{$person->id}/relationship/{$otherPerson->id}")->assertStatus(403);
    }
}
