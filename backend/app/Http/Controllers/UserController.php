<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserPermission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    // All defined page keys that can be assigned permissions
    const PAGE_KEYS = [
        'dashboard', 'organizations', 'templates',
        'cardholders', 'batches', 'reprints',
        'deliveries', 'reports', 'audit_trail',
    ];

    /**
     * List all staff users (not super_admin).
     */
    public function index()
    {
        $users = User::with('permissions')
            ->where('role', 'staff')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($user) {
                return $this->formatUser($user);
            });

        return response()->json($users);
    }

    /**
     * Create a new staff user.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:200',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
        ]);

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
            'role'     => 'staff',
        ]);

        // Initialize all permissions to false by default
        foreach (self::PAGE_KEYS as $key) {
            UserPermission::create([
                'user_id'    => $user->id,
                'page_key'   => $key,
                'can_access' => false,
            ]);
        }

        return response()->json($this->formatUser($user->load('permissions')), 201);
    }

    /**
     * Update staff user info.
     */
    public function update(Request $request, $id)
    {
        $user = User::where('role', 'staff')->findOrFail($id);

        $request->validate([
            'name'     => 'required|string|max:200',
            'email'    => ['required', 'email', Rule::unique('users')->ignore($user->id)],
            'password' => 'nullable|string|min:6',
        ]);

        $data = [
            'name'  => $request->name,
            'email' => $request->email,
        ];

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return response()->json($this->formatUser($user->load('permissions')));
    }

    /**
     * Delete a staff user.
     */
    public function destroy($id)
    {
        $user = User::where('role', 'staff')->findOrFail($id);
        $user->delete();
        return response()->json(['message' => 'User deleted successfully.']);
    }

    /**
     * Save page permissions for a staff user.
     * Expects: { permissions: { dashboard: true, organizations: false, ... } }
     */
    public function updatePermissions(Request $request, $id)
    {
        $user = User::where('role', 'staff')->findOrFail($id);

        $request->validate([
            'permissions'   => 'required|array',
        ]);

        $perms = $request->permissions;

        foreach (self::PAGE_KEYS as $key) {
            UserPermission::updateOrCreate(
                ['user_id' => $user->id, 'page_key' => $key],
                ['can_access' => !empty($perms[$key])]
            );
        }

        return response()->json($this->formatUser($user->load('permissions')));
    }

    /**
     * List all organizations assigned to a user.
     */
    public function listOrganizations($id)
    {
        $user = User::findOrFail($id);
        $organizations = $user->organizations()
            ->select('organizations.id', 'organizations.code', 'organizations.name')
            ->get()
            ->map(function ($org) {
                return [
                    'id' => $org->id,
                    'code' => $org->code,
                    'name' => $org->name,
                    'is_active' => (bool) $org->pivot->is_active,
                    'created_at' => $org->pivot->created_at ? $org->pivot->created_at->toDateTimeString() : null,
                ];
            });

        return response()->json($organizations);
    }

    /**
     * Assign an organization to a user.
     */
    public function assignOrganization(Request $request, $id)
    {
        $user = User::findOrFail($id);
        
        $request->validate([
            'organization_id' => 'required|exists:organizations,id',
            'is_active' => 'boolean',
        ]);

        $orgId = $request->organization_id;
        $isActive = $request->get('is_active', true);

        // Check if already assigned
        if ($user->organizations()->where('organizations.id', $orgId)->exists()) {
            $user->organizations()->updateExistingPivot($orgId, ['is_active' => $isActive]);
        } else {
            $user->organizations()->attach($orgId, ['is_active' => $isActive]);
        }

        return response()->json(['message' => 'Organization assigned successfully.']);
    }

    /**
     * Remove an organization assignment from a user.
     */
    public function removeOrganization($id, $orgId)
    {
        $user = User::findOrFail($id);
        $user->organizations()->detach($orgId);

        return response()->json(['message' => 'Organization assignment removed successfully.']);
    }

    /**
     * Format a user for JSON response — includes permissions as a flat map.
     */
    private function formatUser(User $user): array
    {
        $permMap = [];
        foreach ($user->permissions as $perm) {
            $permMap[$perm->page_key] = (bool) $perm->can_access;
        }
        // Fill any missing page keys with false
        foreach (self::PAGE_KEYS as $key) {
            if (!isset($permMap[$key])) {
                $permMap[$key] = false;
            }
        }

        return [
            'id'          => $user->id,
            'name'        => $user->name,
            'email'       => $user->email,
            'role'        => $user->role,
            'created_at'  => $user->created_at,
            'permissions' => $permMap,
        ];
    }
}
