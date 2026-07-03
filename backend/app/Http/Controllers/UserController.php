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
