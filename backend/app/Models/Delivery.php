<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Delivery extends Model
{
    use HasUuids;

    protected $fillable = [
        'delivery_number',
        'organization_id',
        'print_batch_id',
        'delivery_date',
        'received_by',
        'receiver_phone',
        'remarks',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function printBatch(): BelongsTo
    {
        return $this->belongsTo(PrintBatch::class);
    }

    public function deliveryItems(): HasMany
    {
        return $this->hasMany(DeliveryItem::class);
    }
}
