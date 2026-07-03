<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReprintRequest extends Model
{
    use HasUuids;

    protected $fillable = [
        'cardholder_id',
        'reason',
        'requested_by',
        'approved_by',
        'status',
        'requested_at',
        'approved_at',
    ];

    public function cardholder(): BelongsTo
    {
        return $this->belongsTo(Cardholder::class);
    }
}
