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
        // 1. Organizations
        Schema::create('organizations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name', 200);
            $table->text('address')->nullable();
            $table->string('contact_person', 200)->nullable();
            $table->string('phone_number', 50)->nullable();
            $table->string('email_address', 200)->nullable();
            $table->text('logo_url')->nullable();
            $table->string('status', 20)->default('ACTIVE');
            $table->uuid('created_by')->nullable();
            $table->timestamps();
        });

        // 2. Card Types
        Schema::create('card_types', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->string('code', 50)->nullable();
            $table->string('name', 200)->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 3. Card Templates
        Schema::create('card_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->foreignUuid('card_type_id')->constrained('card_types')->onDelete('cascade');
            $table->string('name', 200)->nullable();
            $table->text('front_background_image')->nullable();
            $table->text('back_background_image')->nullable();
            $table->decimal('width', 10, 2)->nullable();
            $table->decimal('height', 10, 2)->nullable();
            $table->boolean('is_default')->default(false);
            $table->string('status', 20)->default('ACTIVE');
            $table->timestamps();
        });

        // 4. Template Elements
        Schema::create('template_elements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('card_template_id')->constrained('card_templates')->onDelete('cascade');
            $table->string('side', 10); // FRONT/BACK
            $table->string('element_type', 30); // TEXT, IMAGE, PHOTO, QR, BARCODE, SIGNATURE, LOGO
            $table->string('field_name', 100)->nullable();
            $table->decimal('x_position', 10, 2);
            $table->decimal('y_position', 10, 2);
            $table->decimal('width', 10, 2)->nullable();
            $table->decimal('height', 10, 2)->nullable();
            $table->string('font_family', 100)->nullable();
            $table->integer('font_size')->nullable();
            $table->string('font_weight', 20)->nullable();
            $table->boolean('is_visible')->default(true);
            $table->timestamps();
        });

        // 5. Cardholders
        Schema::create('cardholders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->foreignUuid('card_type_id')->constrained('card_types')->onDelete('cascade');
            $table->string('card_number', 100)->unique()->nullable();
            $table->string('full_name', 300)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('gender', 20)->nullable();
            $table->string('nationality', 100)->nullable();
            $table->string('occupation', 200)->nullable();
            $table->text('address')->nullable();
            $table->string('woreda', 100)->nullable();
            $table->string('kebele', 100)->nullable();
            $table->string('phone_number', 50)->nullable();
            $table->string('emergency_contact_name', 200)->nullable();
            $table->string('emergency_contact_phone', 50)->nullable();
            $table->string('blood_group', 20)->nullable();
            $table->text('photo_url')->nullable();
            $table->text('secondary_photo_url')->nullable();
            $table->text('signature_image_url')->nullable();
            $table->date('date_issued')->nullable();
            $table->date('expiry_date')->nullable();
            $table->string('status', 30)->default('ACTIVE');
            $table->timestamps();

            // Indexes
            $table->index('card_number');
            $table->index('organization_id');
        });

        // 6. Cardholder Attributes (Dynamic fields)
        Schema::create('cardholder_attributes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cardholder_id')->constrained('cardholders')->onDelete('cascade');
            $table->string('attribute_name', 100);
            $table->text('attribute_value')->nullable();
            $table->timestamps();
        });

        // 7. Card QR Codes
        Schema::create('card_qrcodes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cardholder_id')->constrained('cardholders')->onDelete('cascade');
            $table->json('qr_data')->nullable();
            $table->text('qr_image_url')->nullable();
            $table->timestamps();
        });

        // 8. Card Barcodes
        Schema::create('card_barcodes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cardholder_id')->constrained('cardholders')->onDelete('cascade');
            $table->string('barcode_value', 200);
            $table->text('barcode_image_url')->nullable();
            $table->timestamps();
        });

        // 9. Print Batches
        Schema::create('print_batches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('batch_number', 100)->unique();
            $table->foreignUuid('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->foreignUuid('card_template_id')->constrained('card_templates')->onDelete('cascade');
            $table->integer('total_cards')->nullable();
            $table->string('status', 30)->default('DRAFT'); // DRAFT, APPROVED, PRINTED, DELIVERED
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('batch_number');
        });

        // 10. Print Batch Cards
        Schema::create('print_batch_cards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('print_batch_id')->constrained('print_batches')->onDelete('cascade');
            $table->foreignUuid('cardholder_id')->constrained('cardholders')->onDelete('cascade');
            $table->string('print_status', 30)->default('PENDING'); // PENDING, SUCCESS, FAILED
            $table->timestamp('printed_at')->nullable();
            $table->timestamps();
        });

        // 11. Printed Card Register
        Schema::create('printed_cards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cardholder_id')->constrained('cardholders')->onDelete('cascade');
            $table->foreignUuid('print_batch_id')->constrained('print_batches')->onDelete('cascade');
            $table->integer('print_count')->default(1);
            $table->uuid('printed_by')->nullable();
            $table->timestamp('printed_at')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('cardholder_id');
        });

        // 12. Reprint Requests
        Schema::create('reprint_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cardholder_id')->constrained('cardholders')->onDelete('cascade');
            $table->string('reason', 500)->nullable();
            $table->uuid('requested_by')->nullable();
            $table->uuid('approved_by')->nullable();
            $table->string('status', 30)->default('PENDING'); // PENDING, APPROVED, REJECTED, PRINTED
            $table->timestamp('requested_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('cardholder_id');
        });

        // 13. Deliveries
        Schema::create('deliveries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('delivery_number', 100)->unique();
            $table->foreignUuid('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->foreignUuid('print_batch_id')->constrained('print_batches')->onDelete('cascade');
            $table->date('delivery_date')->nullable();
            $table->string('received_by', 200)->nullable();
            $table->string('receiver_phone', 50)->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('delivery_number');
        });

        // 14. Delivery Items
        Schema::create('delivery_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('delivery_id')->constrained('deliveries')->onDelete('cascade');
            $table->foreignUuid('cardholder_id')->constrained('cardholders')->onDelete('cascade');
            $table->boolean('delivered')->default(true);
            $table->timestamps();
        });

        // 15. Audit Logs
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('entity_name', 100)->nullable();
            $table->uuid('entity_id')->nullable();
            $table->string('action_type', 50)->nullable();
            $table->json('old_value')->nullable();
            $table->json('new_value')->nullable();
            $table->uuid('performed_by')->nullable();
            $table->timestamp('performed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('delivery_items');
        Schema::dropIfExists('deliveries');
        Schema::dropIfExists('reprint_requests');
        Schema::dropIfExists('printed_cards');
        Schema::dropIfExists('print_batch_cards');
        Schema::dropIfExists('print_batches');
        Schema::dropIfExists('card_barcodes');
        Schema::dropIfExists('card_qrcodes');
        Schema::dropIfExists('cardholder_attributes');
        Schema::dropIfExists('cardholders');
        Schema::dropIfExists('template_elements');
        Schema::dropIfExists('card_templates');
        Schema::dropIfExists('card_types');
        Schema::dropIfExists('organizations');
    }
};
