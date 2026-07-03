<?php

namespace App\Http\Controllers;

use App\Models\Cardholder;
use App\Models\CardholderAttribute;
use App\Models\CardQRCode;
use App\Models\CardBarcode;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CardholderController extends Controller
{
    public function index(Request $request)
    {
        $query = Cardholder::with(['organization', 'cardType', 'attributes', 'qrCode', 'barcode']);

        if ($request->filled('organization_id')) {
            $query->where('organization_id', $request->organization_id);
        }

        if ($request->filled('card_type_id')) {
            $query->where('card_type_id', $request->card_type_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('card_number', 'like', "%{$search}%")
                  ->orWhere('phone_number', 'like', "%{$search}%");
            });
        }

        return response()->json($query->paginate($request->get('per_page', 15)));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'organization_id' => 'required|exists:organizations,id',
            'card_type_id' => 'required|exists:card_types,id',
            'card_number' => 'nullable|string|max:100|unique:cardholders,card_number',
            'full_name' => 'required|string|max:300',
            'full_name_amharic' => 'nullable|string|max:300',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|string|max:20',
            'nationality' => 'nullable|string|max:100',
            'occupation' => 'nullable|string|max:200',
            'address' => 'nullable|string',
            'woreda' => 'nullable|string|max:100',
            'kebele' => 'nullable|string|max:100',
            'phone_number' => 'nullable|string|max:50',
            'emergency_contact_name' => 'nullable|string|max:200',
            'emergency_contact_phone' => 'nullable|string|max:50',
            'blood_group' => 'nullable|string|max:20',
            'photo_url' => 'nullable|string',
            'secondary_photo_url' => 'nullable|string',
            'signature_image_url' => 'nullable|string',
            'date_issued' => 'nullable|date',
            'expiry_date' => 'nullable|date',
            
            // Dynamic Attributes
            'attributes' => 'nullable|array',
            'attributes.*.name' => 'required|string|max:100',
            'attributes.*.value' => 'nullable|string',
        ]);

        // Duplicate check (Validation Engine & Duplicate Detection)
        if (!empty($validated['date_of_birth'])) {
            $duplicate = Cardholder::where('full_name', $validated['full_name'])
                ->where('date_of_birth', $validated['date_of_birth'])
                ->exists();
            if ($duplicate) {
                return response()->json([
                    'error' => 'Duplicate registration detected. A resident with this name and date of birth is already registered.'
                ], 422);
            }
        }

        $cardholder = DB::transaction(function () use ($validated, $request) {
            // Generate card number if empty
            if (empty($validated['card_number'])) {
                $validated['card_number'] = 'DD-' . strtoupper(Str::random(3)) . '-' . rand(10000, 99999);
            }

            // Set default issue and expiry dates if empty
            if (empty($validated['date_issued'])) {
                $validated['date_issued'] = date('Y-m-d');
            }
            if (empty($validated['expiry_date'])) {
                $validated['expiry_date'] = date('Y-m-d', strtotime('+2 years'));
            }

            $cardholder = Cardholder::create($validated);

            // Save dynamic attributes
            if (!empty($request->attributes)) {
                foreach ($request->attributes as $attr) {
                    $cardholder->attributes()->create([
                        'attribute_name' => $attr['name'],
                        'attribute_value' => $attr['value'],
                    ]);
                }
            }

            // Create QR data details
            $qrData = [
                'id' => $cardholder->id,
                'name' => $cardholder->full_name,
                'card_no' => $cardholder->card_number,
                'gender' => $cardholder->gender,
                'blood' => $cardholder->blood_group,
                'issue' => $cardholder->date_issued,
                'expiry' => $cardholder->expiry_date,
            ];

            CardQRCode::create([
                'cardholder_id' => $cardholder->id,
                'qr_data' => $qrData,
                'qr_image_url' => '/api/qrcode/' . $cardholder->id,
            ]);

            // Create Barcode details
            CardBarcode::create([
                'cardholder_id' => $cardholder->id,
                'barcode_value' => $cardholder->card_number,
                'barcode_image_url' => '/api/barcode/' . $cardholder->card_number,
            ]);

            return $cardholder;
        });

        return response()->json($cardholder->load(['attributes', 'qrCode', 'barcode']), 201);
    }

    public function show($id)
    {
        $cardholder = Cardholder::with(['organization', 'cardType', 'attributes', 'qrCode', 'barcode'])->findOrFail($id);
        return response()->json($cardholder);
    }

    public function update(Request $request, $id)
    {
        $cardholder = Cardholder::findOrFail($id);

        $validated = $request->validate([
            'card_number' => 'required|string|max:100|unique:cardholders,card_number,' . $cardholder->id,
            'full_name' => 'required|string|max:300',
            'full_name_amharic' => 'nullable|string|max:300',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|string|max:20',
            'nationality' => 'nullable|string|max:100',
            'occupation' => 'nullable|string|max:200',
            'address' => 'nullable|string',
            'woreda' => 'nullable|string|max:100',
            'kebele' => 'nullable|string|max:100',
            'phone_number' => 'nullable|string|max:50',
            'emergency_contact_name' => 'nullable|string|max:200',
            'emergency_contact_phone' => 'nullable|string|max:50',
            'blood_group' => 'nullable|string|max:20',
            'photo_url' => 'nullable|string',
            'secondary_photo_url' => 'nullable|string',
            'signature_image_url' => 'nullable|string',
            'date_issued' => 'nullable|date',
            'expiry_date' => 'nullable|date',
            'status' => 'required|string|max:30',
            
            // Dynamic Attributes
            'attributes' => 'nullable|array',
            'attributes.*.name' => 'required|string|max:100',
            'attributes.*.value' => 'nullable|string',
        ]);

        DB::transaction(function () use ($cardholder, $validated, $request) {
            $cardholder->update($validated);

            // Update attributes (sync attributes)
            $cardholder->attributes()->delete();
            if (!empty($request->attributes)) {
                foreach ($request->attributes as $attr) {
                    $cardholder->attributes()->create([
                        'attribute_name' => $attr['name'],
                        'attribute_value' => $attr['value'],
                    ]);
                }
            }

            // Sync QR data
            $qrCode = $cardholder->qrCode;
            if ($qrCode) {
                $qrCode->update([
                    'qr_data' => [
                        'id' => $cardholder->id,
                        'name' => $cardholder->full_name,
                        'card_no' => $cardholder->card_number,
                        'gender' => $cardholder->gender,
                        'blood' => $cardholder->blood_group,
                        'issue' => $cardholder->date_issued,
                        'expiry' => $cardholder->expiry_date,
                    ]
                ]);
            }

            // Sync Barcode data
            $barcode = $cardholder->barcode;
            if ($barcode) {
                $barcode->update([
                    'barcode_value' => $cardholder->card_number,
                ]);
            }
        });

        return response()->json($cardholder->load(['attributes', 'qrCode', 'barcode']));
    }

    public function destroy($id)
    {
        $cardholder = Cardholder::findOrFail($id);
        $cardholder->delete();
        return response()->json(['message' => 'Cardholder deleted successfully']);
    }

    // Media Uploads
    public function uploadImage(Request $request)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
            'type' => 'required|string|in:photo,signature,secondary_photo',
        ]);

        if ($request->file('image')) {
            $path = $request->file('image')->store('uploads/' . $request->type, 'public');
            return response()->json([
                'url' => '/storage/' . $path
            ]);
        }

        return response()->json(['error' => 'Upload failed'], 400);
    }

    // CSV Bulk Import
    public function bulkImport(Request $request)
    {
        $request->validate([
            'organization_id' => 'required|exists:organizations,id',
            'card_type_id' => 'required|exists:card_types,id',
            'csv_file' => 'required|file|mimes:csv,txt|max:4096',
        ]);

        $file = $request->file('csv_file');
        $filePath = $file->getRealPath();
        
        $csvData = [];
        if (($handle = fopen($filePath, 'r')) !== FALSE) {
            $headers = fgetcsv($handle, 1000, ',');
            // Normalize headers (trim and lowercase)
            $headers = array_map(function($h) {
                return strtolower(trim($h));
            }, $headers);

            while (($data = fgetcsv($handle, 1000, ',')) !== FALSE) {
                if (count($headers) === count($data)) {
                    $csvData[] = array_combine($headers, $data);
                }
            }
            fclose($handle);
        }

        $importedCount = 0;
        $errors = [];

        DB::transaction(function () use ($csvData, $request, &$importedCount, &$errors) {
            foreach ($csvData as $index => $row) {
                try {
                    $fullName = $row['full_name'] ?? ($row['name'] ?? null);
                    if (empty($fullName)) {
                        $errors[] = "Row " . ($index + 2) . ": Full Name is missing.";
                        continue;
                    }

                    $dob = !empty($row['date_of_birth']) ? date('Y-m-d', strtotime($row['date_of_birth'])) : null;
                    if ($dob && Cardholder::where('full_name', $fullName)->where('date_of_birth', $dob)->exists()) {
                        $errors[] = "Row " . ($index + 2) . ": Duplicate registration detected. Resident '{$fullName}' with date of birth '{$dob}' is already registered.";
                        continue;
                    }

                    $cardNumber = $row['card_number'] ?? null;
                    if (!empty($cardNumber) && Cardholder::where('card_number', $cardNumber)->exists()) {
                        $errors[] = "Row " . ($index + 2) . ": Card number '{$cardNumber}' already exists.";
                        continue;
                    }

                    if (empty($cardNumber)) {
                        $cardNumber = 'DD-' . strtoupper(Str::random(3)) . '-' . rand(10000, 99999);
                    }

                    $cardholder = Cardholder::create([
                        'organization_id' => $request->organization_id,
                        'card_type_id' => $request->card_type_id,
                        'card_number' => $cardNumber,
                        'full_name' => $fullName,
                        'full_name_amharic' => $row['full_name_amharic'] ?? ($row['name_amharic'] ?? null),
                        'date_of_birth' => !empty($row['date_of_birth']) ? date('Y-m-d', strtotime($row['date_of_birth'])) : null,
                        'gender' => $row['gender'] ?? 'Male',
                        'nationality' => $row['nationality'] ?? 'Ethiopian',
                        'occupation' => $row['occupation'] ?? null,
                        'address' => $row['address'] ?? null,
                        'woreda' => $row['woreda'] ?? null,
                        'kebele' => $row['kebele'] ?? null,
                        'phone_number' => $row['phone_number'] ?? null,
                        'emergency_contact_name' => $row['emergency_contact_name'] ?? null,
                        'emergency_contact_phone' => $row['emergency_contact_phone'] ?? null,
                        'blood_group' => $row['blood_group'] ?? 'O+',
                        'photo_url' => $row['photo_url'] ?? null,
                        'secondary_photo_url' => $row['secondary_photo_url'] ?? null,
                        'signature_image_url' => $row['signature_image_url'] ?? null,
                        'date_issued' => !empty($row['date_issued']) ? date('Y-m-d', strtotime($row['date_issued'])) : date('Y-m-d'),
                        'expiry_date' => !empty($row['expiry_date']) ? date('Y-m-d', strtotime($row['expiry_date'])) : date('Y-m-d', strtotime('+2 years')),
                        'status' => 'ACTIVE',
                    ]);

                    // Add attributes if present (any column not standard will be saved as attribute)
                    $standardColumns = [
                        'full_name', 'name', 'full_name_amharic', 'name_amharic', 'card_number', 'date_of_birth', 'gender', 'nationality',
                        'occupation', 'address', 'woreda', 'kebele', 'phone_number',
                        'emergency_contact_name', 'emergency_contact_phone', 'blood_group',
                        'photo_url', 'secondary_photo_url', 'signature_image_url', 'date_issued', 'expiry_date'
                    ];

                    foreach ($row as $key => $value) {
                        if (!in_array($key, $standardColumns) && !empty($value)) {
                            $cardholder->attributes()->create([
                                'attribute_name' => Str::title(str_replace('_', ' ', $key)),
                                'attribute_value' => $value,
                            ]);
                        }
                    }

                    // Setup QR code and barcode models
                    $qrData = [
                        'id' => $cardholder->id,
                        'name' => $cardholder->full_name,
                        'card_no' => $cardholder->card_number,
                        'gender' => $cardholder->gender,
                        'blood' => $cardholder->blood_group,
                        'issue' => $cardholder->date_issued,
                        'expiry' => $cardholder->expiry_date,
                    ];

                    CardQRCode::create([
                        'cardholder_id' => $cardholder->id,
                        'qr_data' => $qrData,
                        'qr_image_url' => '/api/qrcode/' . $cardholder->id,
                    ]);

                    CardBarcode::create([
                        'cardholder_id' => $cardholder->id,
                        'barcode_value' => $cardholder->card_number,
                        'barcode_image_url' => '/api/barcode/' . $cardholder->card_number,
                    ]);

                    $importedCount++;
                } catch (\Exception $e) {
                    $errors[] = "Row " . ($index + 2) . ": Unexpected error: " . $e->getMessage();
                }
            }
        });

        return response()->json([
            'message' => "Successfully imported {$importedCount} cardholders.",
            'errors' => $errors
        ]);
    }

    // Validation APIs: Verify Cardholder status by Card Number
    public function verify($cardNumber)
    {
        $cardholder = Cardholder::with(['organization', 'cardType', 'attributes'])
            ->where('card_number', $cardNumber)
            ->first();

        if (!$cardholder) {
            return response()->json([
                'valid' => false,
                'message' => 'Identity card record not found.'
            ], 404);
        }

        $isExpired = false;
        if ($cardholder->expiry_date && strtotime($cardholder->expiry_date) < time()) {
            $isExpired = true;
        }

        return response()->json([
            'valid' => $cardholder->status === 'ACTIVE' && !$isExpired,
            'message' => $cardholder->status === 'ACTIVE' 
                ? ($isExpired ? 'Identity card has expired.' : 'Identity card is valid and active.')
                : 'Identity card status is inactive.',
            'cardholder' => $cardholder
        ]);
    }
}
