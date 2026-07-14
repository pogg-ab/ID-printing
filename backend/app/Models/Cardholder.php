<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Cardholder extends Model
{
    use HasUuids;

    protected $fillable = [
        'organization_id',
        'card_type_id',
        'card_template_id',
        'card_number',
        'full_name',
        'full_name_amharic',
        'date_of_birth',
        'gender',
        'nationality',
        'occupation',
        'address',
        'woreda',
        'kebele',
        'phone_number',
        'emergency_contact_name',
        'emergency_contact_phone',
        'blood_group',
        'photo_url',
        'secondary_photo_url',
        'signature_image_url',
        'date_issued',
        'expiry_date',
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

    public function cardTemplate(): BelongsTo
    {
        return $this->belongsTo(CardTemplate::class);
    }

    public function attributes(): HasMany
    {
        return $this->hasMany(CardholderAttribute::class);
    }

    public function qrCode(): HasOne
    {
        return $this->hasOne(CardQRCode::class);
    }

    public function barcode(): HasOne
    {
        return $this->hasOne(CardBarcode::class);
    }

    public function printBatchCards(): HasMany
    {
        return $this->hasMany(PrintBatchCard::class);
    }

    public function printedCards(): HasMany
    {
        return $this->hasMany(PrintedCard::class);
    }

    public function reprintRequests(): HasMany
    {
        return $this->hasMany(ReprintRequest::class);
    }

    public function deliveryItems(): HasMany
    {
        return $this->hasMany(DeliveryItem::class);
    }
}
