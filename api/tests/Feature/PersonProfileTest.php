<?php

namespace Tests\Feature;

use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\Relationship;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PersonProfileTest extends TestCase
{
    use RefreshDatabase;

    private FamilyTree $tree;

    protected function setUp(): void
    {
        parent::setUp();

        $owner = User::factory()->create();
        $this->tree = FamilyTree::create([
            'name' => 'Mbacké',
            'slug' => 'mbacke',
            'owner_user_id' => $owner->id,
        ]);
    }

    private function makePerson(array $overrides = []): Person
    {
        return Person::create([
            'owning_family_tree_id' => $this->tree->id,
            'first_name' => 'Prénom',
            'last_name' => 'Nom',
            'gender' => 'male',
            'created_by' => $this->tree->owner_user_id,
            ...$overrides,
        ]);
    }

    public function test_public_person_is_visible_without_auth(): void
    {
        $person = $this->makePerson(['first_name' => 'Ibrahima', 'is_public' => true]);

        $response = $this->getJson("/api/people/{$person->id}");

        $response->assertStatus(200);
        $response->assertJsonFragment(['first_name' => 'Ibrahima']);
    }

    public function test_private_person_returns_404(): void
    {
        $person = $this->makePerson(['is_public' => false]);

        $this->getJson("/api/people/{$person->id}")->assertStatus(404);
    }

    public function test_relationship_to_a_private_person_is_hidden(): void
    {
        $person = $this->makePerson(['first_name' => 'Public', 'is_public' => true]);
        $privateRelative = $this->makePerson(['first_name' => 'Prive', 'is_public' => false]);
        Relationship::create([
            'person_id' => $person->id,
            'related_person_id' => $privateRelative->id,
            'type' => 'parent_of',
        ]);

        $response = $this->getJson("/api/people/{$person->id}");

        $response->assertStatus(200);
        $response->assertJsonCount(0, 'data.relationships');
    }

    public function test_relationship_between_two_public_people_is_shown(): void
    {
        $person = $this->makePerson(['first_name' => 'Public', 'is_public' => true]);
        $child = $this->makePerson(['first_name' => 'Enfant', 'is_public' => true]);
        Relationship::create([
            'person_id' => $person->id,
            'related_person_id' => $child->id,
            'type' => 'parent_of',
        ]);

        $response = $this->getJson("/api/people/{$person->id}");

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data.relationships');
    }
}
