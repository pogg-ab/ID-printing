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
        $query = ReprintRequest::with(['cardholder.organization', 'cardholder.cardType']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'cardholder_id' => 'required|exists:cardholders,id',
            'reason' => 'required|string|max:500',
        ]);

        $reprint = DB::transaction(function () use ($request) {
            $reprint = ReprintRequest::create([
                'cardholder_id' => $request->cardholder_id,
                'reason' => $request->reason,
                'status' => 'PENDING',
                'requested_at' => now(),
            ]);

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
        $reprint = ReprintRequest::findOrFail($id);
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
        $reprint = ReprintRequest::findOrFail($id);
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

    public function markPrinted($id)
    {
        $reprint = ReprintRequest::findOrFail($id);
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
