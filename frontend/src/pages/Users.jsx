import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { UserPlus, Trash2, Pencil, X, Shield, ShieldOff, Eye, EyeOff } from 'lucide-react';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.users.list();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', password: '' });
    setError('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: '' });
    setError('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editingUser) {
        await api.users.update(editingUser.id, form);
      } else {
        await api.users.create(form);
      }
      setIsModalOpen(false);
      loadUsers();
    } catch (err) {
      setError(err.message || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete staff user "${user.name}"? This cannot be undone.`)) return;
    try {
      await api.users.delete(user.id);
      loadUsers();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const grantedCount = (user) =>
    Object.values(user.permissions || {}).filter(Boolean).length;

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <p style={{ fontSize: '13px', color: 'var(--text-light)', marginTop: '4px' }}>
            Create and manage staff accounts. Use the Permissions page to control their access.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={16} /> Add Staff User
        </button>
      </div>

      {/* Users Table */}
      <div className="table-panel">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Pages Accessible</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-light)' }}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
                  <ShieldOff size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                  No staff users yet. Click "Add Staff User" to get started.
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id}>
                  <td style={{ fontWeight: '600', color: 'var(--text-h)' }}>{user.name}</td>
                  <td style={{ color: 'var(--text-light)', fontSize: '13px' }}>{user.email}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                      backgroundColor: 'rgba(99,102,241,0.1)', color: 'var(--primary)'
                    }}>
                      <Shield size={11} /> Staff
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', color: grantedCount(user) > 0 ? 'var(--success)' : 'var(--text-light)' }}>
                      {grantedCount(user)} / 9 pages
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                        onClick={() => openEdit(user)}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '12px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '5px' }}
                        onClick={() => handleDelete(user)}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>
                {editingUser ? 'Edit Staff User' : 'Add Staff User'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-light)' }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '13px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-control"
                  type="text"
                  placeholder="e.g. Mohammed Ahmed"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  className="form-control"
                  type="email"
                  placeholder="staff@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Password {editingUser && <span style={{ fontWeight: 400, color: 'var(--text-light)' }}>(leave blank to keep current)</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-control"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={editingUser ? 'Enter new password...' : 'Min 6 characters'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required={!editingUser}
                    style={{ paddingRight: '42px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-light)', display: 'flex', padding: 0 }}
                    tabIndex="-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingUser ? 'Update User' : 'Create Staff User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
