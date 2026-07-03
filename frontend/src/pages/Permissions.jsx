import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Save, CheckCircle2, XCircle, Shield, ChevronDown } from 'lucide-react';

// All pages that can be toggled per user
const ALL_PAGES = [
  { key: 'dashboard',      label: 'Dashboard',          description: 'View the overview and statistics dashboard' },
  { key: 'organizations',  label: 'Organizations',       description: 'Manage organizations and card types' },
  { key: 'templates',      label: 'Templates',           description: 'Design and manage ID card templates' },
  { key: 'cardholders',    label: 'Cardholders',         description: 'View and manage resident cardholder records' },
  { key: 'batches',        label: 'Print Batches',       description: 'Create and manage print job batches' },
  { key: 'reprints',       label: 'Reprints',            description: 'Process reprint requests' },
  { key: 'deliveries',     label: 'Deliveries',          description: 'Track card delivery operations' },
  { key: 'reports',        label: 'Reports',             description: 'View performance and activity reports' },
  { key: 'audit_trail',    label: 'Audit Trail',         description: 'View security and activity audit logs' },
];

const PermissionsPage = () => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.users.list();
      setUsers(data);
      if (data.length > 0) {
        selectUser(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectUser = (user) => {
    setSelectedUserId(user.id);
    // Build permission state from user's permissions map
    const perms = {};
    ALL_PAGES.forEach(p => {
      perms[p.key] = !!(user.permissions && user.permissions[p.key]);
    });
    setPermissions(perms);
    setSaved(false);
  };

  const handleUserChange = (userId) => {
    const user = users.find(u => u.id == userId);
    if (user) selectUser(user);
  };

  const togglePermission = (key) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const grantAll = () => {
    const all = {};
    ALL_PAGES.forEach(p => { all[p.key] = true; });
    setPermissions(all);
    setSaved(false);
  };

  const revokeAll = () => {
    const none = {};
    ALL_PAGES.forEach(p => { none[p.key] = false; });
    setPermissions(none);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    try {
      setSaving(true);
      await api.users.updatePermissions(selectedUserId, permissions);
      // Update local user list to reflect new permissions
      setUsers(prev => prev.map(u => {
        if (u.id == selectedUserId) return { ...u, permissions };
        return u;
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Failed to save permissions: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedUser = users.find(u => u.id == selectedUserId);
  const grantedCount = Object.values(permissions).filter(Boolean).length;

  return (
    <div style={{ maxWidth: '780px' }}>
      {/* User selector */}
      <div className="card" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
          <Shield size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '6px' }}>
              Select Staff User to Configure
            </label>
            <div style={{ position: 'relative' }}>
              <select
                className="form-control"
                value={selectedUserId}
                onChange={e => handleUserChange(e.target.value)}
                style={{ paddingRight: '36px', appearance: 'none' }}
              >
                {loading
                  ? <option>Loading users...</option>
                  : users.length === 0
                    ? <option value="">No staff users found</option>
                    : users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
                      ))
                }
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-light)' }} />
            </div>
          </div>
        </div>

        {selectedUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-light)' }}>Access granted:</span>
            <span style={{ fontWeight: '700', color: grantedCount > 0 ? 'var(--primary)' : 'var(--text-light)', fontSize: '18px' }}>
              {grantedCount}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-light)' }}>/ {ALL_PAGES.length}</span>
          </div>
        )}
      </div>

      {/* Permission toggles */}
      {selectedUser ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-light)', margin: 0 }}>
              Toggle which pages <strong style={{ color: 'var(--text-h)' }}>{selectedUser.name}</strong> can access after login.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={grantAll} style={{ fontSize: '12px', padding: '5px 12px' }}>Grant All</button>
              <button className="btn btn-secondary" onClick={revokeAll} style={{ fontSize: '12px', padding: '5px 12px', color: 'var(--danger)' }}>Revoke All</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {ALL_PAGES.map(page => {
              const allowed = !!permissions[page.key];
              return (
                <div
                  key={page.key}
                  onClick={() => togglePermission(page.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${allowed ? 'var(--primary)' : 'var(--border)'}`,
                    backgroundColor: allowed ? 'rgba(99,102,241,0.05)' : 'var(--panel)',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ flexShrink: 0 }}>
                    {allowed
                      ? <CheckCircle2 size={22} style={{ color: 'var(--primary)' }} />
                      : <XCircle size={22} style={{ color: 'var(--border)', opacity: 0.6 }} />
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: allowed ? 'var(--text-h)' : 'var(--text-light)' }}>
                      {page.label}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>
                      {page.description}
                    </div>
                  </div>
                  {/* Toggle pill */}
                  <div
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      backgroundColor: allowed ? 'var(--primary)' : 'var(--border)',
                      position: 'relative',
                      flexShrink: 0,
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '3px',
                      left: allowed ? '23px' : '3px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'left 0.2s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            {saved && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontSize: '13px', fontWeight: '500' }}>
                <CheckCircle2 size={16} /> Permissions saved!
              </span>
            )}
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || users.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-light)' }}>
          {loading ? 'Loading...' : 'No staff users available. Create one first using the "Users" page.'}
        </div>
      )}
    </div>
  );
};

export default PermissionsPage;
