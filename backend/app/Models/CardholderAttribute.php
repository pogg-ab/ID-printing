<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CardholderAttribute extends Model
{
    use HasUuids;

    protected $fillable = [
        'cardholder_id',
        'attribute_name',
        'attribute_value',
    ];

    public function cardholder(): BelongsTo
    {
        return $this->belongsTo(Cardholder::class);
    }
}
