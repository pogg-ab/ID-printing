<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TemplateElement extends Model
{
    use HasUuids;

    protected $fillable = [
        'card_template_id',
        'side',
        'element_type',
        'field_name',
        'x_position',
        'y_position',
        'width',
        'height',
        'font_family',
        'font_size',
        'font_weight',
        'is_visible',
        'font_color',
    ];

    public function cardTemplate(): BelongsTo
    {
        return $this->belongsTo(CardTemplate::class);
    }
}
