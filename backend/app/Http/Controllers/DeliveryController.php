<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\DeliveryItem;
use App\Models\PrintBatch;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeliveryController extends Controller
{
    public function index(Request $request)
    {
        $allowedIds = $this->getAllowedOrganizationIds($request);
        $query = Delivery::with(['organization', 'printBatch'])->whereIn('organization_id', $allowedIds);

        if ($request->filled('organization_id')) {
            $query->where('organization_id', $request->organization_id);
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $allowedIds = $this->getAllowedOrganizationIds($request);

        $request->validate([
            'organization_id' => 'required|exists:organizations,id',
            'print_batch_id' => 'required|exists:print_batches,id',
            'received_by' => 'required|string|max:200',
            'receiver_phone' => 'nullable|string|max:50',
            'remarks' => 'nullable|string',
        ]);

        if (!$allowedIds->contains($request->organization_id)) {
            return response()->json(['message' => 'Unauthorized organization.'], 403);
        }

        $delivery = DB::transaction(function () use ($request) {
            $deliveryNumber = 'DN-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(2)));

            $delivery = Delivery::create([
                'delivery_number' => $deliveryNumber,
                'organization_id' => $request->organization_id,
                'print_batch_id' => $request->print_batch_id,
                'delivery_date' => date('Y-m-d'),
                'received_by' => $request->received_by,
                'receiver_phone' => $request->receiver_phone,
                'remarks' => $request->remarks,
            ]);

            // Mark PrintBatch status as DELIVERED
            $batch = PrintBatch::findOrFail($request->print_batch_id);
            $batch->update(['status' => 'DELIVERED']);

            // Insert Delivery Items for all cards in the batch
            foreach ($batch->printBatchCards as $bc) {
                DeliveryItem::create([
                    'delivery_id' => $delivery->id,
                    'cardholder_id' => $bc->cardholder_id,
                    'delivered' => true,
                ]);
            }

            // Write Audit Log
            AuditLog::create([
                'entity_name' => 'Delivery',
                'entity_id' => $delivery->id,
                'action_type' => 'CREATE',
                'new_value' => $delivery->toArray(),
                'performed_at' => now(),
            ]);

            return $delivery;
        });

        return response()->json($delivery->load(['deliveryItems.cardholder', 'organization', 'printBatch']), 201);
    }

    public function show(Request $request, $id)
    {
        $allowedIds = $this->getAllowedOrganizationIds($request);
        $delivery = Delivery::with(['organization', 'printBatch', 'deliveryItems.cardholder'])
            ->whereIn('organization_id', $allowedIds)
            ->findOrFail($id);
        return response()->json($delivery);
    }
}
