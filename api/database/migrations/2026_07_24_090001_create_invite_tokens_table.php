<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invite_tokens', function (Blueprint $table) {
            $table->id();
            $table->string('token', 64)->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('family_tree_id')->constrained()->cascadeOnDelete();
            // Denormalized so InviteController can show "Registre X, en tant
            // que Y" without a join once the token's been consumed and the
            // tree_members row it mirrors could theoretically have changed.
            $table->enum('role', ['admin', 'contributor']);
            $table->foreignId('invited_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invite_tokens');
    }
};
