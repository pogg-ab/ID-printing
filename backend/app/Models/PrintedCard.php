<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrintedCard extends Model
{
    use HasUuids;

    protected $fillable = [
        'cardholder_id',
        'print_batch_id',
        'print_count',
        'printed_by',
        'printed_at',
    ];

    public function cardholder(): BelongsTo
    {
        return $this->belongsTo(Cardholder::class);
    }

    public function printBatch(): BelongsTo
    {
        return $this->belongsTo(PrintBatch::class);
    }
}
