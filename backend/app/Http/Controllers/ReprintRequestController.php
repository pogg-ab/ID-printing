<?php

namespace App\Http\Controllers;

use App\Models\ReprintRequest;
use App\Models\Cardholder;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReprintRequestController extends Controller
{
    public function index(Request $request)
    {
        $allowedIds = $this->getAllowedOrganizationIds($request);
        $query = ReprintRequest::with(['cardholder.organization', 'cardholder.cardType'])
            ->whereHas('cardholder', function ($q) use ($allowedIds) {
                $q->whereIn('organization_id', $allowedIds);
            });

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $allowedIds = $this->getAllowedOrganizationIds($request);

        $request->validate([
            'cardholder_id' => 'required|exists:cardholders,id',
            'reason' => 'required|string|max:500',
            'date_issued' => 'nullable|date',
            'expiry_date' => 'nullable|date',
        ]);

        $cardholder = Cardholder::findOrFail($request->cardholder_id);
        if (!$allowedIds->contains($cardholder->organization_id)) {
            return response()->json(['message' => 'Unauthorized organization.'], 403);
        }

        $reprint = DB::transaction(function () use ($request, $cardholder) {
            $reprint = ReprintRequest::create([
                'cardholder_id' => $request->cardholder_id,
                'reason' => $request->reason,
                'status' => 'PENDING',
                'requested_at' => now(),
            ]);
            if ($request->filled('date_issued')) {
                $cardholder->date_issued = $request->date_issued;
            }
            if ($request->filled('expiry_date')) {
                $cardholder->expiry_date = $request->expiry_date;
            }
            $cardholder->save();

            // Re-sync QR code for the cardholder
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
                    ],
                ]);
            }

            // Audit Log
            AuditLog::create([
                'entity_name' => 'ReprintRequest',
                'entity_id' => $reprint->id,
                'action_type' => 'CREATE',
                'new_value' => $reprint->toArray(),
                'performed_at' => now(),
            ]);

            return $reprint;
        });

        return response()->json($reprint->load('cardholder'), 201);
    }

    public function approve(Request $request, $id)
    {
        $allowedIds = $this->getAllowedOrganizationIds($request);
        $reprint = ReprintRequest::whereHas('cardholder', function ($q) use ($allowedIds) {
            $q->whereIn('organization_id', $allowedIds);
        })->findOrFail($id);
        $oldValue = $reprint->toArray();

        DB::transaction(function () use ($reprint, $oldValue) {
            $reprint->update([
                'status' => 'APPROVED',
                'approved_at' => now(),
                // 'approved_by' => auth()->id(), // optional auth tracking
            ]);

            // Audit Log
            AuditLog::create([
                'entity_name' => 'ReprintRequest',
                'entity_id' => $reprint->id,
                'action_type' => 'APPROVE',
                'old_value' => $oldValue,
                'new_value' => $reprint->toArray(),
                'performed_at' => now(),
            ]);
        });

        return response()->json($reprint);
    }

    public function reject(Request $request, $id)
    {
        $allowedIds = $this->getAllowedOrganizationIds($request);
        $reprint = ReprintRequest::whereHas('cardholder', function ($q) use ($allowedIds) {
            $q->whereIn('organization_id', $allowedIds);
        })->findOrFail($id);
        $oldValue = $reprint->toArray();

        DB::transaction(function () use ($reprint, $oldValue) {
            $reprint->update([
                'status' => 'REJECTED',
            ]);

            // Audit Log
            AuditLog::create([
                'entity_name' => 'ReprintRequest',
                'entity_id' => $reprint->id,
                'action_type' => 'REJECT',
                'old_value' => $oldValue,
                'new_value' => $reprint->toArray(),
                'performed_at' => now(),
            ]);
        });

        return response()->json($reprint);
    }

    public function markPrinted(Request $request, $id)
    {
        $allowedIds = $this->getAllowedOrganizationIds($request);
        $reprint = ReprintRequest::whereHas('cardholder', function ($q) use ($allowedIds) {
            $q->whereIn('organization_id', $allowedIds);
        })->findOrFail($id);
        $oldValue = $reprint->toArray();

        DB::transaction(function () use ($reprint, $oldValue) {
            $reprint->update([
                'status' => 'PRINTED',
            ]);

            // Audit Log
            AuditLog::create([
                'entity_name' => 'ReprintRequest',
                'entity_id' => $reprint->id,
                'action_type' => 'MARK_PRINTED',
                'old_value' => $oldValue,
                'new_value' => $reprint->toArray(),
                'performed_at' => now(),
            ]);
        });

        return response()->json($reprint);
    }
}
