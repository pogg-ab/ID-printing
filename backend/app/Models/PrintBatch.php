<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PrintBatch extends Model
{
    use HasUuids;

    protected $fillable = [
        'batch_number',
        'organization_id',
        'card_template_id',
        'total_cards',
        'status',
        'created_by',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function cardTemplate(): BelongsTo
    {
        return $this->belongsTo(CardTemplate::class);
    }

    public function printBatchCards(): HasMany
    {
        return $this->hasMany(PrintBatchCard::class);
    }

    public function printedCards(): HasMany
    {
        return $this->hasMany(PrintedCard::class);
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(Delivery::class);
    }
}
