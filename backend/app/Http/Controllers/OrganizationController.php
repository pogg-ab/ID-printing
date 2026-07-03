<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\CardType;
use Illuminate\Http\Request;

class OrganizationController extends Controller
{
    public function index()
    {
        return response()->json(Organization::withCount(['cardTypes', 'cardholders'])->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:organizations,code',
            'name' => 'required|string|max:200',
            'address' => 'nullable|string',
            'contact_person' => 'nullable|string|max:200',
            'phone_number' => 'nullable|string|max:50',
            'email_address' => 'nullable|email|max:200',
            'logo_url' => 'nullable|string',
        ]);

        $org = Organization::create($validated);
        return response()->json($org, 201);
    }

    public function show($id)
    {
        $org = Organization::with(['cardTypes'])->findOrFail($id);
        return response()->json($org);
    }

    public function update(Request $request, $id)
    {
        $org = Organization::findOrFail($id);

        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:organizations,code,' . $org->id,
            'name' => 'required|string|max:200',
            'address' => 'nullable|string',
            'contact_person' => 'nullable|string|max:200',
            'phone_number' => 'nullable|string|max:50',
            'email_address' => 'nullable|email|max:200',
            'logo_url' => 'nullable|string',
            'status' => 'required|string|max:20',
        ]);

        $org->update($validated);
        return response()->json($org);
    }

    public function destroy($id)
    {
        $org = Organization::findOrFail($id);
        $org->delete();
        return response()->json(['message' => 'Organization deleted successfully']);
    }

    // Card Type routes associated with Organization
    public function listCardTypes($orgId)
    {
        $org = Organization::findOrFail($orgId);
        return response()->json($org->cardTypes);
    }

    public function storeCardType(Request $request, $orgId)
    {
        $org = Organization::findOrFail($orgId);

        $validated = $request->validate([
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:200',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $cardType = $org->cardTypes()->create($validated);
        return response()->json($cardType, 201);
    }

    public function updateCardType(Request $request, $id)
    {
        $cardType = CardType::findOrFail($id);

        $validated = $request->validate([
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:200',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $cardType->update($validated);
        return response()->json($cardType);
    }

    public function destroyCardType($id)
    {
        $cardType = CardType::findOrFail($id);
        $cardType->delete();
        return response()->json(['message' => 'Card Type deleted successfully']);
    }

    // Logo Management (Upload)
    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        if ($request->file('logo')) {
            $path = $request->file('logo')->store('uploads/logos', 'public');
            return response()->json([
                'url' => '/storage/' . $path
            ]);
        }

        return response()->json(['error' => 'Upload failed'], 400);
    }
}
