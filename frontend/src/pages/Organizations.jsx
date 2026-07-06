import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, Edit2, Trash2, Eye, X, Upload } from 'lucide-react';

const Organizations = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState(null);
  
  // Modal controllers
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [isCardTypeModalOpen, setIsCardTypeModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  // Form bindings
  const [orgForm, setOrgForm] = useState({
    id: null,
    code: '',
    name: '',
    address: '',
    contact_person: '',
    phone_number: '',
    email_address: '',
    status: 'ACTIVE',
    logo_url: ''
  });

  const getAssetUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('/storage') || url.startsWith('/assets')) {
      return `https://id.office-tech-dire.com${url}`;
    }
    return url;
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await api.organizations.uploadLogo(formData);
      setOrgForm(prev => ({ ...prev, logo_url: response.url }));
    } catch (err) {
      alert(err.message || "Failed to upload organization logo");
    }
  };
  
  const [cardTypeForm, setCardTypeForm] = useState({
    id: null,
    code: '',
    name: '',
    description: '',
    is_active: true
  });
  const [cardTypes, setCardTypes] = useState([]);

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    try {
      setLoading(true);
      const data = await api.organizations.list();
      setOrganizations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOrgModal = (org = null) => {
    if (org) {
      setOrgForm({
        id: org.id,
        code: org.code,
        name: org.name,
        address: org.address || '',
        contact_person: org.contact_person || '',
        phone_number: org.phone_number || '',
        email_address: org.email_address || '',
        status: org.status,
        logo_url: org.logo_url || ''
      });
    } else {
      setOrgForm({
        id: null,
        code: '',
        name: '',
        address: '',
        contact_person: '',
        phone_number: '',
        email_address: '',
        status: 'ACTIVE',
        logo_url: ''
      });
    }
    setIsOrgModalOpen(true);
  };

  const handleSaveOrg = async (e) => {
    e.preventDefault();
    try {
      if (orgForm.id) {
        await api.organizations.update(orgForm.id, orgForm);
      } else {
        await api.organizations.create(orgForm);
      }
      setIsOrgModalOpen(false);
      fetchOrgs();
    } catch (err) {
      alert(err.message || 'Failed to save organization');
    }
  };

  const handleDeleteOrg = async (id) => {
    if (await window.confirm('Are you sure you want to delete this organization? All templates, cardholders, and batches will be deleted!')) {
      try {
        await api.organizations.delete(id);
        fetchOrgs();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleViewOrg = async (org) => {
    setSelectedOrg(org);
    try {
      const types = await api.organizations.cardTypes(org.id);
      setCardTypes(types);
      setIsViewModalOpen(true);
    } catch (err) {
      alert('Failed to fetch card types');
    }
  };

  const handleOpenCardTypeModal = (type = null) => {
    if (type) {
      setCardTypeForm({
        id: type.id,
        code: type.code,
        name: type.name,
        description: type.description || '',
        is_active: type.is_active
      });
    } else {
      setCardTypeForm({
        id: null,
        code: '',
        name: '',
        description: '',
        is_active: true
      });
    }
    setIsCardTypeModalOpen(true);
  };

  const handleSaveCardType = async (e) => {
    e.preventDefault();
    try {
      if (cardTypeForm.id) {
        await api.cardTypes.update(cardTypeForm.id, cardTypeForm);
      } else {
        await api.organizations.createCardType(selectedOrg.id, cardTypeForm);
      }
      setIsCardTypeModalOpen(false);
      // reload card types
      const types = await api.organizations.cardTypes(selectedOrg.id);
      setCardTypes(types);
    } catch (err) {
      alert(err.message || 'Failed to save card type');
    }
  };

  const handleDeleteCardType = async (id) => {
    if (await window.confirm('Delete this card type?')) {
      try {
        await api.cardTypes.delete(id);
        const types = await api.organizations.cardTypes(selectedOrg.id);
        setCardTypes(types);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  if (loading && organizations.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading organizations...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button className="btn btn-primary" onClick={() => handleOpenOrgModal()}>
          <Plus size={16} /> Add Organization
        </button>
      </div>

      <div className="table-panel">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Contact Person</th>
              <th>Phone</th>
              <th>Card Types</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr key={org.id}>
                <td style={{ fontWeight: '600', color: 'var(--text-h)' }}>{org.code}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', flexShrink: 0 }}>
                      {org.logo_url ? (
                        <img src={getAssetUrl(org.logo_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 'bold' }}>{org.code.substr(0, 2)}</span>
                      )}
                    </div>
                    <span>{org.name}</span>
                  </div>
                </td>
                <td>{org.contact_person || '-'}</td>
                <td>{org.phone_number || '-'}</td>
                <td>
                  <span className="badge" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 'bold' }}>
                    {org.card_types_count || 0} types
                  </span>
                </td>
                <td>
                  <span className={`badge badge-${org.status.toLowerCase()}`}>
                    {org.status}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => handleViewOrg(org)} title="Manage Card Types">
                      <Eye size={14} />
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => handleOpenOrgModal(org)} title="Edit Org">
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '6px', color: 'var(--danger)' }} onClick={() => handleDeleteOrg(org.id)} title="Delete Org">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Organization Create/Edit Modal */}
      {isOrgModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3>{orgForm.id ? 'Edit Organization' : 'Create Organization'}</h3>
              <button onClick={() => setIsOrgModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-light)' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveOrg}>
              <div className="form-group">
                <label className="form-label">Org Code (Unique)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={orgForm.code} 
                  onChange={(e) => setOrgForm({...orgForm, code: e.target.value})} 
                  required 
                  disabled={!!orgForm.id}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Org Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={orgForm.name} 
                  onChange={(e) => setOrgForm({...orgForm, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea 
                  className="form-control" 
                  value={orgForm.address} 
                  onChange={(e) => setOrgForm({...orgForm, address: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Contact Person</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={orgForm.contact_person} 
                    onChange={(e) => setOrgForm({...orgForm, contact_person: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={orgForm.phone_number} 
                    onChange={(e) => setOrgForm({...orgForm, phone_number: e.target.value})} 
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={orgForm.email_address} 
                  onChange={(e) => setOrgForm({...orgForm, email_address: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Organization Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
                    {orgForm.logo_url ? (
                      <img src={getAssetUrl(orgForm.logo_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>No Logo</span>
                    )}
                  </div>
                  <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0, padding: '8px 12px', fontSize: '13px' }}>
                    <Upload size={14} /> Upload Logo
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                  </label>
                </div>
              </div>
              {orgForm.id && (
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select 
                    className="form-control" 
                    value={orgForm.status} 
                    onChange={(e) => setOrgForm({...orgForm, status: e.target.value})}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsOrgModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View/Manage Card Types Modal */}
      {isViewModalOpen && selectedOrg && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
              <div>
                <h3>Card Types for {selectedOrg.name}</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>Configure templates and workflows per card category.</span>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-light)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button className="btn btn-primary" onClick={() => handleOpenCardTypeModal()}>
                <Plus size={14} /> Add Card Type
              </button>
            </div>

            <div className="table-panel">
              <table className="custom-table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cardTypes.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '16px', color: 'var(--text-light)' }}>No card types configured.</td>
                    </tr>
                  ) : (
                    cardTypes.map(type => (
                      <tr key={type.id}>
                        <td style={{ fontWeight: '600' }}>{type.code}</td>
                        <td>{type.name}</td>
                        <td>{type.description || '-'}</td>
                        <td>
                          <span className={`badge badge-${type.is_active ? 'success' : 'failed'}`}>
                            {type.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" style={{ padding: '4px' }} onClick={() => handleOpenCardTypeModal(type)}>
                              <Edit2 size={12} />
                            </button>
                            <button className="btn btn-secondary" style={{ padding: '4px', color: 'var(--danger)' }} onClick={() => handleDeleteCardType(type.id)}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Card Type Create/Edit Modal */}
      {isCardTypeModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 110 }}>
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3>{cardTypeForm.id ? 'Edit Card Type' : 'Add Card Type'}</h3>
              <button onClick={() => setIsCardTypeModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-light)' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveCardType}>
              <div className="form-group">
                <label className="form-label">Card Type Code (e.g. RES-ID)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={cardTypeForm.code} 
                  onChange={(e) => setCardTypeForm({...cardTypeForm, code: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Name (e.g. Resident ID)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={cardTypeForm.name} 
                  onChange={(e) => setCardTypeForm({...cardTypeForm, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-control" 
                  value={cardTypeForm.description} 
                  onChange={(e) => setCardTypeForm({...cardTypeForm, description: e.target.value})} 
                  rows="3"
                />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="isActiveCheck"
                  checked={cardTypeForm.is_active} 
                  onChange={(e) => setCardTypeForm({...cardTypeForm, is_active: e.target.checked})} 
                />
                <label htmlFor="isActiveCheck" className="form-label" style={{ margin: 0 }}>Active and available for templates</label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCardTypeModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Card Type</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organizations;
