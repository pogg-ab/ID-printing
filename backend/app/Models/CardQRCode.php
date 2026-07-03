<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CardQRCode extends Model
{
    use HasUuids;

    protected $table = 'card_qrcodes';

    protected $fillable = [
        'cardholder_id',
        'qr_data',
        'qr_image_url',
    ];

    protected $casts = [
        'qr_data' => 'array',
    ];

    public function cardholder(): BelongsTo
    {
        return $this->belongsTo(Cardholder::class);
    }
}
