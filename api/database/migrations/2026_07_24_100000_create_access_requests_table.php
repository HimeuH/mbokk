<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// The self-serve half of the "no self-recovery" gap (docs/mvp-plan.md Phase 2):
// someone who lost their session and has no saved invite link can ask here
// instead of having to personally track down an admin. Resolving it still
// means an admin re-invites them (TreeMemberController@store) — this table
// only removes the friction of the *ask*, not the admin dependency itself.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('access_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('family_tree_id')->constrained()->cascadeOnDelete();
            $table->string('phone');
            // Free text so the requester can identify themselves beyond a bare
            // phone number — an admin managing a large lineage may not
            // recognize a number on sight.
            $table->text('message')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->foreignId('resolved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['family_tree_id', 'resolved_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('access_requests');
    }
};
