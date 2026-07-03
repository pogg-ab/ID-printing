<?php

namespace App\Http\Controllers;

use App\Models\PrintBatch;
use App\Models\PrintBatchCard;
use App\Models\PrintedCard;
use App\Models\Cardholder;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PrintBatchController extends Controller
{
    public function index(Request $request)
    {
        $query = PrintBatch::with(['organization', 'cardTemplate']);

        if ($request->filled('organization_id')) {
            $query->where('organization_id', $request->organization_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'organization_id' => 'required|exists:organizations,id',
            'card_template_id' => 'required|exists:card_templates,id',
            'cardholder_ids' => 'required|array',
            'cardholder_ids.*' => 'required|exists:cardholders,id',
        ]);

        $batch = DB::transaction(function () use ($request) {
            $batchNumber = 'PB-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(2)));

            $batch = PrintBatch::create([
                'batch_number' => $batchNumber,
                'organization_id' => $request->organization_id,
                'card_template_id' => $request->card_template_id,
                'total_cards' => count($request->cardholder_ids),
                'status' => 'DRAFT',
            ]);

            foreach ($request->cardholder_ids as $chId) {
                PrintBatchCard::create([
                    'print_batch_id' => $batch->id,
                    'cardholder_id' => $chId,
                    'print_status' => 'PENDING',
                ]);
            }

            // Write Audit Log
            AuditLog::create([
                'entity_name' => 'PrintBatch',
                'entity_id' => $batch->id,
                'action_type' => 'CREATE',
                'new_value' => $batch->toArray(),
                'performed_at' => now(),
            ]);

            return $batch;
        });

        return response()->json($batch->load(['printBatchCards.cardholder']), 201);
    }

    public function show($id)
    {
        $batch = PrintBatch::with(['organization', 'cardTemplate', 'printBatchCards.cardholder.attributes', 'printBatchCards.cardholder.qrCode', 'printBatchCards.cardholder.barcode'])->findOrFail($id);
        return response()->json($batch);
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|string|in:DRAFT,APPROVED,PRINTED,DELIVERED',
        ]);

        $batch = PrintBatch::findOrFail($id);
        $oldValue = $batch->toArray();

        DB::transaction(function () use ($batch, $request, $oldValue) {
            $batch->update(['status' => $request->status]);

            // If status is changed to PRINTED, we record printed cards register & update batch cards print_status
            if ($request->status === 'PRINTED') {
                $batchCards = PrintBatchCard::where('print_batch_id', $batch->id)->get();
                foreach ($batchCards as $bc) {
                    $bc->update([
                        'print_status' => 'SUCCESS',
                        'printed_at' => now(),
                    ]);

                    // Update or insert in PrintedCard register
                    $printed = PrintedCard::where('cardholder_id', $bc->cardholder_id)
                        ->where('print_batch_id', $batch->id)
                        ->first();

                    if ($printed) {
                        $printed->increment('print_count');
                    } else {
                        PrintedCard::create([
                            'cardholder_id' => $bc->cardholder_id,
                            'print_batch_id' => $batch->id,
                            'print_count' => 1,
                            'printed_at' => now(),
                        ]);
                    }
                }
            }

            // Write Audit Log
            AuditLog::create([
                'entity_name' => 'PrintBatch',
                'entity_id' => $batch->id,
                'action_type' => 'STATUS_CHANGE',
                'old_value' => $oldValue,
                'new_value' => $batch->toArray(),
                'performed_at' => now(),
            ]);
        });

        return response()->json($batch->load(['printBatchCards.cardholder']));
    }

    public function destroy($id)
    {
        $batch = PrintBatch::findOrFail($id);
        
        DB::transaction(function () use ($batch) {
            // Write Audit Log
            AuditLog::create([
                'entity_name' => 'PrintBatch',
                'entity_id' => $batch->id,
                'action_type' => 'DELETE',
                'old_value' => $batch->toArray(),
                'performed_at' => now(),
            ]);

            $batch->delete();
        });

        return response()->json(['message' => 'Print batch deleted successfully']);
    }
}
