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

class FamilyTreeShowTest extends TestCase
{
    use RefreshDatabase;

    public function test_show_includes_relationships_between_this_trees_own_people(): void
    {
        $owner = User::factory()->create();
        $tree = FamilyTree::create([
            'name' => 'Mbacké',
            'slug' => 'mbacke',
            'owner_user_id' => $owner->id,
        ]);
        TreeMember::create(['family_tree_id' => $tree->id, 'user_id' => $owner->id, 'role' => 'owner']);

        $parent = Person::create([
            'owning_family_tree_id' => $tree->id,
            'first_name' => 'Cheikh',
            'last_name' => 'Mbacké',
            'gender' => 'male',
            'created_by' => $owner->id,
        ]);
        $child = Person::create([
            'owning_family_tree_id' => $tree->id,
            'first_name' => 'Serigne',
            'last_name' => 'Mbacké',
            'gender' => 'male',
            'created_by' => $owner->id,
        ]);
        Relationship::create([
            'person_id' => $parent->id,
            'related_person_id' => $child->id,
            'type' => 'parent_of',
        ]);

        Sanctum::actingAs($owner);
        $response = $this->getJson("/api/trees/{$tree->slug}");

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data.relationships');
        $response->assertJsonFragment(['role' => 'owner']);
    }

    public function test_show_excludes_relationships_reaching_outside_this_trees_people(): void
    {
        $owner = User::factory()->create();
        $tree = FamilyTree::create([
            'name' => 'Mbacké',
            'slug' => 'mbacke',
            'owner_user_id' => $owner->id,
        ]);
        TreeMember::create(['family_tree_id' => $tree->id, 'user_id' => $owner->id, 'role' => 'owner']);

        $person = Person::create([
            'owning_family_tree_id' => $tree->id,
            'first_name' => 'Cheikh',
            'last_name' => 'Mbacké',
            'gender' => 'male',
            'created_by' => $owner->id,
        ]);

        $otherTree = FamilyTree::create([
            'name' => 'Diallo',
            'slug' => 'diallo',
            'owner_user_id' => $owner->id,
        ]);
        $outsider = Person::create([
            'owning_family_tree_id' => $otherTree->id,
            'first_name' => 'Autre',
            'last_name' => 'Diallo',
            'gender' => 'female',
            'created_by' => $owner->id,
        ]);
        Relationship::create([
            'person_id' => $person->id,
            'related_person_id' => $outsider->id,
            'type' => 'spouse_of',
        ]);

        Sanctum::actingAs($owner);
        $response = $this->getJson("/api/trees/{$tree->slug}");

        $response->assertStatus(200);
        $response->assertJsonCount(0, 'data.relationships');
    }
}
