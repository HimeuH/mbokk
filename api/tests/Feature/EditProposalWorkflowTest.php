<?php

namespace Tests\Feature;

use App\Models\EditProposal;
use App\Models\FamilyTree;
use App\Models\Person;
use App\Models\TreeMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EditProposalWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private FamilyTree $tree;

    private User $owner;

    private User $contributor;

    private User $outsider;

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

        $this->contributor = User::factory()->create();
        TreeMember::create([
            'family_tree_id' => $this->tree->id,
            'user_id' => $this->contributor->id,
            'role' => 'contributor',
        ]);

        $this->outsider = User::factory()->create();
    }

    private function makePerson(array $overrides = []): Person
    {
        return Person::create([
            'owning_family_tree_id' => $this->tree->id,
            'first_name' => 'Serigne',
            'last_name' => 'Fallou',
            'gender' => 'male',
            'created_by' => $this->owner->id,
            ...$overrides,
        ]);
    }

    public function test_owner_creating_a_person_writes_directly_not_a_proposal(): void
    {
        Sanctum::actingAs($this->owner);

        $response = $this->postJson("/api/trees/{$this->tree->slug}/people", [
            'first_name' => 'Ibrahima',
            'last_name' => 'Fall',
            'gender' => 'male',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('people', ['first_name' => 'Ibrahima', 'last_name' => 'Fall']);
        $this->assertDatabaseCount('edit_proposals', 0);
    }

    public function test_contributor_creating_a_person_creates_a_proposal_instead(): void
    {
        Sanctum::actingAs($this->contributor);

        $response = $this->postJson("/api/trees/{$this->tree->slug}/people", [
            'first_name' => 'Ibrahima',
            'last_name' => 'Fall',
            'gender' => 'male',
        ]);

        $response->assertStatus(202);
        $this->assertDatabaseMissing('people', ['first_name' => 'Ibrahima', 'last_name' => 'Fall']);
        $this->assertDatabaseHas('edit_proposals', [
            'family_tree_id' => $this->tree->id,
            'proposer_user_id' => $this->contributor->id,
            'target_type' => 'person',
            'target_id' => null,
            'status' => 'pending',
        ]);
    }

    public function test_outsider_cannot_propose_at_all(): void
    {
        Sanctum::actingAs($this->outsider);

        $this->postJson("/api/trees/{$this->tree->slug}/people", [
            'first_name' => 'Ibrahima',
            'last_name' => 'Fall',
            'gender' => 'male',
        ])->assertStatus(403);
    }

    public function test_contributor_updating_a_person_creates_a_proposal(): void
    {
        $person = $this->makePerson();

        Sanctum::actingAs($this->contributor);

        $response = $this->putJson(
            "/api/trees/{$this->tree->slug}/people/{$person->id}",
            ['first_name' => 'Renamed']
        );

        $response->assertStatus(202);
        $person->refresh();
        $this->assertSame('Serigne', $person->first_name);
        $this->assertDatabaseHas('edit_proposals', [
            'target_type' => 'person',
            'target_id' => $person->id,
            'status' => 'pending',
        ]);
    }

    public function test_contributor_deleting_a_person_creates_a_proposal(): void
    {
        $person = $this->makePerson();

        Sanctum::actingAs($this->contributor);

        $this->deleteJson("/api/trees/{$this->tree->slug}/people/{$person->id}")
            ->assertStatus(202);

        $this->assertDatabaseHas('people', ['id' => $person->id]);
        $this->assertDatabaseHas('edit_proposals', [
            'target_type' => 'person',
            'target_id' => $person->id,
            'status' => 'pending',
        ]);
    }

    public function test_contributor_adding_a_relationship_creates_a_proposal(): void
    {
        $person = $this->makePerson();
        $related = $this->makePerson(['first_name' => 'Autre']);

        Sanctum::actingAs($this->contributor);

        $response = $this->postJson(
            "/api/people/{$person->id}/relationships",
            ['related_person_id' => $related->id, 'type' => 'spouse_of']
        );

        $response->assertStatus(202);
        $this->assertDatabaseCount('relationships', 0);
        $this->assertDatabaseHas('edit_proposals', [
            'target_type' => 'relationship',
            'target_id' => null,
            'status' => 'pending',
        ]);
    }

    public function test_owner_approving_a_create_proposal_creates_the_person(): void
    {
        Sanctum::actingAs($this->contributor);
        $this->postJson("/api/trees/{$this->tree->slug}/people", [
            'first_name' => 'Ibrahima',
            'last_name' => 'Fall',
            'gender' => 'male',
        ])->assertStatus(202);

        $proposal = EditProposal::firstOrFail();

        Sanctum::actingAs($this->owner);
        $this->postJson("/api/proposals/{$proposal->id}/approve", ['pin' => '1234'])
            ->assertStatus(200);

        $this->assertDatabaseHas('people', [
            'first_name' => 'Ibrahima',
            'last_name' => 'Fall',
            'owning_family_tree_id' => $this->tree->id,
            'created_by' => $this->contributor->id,
        ]);
        $proposal->refresh();
        $this->assertSame('approved', $proposal->status);
        $this->assertSame($this->owner->id, $proposal->reviewed_by);
        $this->assertNotNull($proposal->reviewed_at);
    }

    public function test_owner_rejecting_a_proposal_does_not_apply_it(): void
    {
        $person = $this->makePerson();

        Sanctum::actingAs($this->contributor);
        $this->deleteJson("/api/trees/{$this->tree->slug}/people/{$person->id}")
            ->assertStatus(202);

        $proposal = EditProposal::firstOrFail();

        Sanctum::actingAs($this->owner);
        $this->postJson("/api/proposals/{$proposal->id}/reject", ['pin' => '1234'])
            ->assertStatus(200);

        $this->assertDatabaseHas('people', ['id' => $person->id]);
        $proposal->refresh();
        $this->assertSame('rejected', $proposal->status);
    }

    public function test_contributor_cannot_approve_their_own_proposal(): void
    {
        Sanctum::actingAs($this->contributor);
        $this->postJson("/api/trees/{$this->tree->slug}/people", [
            'first_name' => 'Ibrahima',
            'last_name' => 'Fall',
            'gender' => 'male',
        ])->assertStatus(202);

        $proposal = EditProposal::firstOrFail();

        // Still acting as the contributor — approving own proposal.
        $this->postJson("/api/proposals/{$proposal->id}/approve")->assertStatus(403);
    }

    public function test_an_already_reviewed_proposal_cannot_be_reviewed_again(): void
    {
        Sanctum::actingAs($this->contributor);
        $this->postJson("/api/trees/{$this->tree->slug}/people", [
            'first_name' => 'Ibrahima',
            'last_name' => 'Fall',
            'gender' => 'male',
        ])->assertStatus(202);

        $proposal = EditProposal::firstOrFail();

        Sanctum::actingAs($this->owner);
        $this->postJson("/api/proposals/{$proposal->id}/approve", ['pin' => '1234'])
            ->assertStatus(200);
        // Already reviewed — the pending check fires before the pin check, so no pin needed here.
        $this->postJson("/api/proposals/{$proposal->id}/reject")->assertStatus(422);
    }

    public function test_first_approval_sets_the_reviewer_pin_and_it_is_required_after(): void
    {
        Sanctum::actingAs($this->contributor);
        $this->postJson("/api/trees/{$this->tree->slug}/people", [
            'first_name' => 'Ibrahima',
            'last_name' => 'Fall',
            'gender' => 'male',
        ])->assertStatus(202);
        $first = EditProposal::firstOrFail();

        Sanctum::actingAs($this->owner);
        $this->postJson("/api/proposals/{$first->id}/approve", ['pin' => '4242'])
            ->assertStatus(200);
        $this->owner->refresh();
        $this->assertNotNull($this->owner->pin_hash);

        Sanctum::actingAs($this->contributor);
        $this->postJson("/api/trees/{$this->tree->slug}/people", [
            'first_name' => 'Awa',
            'last_name' => 'Sy',
            'gender' => 'female',
        ])->assertStatus(202);
        $second = EditProposal::where('id', '!=', $first->id)->firstOrFail();

        Sanctum::actingAs($this->owner);
        $this->postJson("/api/proposals/{$second->id}/approve", ['pin' => '0000'])
            ->assertStatus(422);
        $this->postJson("/api/proposals/{$second->id}/approve", ['pin' => '4242'])
            ->assertStatus(200);
    }
}
