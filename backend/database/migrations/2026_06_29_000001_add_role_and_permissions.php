<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add role column to users table
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 20)->default('staff')->after('email'); // super_admin | staff
        });

        // Create user_permissions table (page-level access control)
        Schema::create('user_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('page_key', 50); // dashboard, organizations, templates, etc.
            $table->boolean('can_access')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'page_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_permissions');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
};
