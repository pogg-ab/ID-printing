<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'delivery_id',
        'cardholder_id',
        'delivered',
    ];

    public function delivery(): BelongsTo
    {
        return $this->belongsTo(Delivery::class);
    }

    public function cardholder(): BelongsTo
    {
        return $this->belongsTo(Cardholder::class);
    }
}
