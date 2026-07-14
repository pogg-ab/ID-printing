<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

abstract class Controller
{
    protected function getAllowedOrganizationIds(Request $request)
    {
        $userId = $request->header('X-User-Id');
        $userRole = $request->header('X-User-Role');

        if (!$userId) {
            return collect([]);
        }

        if ($userRole === 'super_admin' || $userRole === 'admin') {
            return \App\Models\Organization::pluck('id');
        }

        $user = \App\Models\User::find($userId);
        if (!$user) {
            return collect([]);
        }

        // Get organizations assigned to the user
        $assignedIds = $user->organizations()
            ->wherePivot('is_active', true)
            ->pluck('organizations.id')
            ->toArray();

        // Get organizations created by the user
        $createdIds = \App\Models\Organization::where('created_by', $userId)
            ->pluck('id')
            ->toArray();

        // Merge and return unique IDs
        return collect(array_unique(array_merge($assignedIds, $createdIds)));
    }
}
