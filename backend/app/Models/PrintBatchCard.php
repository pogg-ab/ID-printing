<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrintBatchCard extends Model
{
    use HasUuids;

    protected $fillable = [
        'print_batch_id',
        'cardholder_id',
        'print_status',
        'printed_at',
    ];

    public function printBatch(): BelongsTo
    {
        return $this->belongsTo(PrintBatch::class);
    }

    public function cardholder(): BelongsTo
    {
        return $this->belongsTo(Cardholder::class);
    }
}
