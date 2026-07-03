<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CardBarcode extends Model
{
    use HasUuids;

    protected $fillable = [
        'cardholder_id',
        'barcode_value',
        'barcode_image_url',
    ];

    public function cardholder(): BelongsTo
    {
        return $this->belongsTo(Cardholder::class);
    }
}
