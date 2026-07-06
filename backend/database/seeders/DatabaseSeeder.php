<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Organization;
use App\Models\CardType;
use App\Models\CardTemplate;
use App\Models\TemplateElement;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Seed Super Admin User
        User::factory()->create([
            'name'     => 'System Admin',
            'email'    => 'superadmin@gmail.com',
            'password' => bcrypt('password!'),
            'role'     => 'super_admin',
        ]);


        // 2. Seed Organization
        $org = Organization::create([
            'code' => 'DIR-DAWA',
            'name' => 'Dire Dawa Administration',
            'address' => 'Dire Dawa, Ethiopia',
            'contact_person' => 'Mohammed Oumer',
            'phone_number' => '+251251111111',
            'email_address' => 'contact@diredawa.gov.et',
            'logo_url' => '/assets/diredawa_logo.png',
            'status' => 'ACTIVE',
        ]);

        // 3. Seed Card Type
        $cardType = CardType::create([
            'organization_id' => $org->id,
            'code' => 'RES-ID',
            'name' => 'Resident ID',
            'description' => 'Dire Dawa Administration Residential ID Card',
            'is_active' => true,
        ]);

        // 4. Seed Card Template
        $template = CardTemplate::create([
            'organization_id' => $org->id,
            'card_type_id' => $cardType->id,
            'name' => 'Standard Resident ID Template',
            'front_background_image' => '/assets/id_front_bg.png',
            'back_background_image' => '/assets/id_back_bg.png',
            'width' => 86.40,  // Custom Width in mm
            'height' => 53.30, // Custom Height in mm
            'is_default' => true,
            'status' => 'ACTIVE',
        ]);

        // 5. Seed FRONT template elements
        $frontElements = [
            // Left Column (Emblem / Photo / Barcode)
            [
                'element_type' => 'LOGO',
                'field_name' => 'org_logo',
                'side' => 'FRONT',
                'x_position' => 4.00,
                'y_position' => 4.00,
                'width' => 10.00,
                'height' => 10.00,
                'font_family' => 'Arial',
                'font_size' => null,
                'font_weight' => null,
                'is_visible' => true,
            ],
            [
                'element_type' => 'PHOTO',
                'field_name' => 'photo_url',
                'side' => 'FRONT',
                'x_position' => 4.00,
                'y_position' => 16.00,
                'width' => 24.00,
                'height' => 28.00,
                'font_family' => 'Arial',
                'font_size' => null,
                'font_weight' => null,
                'is_visible' => true,
            ],
            [
                'element_type' => 'BARCODE',
                'field_name' => 'card_number',
                'side' => 'FRONT',
                'x_position' => 4.00,
                'y_position' => 45.00,
                'width' => 24.00,
                'height' => 6.00,
                'font_family' => 'Arial',
                'font_size' => null,
                'font_weight' => null,
                'is_visible' => true,
            ],
            // Top Right Flag
            [
                'element_type' => 'IMAGE',
                'field_name' => 'national_flag',
                'side' => 'FRONT',
                'x_position' => 70.00,
                'y_position' => 4.00,
                'width' => 11.00,
                'height' => 5.50,
                'font_family' => 'Arial',
                'font_size' => null,
                'font_weight' => null,
                'is_visible' => true,
            ],
            // Headers
            [
                'element_type' => 'TEXT',
                'field_name' => 'header_amharic',
                'side' => 'FRONT',
                'x_position' => 16.00,
                'y_position' => 4.00,
                'width' => 52.00,
                'height' => 4.00,
                'font_family' => 'Inter',
                'font_size' => 6,
                'font_weight' => 'bold',
                'is_visible' => true,
            ],
            [
                'element_type' => 'TEXT',
                'field_name' => 'header_english',
                'side' => 'FRONT',
                'x_position' => 16.00,
                'y_position' => 7.50,
                'width' => 52.00,
                'height' => 4.00,
                'font_family' => 'Inter',
                'font_size' => 5,
                'font_weight' => 'bold',
                'is_visible' => true,
            ],
            // Data fields
            [
                'element_type' => 'TEXT',
                'field_name' => 'full_name',
                'side' => 'FRONT',
                'x_position' => 30.00,
                'y_position' => 15.00,
                'width' => 40.00,
                'height' => 8.00,
                'font_family' => 'Inter',
                'font_size' => 8,
                'font_weight' => 'bold',
                'is_visible' => true,
            ],
            [
                'element_type' => 'TEXT',
                'field_name' => 'date_of_birth',
                'side' => 'FRONT',
                'x_position' => 30.00,
                'y_position' => 23.00,
                'width' => 40.00,
                'height' => 8.00,
                'font_family' => 'Inter',
                'font_size' => 7,
                'font_weight' => 'normal',
                'is_visible' => true,
            ],
            [
                'element_type' => 'TEXT',
                'field_name' => 'gender',
                'side' => 'FRONT',
                'x_position' => 30.00,
                'y_position' => 31.00,
                'width' => 15.00,
                'height' => 8.00,
                'font_family' => 'Inter',
                'font_size' => 7,
                'font_weight' => 'normal',
                'is_visible' => true,
            ],
            [
                'element_type' => 'TEXT',
                'field_name' => 'nationality',
                'side' => 'FRONT',
                'x_position' => 46.00,
                'y_position' => 31.00,
                'width' => 20.00,
                'height' => 8.00,
                'font_family' => 'Inter',
                'font_size' => 7,
                'font_weight' => 'normal',
                'is_visible' => true,
            ],
            [
                'element_type' => 'TEXT',
                'field_name' => 'occupation',
                'side' => 'FRONT',
                'x_position' => 30.00,
                'y_position' => 39.00,
                'width' => 30.00,
                'height' => 8.00,
                'font_family' => 'Inter',
                'font_size' => 7,
                'font_weight' => 'normal',
                'is_visible' => true,
            ],
            [
                'element_type' => 'TEXT',
                'field_name' => 'address',
                'side' => 'FRONT',
                'x_position' => 30.00,
                'y_position' => 47.00,
                'width' => 20.00,
                'height' => 6.00,
                'font_family' => 'Inter',
                'font_size' => 6,
                'font_weight' => 'normal',
                'is_visible' => true,
            ],
            [
                'element_type' => 'TEXT',
                'field_name' => 'woreda',
                'side' => 'FRONT',
                'x_position' => 52.00,
                'y_position' => 47.00,
                'width' => 15.00,
                'height' => 6.00,
                'font_family' => 'Inter',
                'font_size' => 6,
                'font_weight' => 'normal',
                'is_visible' => true,
            ],
            [
                'element_type' => 'TEXT',
                'field_name' => 'kebele',
                'side' => 'FRONT',
                'x_position' => 68.00,
                'y_position' => 47.00,
                'width' => 15.00,
                'height' => 6.00,
                'font_family' => 'Inter',
                'font_size' => 6,
                'font_weight' => 'normal',
                'is_visible' => true,
            ],
        ];

        // 6. Seed BACK template elements
        $backElements = [
            [
                'element_type' => 'TEXT',
                'field_name' => 'disclaimer',
                'side' => 'BACK',
                'x_position' => 4.00,
                'y_position' => 4.00,
                'width' => 60.00,
                'height' => 8.00,
                'font_family' => 'Inter',
                'font_size' => 5,
                'font_weight' => 'normal',
                'is_visible' => true,
            ],
            [
                'element_type' => 'TEXT',
                'field_name' => 'phone_number',
                'side' => 'BACK',
                'x_position' => 4.00,
                'y_position' => 13.00,
                'width' => 30.00,
                'height' => 8.00,
                'font_family' => 'Inter',
                'font_size' => 6,
                'font_weight' => 'bold',
                'is_visible' => true,
            ],
            [
                'element_type' => 'TEXT',
                'field_name' => 'emergency_contact_name',
                'side' => 'BACK',
                'x_position' => 4.00,
                'y_position' => 22.00,
                'width' => 30.00,
                'height' => 8.00,
                'font_family' => 'Inter',
                'font_size' => 6,
                'font_weight' => 'bold',
                'is_visible' => true,
            ],
            [
                'element_type' => 'TEXT',
                'field_name' => 'emergency_contact_phone',
                'side' => 'BACK',
                'x_position' => 4.00,
                'y_position' => 31.00,
                'width' => 30.00,
                'height' => 8.00,
                'font_family' => 'Inter',
                'font_size' => 6,
                'font_weight' => 'bold',
                'is_visible' => true,
            ],
            [
                'element_type' => 'TEXT',
                'field_name' => 'blood_group',
                'side' => 'BACK',
                'x_position' => 4.00,
                'y_position' => 40.00,
                'width' => 20.00,
                'height' => 8.00,
                'font_family' => 'Inter',
                'font_size' => 6,
                'font_weight' => 'bold',
                'is_visible' => true,
            ],
            // QR Code (Right Side)
            [
                'element_type' => 'QR',
                'field_name' => 'qr_code',
                'side' => 'BACK',
                'x_position' => 54.00,
                'y_position' => 13.00,
                'width' => 25.00,
                'height' => 25.00,
                'font_family' => 'Arial',
                'font_size' => null,
                'font_weight' => null,
                'is_visible' => true,
            ],
            // Authority Sign Off (Bottom Center)
            [
                'element_type' => 'SIGNATURE',
                'field_name' => 'signature_image_url',
                'side' => 'BACK',
                'x_position' => 35.00,
                'y_position' => 36.00,
                'width' => 18.00,
                'height' => 12.00,
                'font_family' => 'Arial',
                'font_size' => null,
                'font_weight' => null,
                'is_visible' => true,
            ],
            [
                'element_type' => 'TEXT',
                'field_name' => 'sign_authority_text',
                'side' => 'BACK',
                'x_position' => 35.00,
                'y_position' => 48.00,
                'width' => 18.00,
                'height' => 4.00,
                'font_family' => 'Inter',
                'font_size' => 5,
                'font_weight' => 'bold',
                'is_visible' => true,
            ],
            // Dates (Right Side Top)
            [
                'element_type' => 'TEXT',
                'field_name' => 'date_issued',
                'side' => 'BACK',
                'x_position' => 54.00,
                'y_position' => 4.00,
                'width' => 25.00,
                'height' => 4.00,
                'font_family' => 'Inter',
                'font_size' => 5,
                'font_weight' => 'normal',
                'is_visible' => true,
            ],
            [
                'element_type' => 'TEXT',
                'field_name' => 'expiry_date',
                'side' => 'BACK',
                'x_position' => 54.00,
                'y_position' => 8.50,
                'width' => 25.00,
                'height' => 4.00,
                'font_family' => 'Inter',
                'font_size' => 5,
                'font_weight' => 'normal',
                'is_visible' => true,
            ],
        ];

        // Save front elements
        foreach ($frontElements as $elem) {
            $elem['card_template_id'] = $template->id;
            TemplateElement::create($elem);
        }

        // Save back elements
        foreach ($backElements as $elem) {
            $elem['card_template_id'] = $template->id;
            TemplateElement::create($elem);
        }
    }
}
