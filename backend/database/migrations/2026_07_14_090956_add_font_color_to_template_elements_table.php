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
        Schema::table('template_elements', function (Blueprint $table) {
            $table->string('font_color', 50)->nullable()->after('font_weight');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('template_elements', function (Blueprint $table) {
            $table->dropColumn('font_color');
        });
    }
};
