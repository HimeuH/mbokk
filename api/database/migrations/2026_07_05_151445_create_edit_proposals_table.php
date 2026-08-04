<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('edit_proposals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('family_tree_id')->constrained()->cascadeOnDelete();
            $table->foreignId('proposer_user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('target_type', ['person', 'relationship']);
            // Null target_id = proposing a brand new person/relationship, not an edit.
            $table->unsignedBigInteger('target_id')->nullable();
            $table->json('payload');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users');
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['family_tree_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('edit_proposals');
    }
};
