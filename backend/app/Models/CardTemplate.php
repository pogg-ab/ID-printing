<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CardTemplate extends Model
{
    use HasUuids;

    protected $fillable = [
        'organization_id',
        'card_type_id',
        'name',
        'front_background_image',
        'back_background_image',
        'width',
        'height',
        'is_default',
        'status',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function cardType(): BelongsTo
    {
        return $this->belongsTo(CardType::class);
    }

    public function elements(): HasMany
    {
        return $this->hasMany(TemplateElement::class);
    }
}
