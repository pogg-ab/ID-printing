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
            $table->foreignUuid('card_template_id')->nullable()->constrained('card_templates')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cardholders', function (Blueprint $table) {
            $table->dropForeign(['card_template_id']);
            $table->dropColumn('card_template_id');
        });
    }
};
