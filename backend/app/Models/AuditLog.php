<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasUuids;

    protected $fillable = [
        'entity_name',
        'entity_id',
        'action_type',
        'old_value',
        'new_value',
        'performed_by',
        'performed_at',
    ];

    protected $casts = [
        'old_value' => 'array',
        'new_value' => 'array',
        'performed_at' => 'datetime',
    ];
}
