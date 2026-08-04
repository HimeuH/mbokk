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
        Schema::create('relationships', function (Blueprint $table) {
            $table->id();
            // person_id/related_person_id intentionally have no FK constraint tied to a
            // single tree — relationships routinely cross family_trees (docs/mvp-plan.md).
            $table->foreignId('person_id')->constrained('people')->cascadeOnDelete();
            $table->foreignId('related_person_id')->constrained('people')->cascadeOnDelete();
            $table->enum('type', ['parent_of', 'spouse_of']);
            $table->date('marriage_date')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->timestamps();

            $table->unique(['person_id', 'related_person_id', 'type']);
            $table->index('related_person_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('relationships');
    }
};
