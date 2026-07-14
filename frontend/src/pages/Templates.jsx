import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Plus, Layout, Trash2, Edit, Upload } from 'lucide-react';

const Templates = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [cardTypes, setCardTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);

  const [form, setForm] = useState({
    organization_id: '',
    card_type_id: '',
    name: '',
    width: 86.40,
    height: 53.30,
    is_default: false,
    front_background_image: '',
    back_background_image: ''
  });

  const getAssetUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('/storage') || url.startsWith('/assets')) {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
      return `${backendUrl}${url}`;
    }
    return url;
  };

  const handleBackgroundUpload = async (e, side) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    formData.append('side', side);

    try {
      if (side === 'front') setUploadingFront(true);
      else setUploadingBack(true);

      const response = await api.templates.uploadBackground(formData);
      setForm(prev => ({ 
        ...prev, 
        [side === 'front' ? 'front_background_image' : 'back_background_image']: response.url 
      }));
    } catch (err) {
      alert(err.message || `Failed to upload ${side} background image`);
    } finally {
      if (side === 'front') setUploadingFront(false);
      else setUploadingBack(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const temp = await api.templates.list();
      const orgs = await api.organizations.list();
      setTemplates(temp);
      setOrganizations(orgs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOrgChange = async (orgId) => {
    setForm({ ...form, organization_id: orgId, card_type_id: '' });
    if (orgId) {
      try {
        const types = await api.organizations.cardTypes(orgId);
        setCardTypes(types);
      } catch (err) {
        console.error(err);
      }
    } else {
      setCardTypes([]);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      const newTemp = await api.templates.create(form);
      setIsModalOpen(false);
      // Reset form
      setForm({
        organization_id: '',
        card_type_id: '',
        name: '',
        width: 86.40,
        height: 53.30,
        is_default: false,
        front_background_image: '',
        back_background_image: ''
      });
      // Immediately redirect to designer for this new template!
      navigate(`/templates/designer/${newTemp.id}`);
    } catch (err) {
      alert(err.message || 'Failed to create template');
    }
  };

  const handleDeleteTemplate = async (id, e) => {
    e.stopPropagation();
    if (await window.confirm('Are you sure you want to delete this template and all its layout settings?')) {
      try {
        await api.templates.delete(id);
        loadData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  if (loading && templates.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading templates...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Create Template
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {templates.length === 0 ? (
          <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
            No templates found. Click "Create Template" to build your first template using the interactive drag-and-drop builder!
          </div>
        ) : (
          templates.map(temp => (
            <div 
              key={temp.id} 
              className="card" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                cursor: 'pointer',
                borderColor: temp.is_default ? 'var(--primary)' : 'var(--border)'
              }}
              onClick={() => navigate(`/templates/designer/${temp.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '10px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}>
                  <Layout size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px' }}>{temp.name}</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                    {temp.organization?.name} • {temp.card_type?.name}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-light)', marginBottom: '20px' }}>
                <div>Width: <strong>{temp.width} mm</strong></div>
                <div>Height: <strong>{temp.height} mm</strong></div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <span className={`badge badge-${temp.status.toLowerCase()}`}>
                  {temp.status} {temp.is_default ? '(Default)' : ''}
                </span>
                
                <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => navigate(`/templates/designer/${temp.id}`)} title="Design Layout">
                    <Edit size={14} /> Design
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '6px', color: 'var(--danger)' }} onClick={(e) => handleDeleteTemplate(temp.id, e)} title="Delete Template">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Template Dialog Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justify: 'space-between', marginBottom: '20px' }}>
              <h3>Create ID Template</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-light)' }}>
                <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            <form onSubmit={handleCreateTemplate}>
              <div className="form-group">
                <label className="form-label">Organization</label>
                <select 
                  className="form-control" 
                  value={form.organization_id} 
                  onChange={(e) => handleOrgChange(e.target.value)} 
                  required
                >
                  <option value="">Select Organization...</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Card Type Category</label>
                <select 
                  className="form-control" 
                  value={form.card_type_id} 
                  onChange={(e) => setForm({ ...form, card_type_id: e.target.value })} 
                  required
                  disabled={!form.organization_id}
                >
                  <option value="">Select Card Category...</option>
                  {cardTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Template Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Standard Resident ID Layout"
                  value={form.name} 
                  onChange={(e) => setForm({ ...form, name: e.target.value })} 
                  required 
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Width (mm)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="form-control" 
                    value={form.width} 
                    onChange={(e) => setForm({ ...form, width: parseFloat(e.target.value) })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Height (mm)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="form-control" 
                    value={form.height} 
                    onChange={(e) => setForm({ ...form, height: parseFloat(e.target.value) })} 
                    required 
                  />
                </div>
              </div>
              <div className="grid-2" style={{ marginTop: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Front Background Image</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '86px', height: '53px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', flexShrink: 0 }}>
                      {form.front_background_image ? (
                        <img src={getAssetUrl(form.front_background_image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '9px', color: '#94a3b8', textAlign: 'center', padding: '2px' }}>Default Front</span>
                      )}
                    </div>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0, padding: '8px 12px', fontSize: '13px' }}>
                      {uploadingFront ? 'Uploading...' : <><Upload size={14} /> Upload Front</>}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleBackgroundUpload(e, 'front')} disabled={uploadingFront} />
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Back Background Image</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '86px', height: '53px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', flexShrink: 0 }}>
                      {form.back_background_image ? (
                        <img src={getAssetUrl(form.back_background_image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '9px', color: '#94a3b8', textAlign: 'center', padding: '2px' }}>Default Back</span>
                      )}
                    </div>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0, padding: '8px 12px', fontSize: '13px' }}>
                      {uploadingBack ? 'Uploading...' : <><Upload size={14} /> Upload Back</>}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleBackgroundUpload(e, 'back')} disabled={uploadingBack} />
                    </label>
                  </div>
                </div>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="defaultCheck"
                  checked={form.is_default} 
                  onChange={(e) => setForm({ ...form, is_default: e.target.checked })} 
                />
                <label htmlFor="defaultCheck" className="form-label" style={{ margin: 0 }}>Set as Default Template for this category</label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create & Design</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templates;
