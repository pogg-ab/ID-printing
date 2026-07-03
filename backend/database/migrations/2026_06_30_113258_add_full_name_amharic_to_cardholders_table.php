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
        Schema::table('cardholders', function (Blueprint $table) {
            $table->string('full_name_amharic', 300)->nullable()->after('full_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cardholders', function (Blueprint $table) {
            $table->dropColumn('full_name_amharic');
        });
    }
};
