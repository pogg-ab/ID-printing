<?php

namespace App\Http\Controllers;

use App\Models\CardTemplate;
use App\Models\TemplateElement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TemplateController extends Controller
{
    public function index(Request $request)
    {
        $query = CardTemplate::with(['organization', 'cardType']);

        if ($request->filled('organization_id')) {
            $query->where('organization_id', $request->organization_id);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'organization_id' => 'required|exists:organizations,id',
            'card_type_id' => 'required|exists:card_types,id',
            'name' => 'required|string|max:200',
            'front_background_image' => 'nullable|string',
            'back_background_image' => 'nullable|string',
            'width' => 'nullable|numeric',
            'height' => 'nullable|numeric',
            'is_default' => 'boolean',
        ]);

        // If template is default, mark other templates for same card type as not default
        if ($request->is_default) {
            CardTemplate::where('card_type_id', $request->card_type_id)->update(['is_default' => false]);
        }

        $template = CardTemplate::create($validated);

        return response()->json($template, 201);
    }

    public function show($id)
    {
        $template = CardTemplate::with(['organization', 'cardType', 'elements'])->findOrFail($id);
        return response()->json($template);
    }

    public function update(Request $request, $id)
    {
        $template = CardTemplate::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:200',
            'front_background_image' => 'nullable|string',
            'back_background_image' => 'nullable|string',
            'width' => 'nullable|numeric',
            'height' => 'nullable|numeric',
            'is_default' => 'boolean',
            'status' => 'required|string|max:20',
        ]);

        if ($request->is_default && !$template->is_default) {
            CardTemplate::where('card_type_id', $template->card_type_id)->update(['is_default' => false]);
        }

        $template->update($validated);
        return response()->json($template);
    }

    public function destroy($id)
    {
        $template = CardTemplate::findOrFail($id);
        $template->delete();
        return response()->json(['message' => 'Template deleted successfully']);
    }

    // Save/update elements (drag-and-drop designer API)
    public function saveElements(Request $request, $id)
    {
        $template = CardTemplate::findOrFail($id);

        $request->validate([
            'elements' => 'required|array',
            'elements.*.side' => 'required|string|in:FRONT,BACK',
            'elements.*.element_type' => 'required|string|max:30',
            'elements.*.field_name' => 'nullable|string|max:100',
            'elements.*.x_position' => 'required|numeric',
            'elements.*.y_position' => 'required|numeric',
            'elements.*.width' => 'nullable|numeric',
            'elements.*.height' => 'nullable|numeric',
            'elements.*.font_family' => 'nullable|string|max:100',
            'elements.*.font_size' => 'nullable|integer',
            'elements.*.font_weight' => 'nullable|string|max:20',
            'elements.*.is_visible' => 'boolean',
        ]);

        DB::transaction(function () use ($template, $request) {
            // Delete existing elements
            $template->elements()->delete();

            // Re-create elements
            foreach ($request->elements as $elem) {
                $template->elements()->create($elem);
            }
        });

        return response()->json($template->load('elements'));
    }
}
