<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $query = AuditLog::query();

        if ($request->filled('entity_name')) {
            $query->where('entity_name', $request->entity_name);
        }

        if ($request->filled('action_type')) {
            $query->where('action_type', $request->action_type);
        }

        return response()->json($query->orderBy('performed_at', 'desc')->paginate($request->get('per_page', 50)));
    }
}
