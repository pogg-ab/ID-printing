<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\TemplateController;
use App\Http\Controllers\CardholderController;
use App\Http\Controllers\PrintBatchController;
use App\Http\Controllers\ReprintRequestController;
use App\Http\Controllers\DeliveryController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\UserController;
use App\Models\User;
use App\Models\UserPermission;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\Request;

// User Login Authentication (Database connected)
Route::post('login', function (Request $request) {
    $request->validate([
        'email'    => 'required|email',
        'password' => 'required',
    ]);

    $user = User::with('permissions')->where('email', $request->email)->first();

    if (!$user || !Hash::check($request->password, $user->password)) {
        return response()->json([
            'message' => 'Invalid email or password.'
        ], 401);
    }

    // Build flat permissions map
    $permMap = [];
    foreach ($user->permissions as $perm) {
        $permMap[$perm->page_key] = (bool) $perm->can_access;
    }

    return response()->json([
        'message'     => 'Login successful',
        'user' => [
            'id'          => $user->id,
            'name'        => $user->name,
            'email'       => $user->email,
            'role'        => $user->role,
            'permissions' => $permMap,
        ]
    ]);
});

// Organization & Card Types
Route::post('organizations/upload-logo', [OrganizationController::class, 'uploadLogo']);
Route::apiResource('organizations', OrganizationController::class);
Route::get('organizations/{id}/card-types', [OrganizationController::class, 'listCardTypes']);
Route::post('organizations/{id}/card-types', [OrganizationController::class, 'storeCardType']);
Route::put('card-types/{id}', [OrganizationController::class, 'updateCardType']);
Route::delete('card-types/{id}', [OrganizationController::class, 'destroyCardType']);

// Templates & Elements
Route::post('templates/upload-background', [TemplateController::class, 'uploadBackground']);
Route::apiResource('templates', TemplateController::class);
Route::post('templates/{id}/elements', [TemplateController::class, 'saveElements']);

// Cardholder Registry & CSV Uploads
Route::post('cardholders/upload-image', [CardholderController::class, 'uploadImage']);
Route::post('cardholders/bulk-import', [CardholderController::class, 'bulkImport']);
Route::get('cardholders/verify/{card_number}', [CardholderController::class, 'verify']);
Route::get('barcode/{cardNumber}', function ($cardNumber) {
    // Fetch a high-resolution, high-DPI barcode with a wider module width for easy camera scanning
    $url = "https://barcode.tec-it.com/barcode.ashx?data=" . urlencode($cardNumber) . "&code=Code128&translate-esc=true&dpi=300&modulewidth=0.6&height=40&imagetype=png";
    $image = @file_get_contents($url);
    if ($image === false) {
        return response('Failed to generate barcode', 500);
    }
    return response($image)->header('Content-Type', 'image/png');
});
Route::apiResource('cardholders', CardholderController::class);

// Print Batches
Route::put('print-batches/{id}/status', [PrintBatchController::class, 'updateStatus']);
Route::apiResource('print-batches', PrintBatchController::class);

// Reprint Requests
Route::put('reprint-requests/{id}/approve', [ReprintRequestController::class, 'approve']);
Route::put('reprint-requests/{id}/reject', [ReprintRequestController::class, 'reject']);
Route::put('reprint-requests/{id}/print', [ReprintRequestController::class, 'markPrinted']);
Route::apiResource('reprint-requests', ReprintRequestController::class);

// Deliveries
Route::apiResource('deliveries', DeliveryController::class);

// Audit logs
Route::get('audit-logs', [AuditLogController::class, 'index']);

// User Management & Permissions (Super Admin only)
Route::get('users', [UserController::class, 'index']);
Route::post('users', [UserController::class, 'store']);
Route::put('users/{id}', [UserController::class, 'update']);
Route::delete('users/{id}', [UserController::class, 'destroy']);
Route::put('users/{id}/permissions', [UserController::class, 'updatePermissions']);
Route::get('users/{id}/organizations', [UserController::class, 'listOrganizations']);
Route::post('users/{id}/organizations', [UserController::class, 'assignOrganization']);
Route::delete('users/{id}/organizations/{orgId}', [UserController::class, 'removeOrganization']);
