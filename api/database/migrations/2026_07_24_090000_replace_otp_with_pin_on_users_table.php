<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Drops the OTP-era columns (phone verification now happens socially, via
// invite links shared by an existing tree member — see InviteController —
// not by the app sending a code) and adds pin_hash, checked only when an
// owner/admin approves or rejects an edit proposal (EditProposalController).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['otp_code', 'otp_expires_at', 'phone_verified_at']);
            $table->string('pin_hash')->nullable()->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('pin_hash');
            $table->string('otp_code')->nullable();
            $table->timestamp('otp_expires_at')->nullable();
            $table->timestamp('phone_verified_at')->nullable();
        });
    }
};
