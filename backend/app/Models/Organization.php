<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    use HasUuids;

    protected $fillable = [
        'code',
        'name',
        'address',
        'contact_person',
        'phone_number',
        'email_address',
        'logo_url',
        'status',
        'created_by',
    ];

    public function cardTypes(): HasMany
    {
        return $this->hasMany(CardType::class);
    }

    public function cardTemplates(): HasMany
    {
        return $this->hasMany(CardTemplate::class);
    }

    public function cardholders(): HasMany
    {
        return $this->hasMany(Cardholder::class);
    }

    public function printBatches(): HasMany
    {
        return $this->hasMany(PrintBatch::class);
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(Delivery::class);
    }
}
