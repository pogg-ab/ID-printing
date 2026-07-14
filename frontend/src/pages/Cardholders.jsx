import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Plus, Search, Upload, Edit, Trash2, X, FileSpreadsheet, Eye, Printer } from 'lucide-react';
import { drawCardToCanvas } from '../utils/cardRenderer';

const Cardholders = () => {
  const [cardholders, setCardholders] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [cardTypes, setCardTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & filter
  const [search, setSearch] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState([]);

  // Forms binding
  const [form, setForm] = useState({
    id: null,
    organization_id: '',
    card_type_id: '',
    card_template_id: '',
    card_number: '',
    full_name: '',
    date_of_birth: '',
    gender: 'Male',
    nationality: 'Ethiopian',
    occupation: '',
    address: '',
    woreda: '',
    kebele: '',
    phone_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    blood_group: 'O+',
    photo_url: '',
    signature_image_url: '',
    date_issued: '',
    expiry_date: '',
    status: 'ACTIVE',
    attributes: [] // Array of { name, value }
  });

  const [tempAttr, setTempAttr] = useState({ name: '', value: '' });

  const getAssetUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('/storage') || url.startsWith('/assets')) {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
      return `${backendUrl}${url}`;
    }
    return url;
  };

  // CSV Import State
  const [importForm, setImportForm] = useState({
    organization_id: '',
    card_type_id: '',
    file: null
  });

  // Preview Modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewCardholder, setPreviewCardholder] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [previewSide, setPreviewSide] = useState('FRONT');
  const [isRendering, setIsRendering] = useState(false);
  const [renderCache, setRenderCache] = useState({}); // Cache drawn data URLs by resident_side key

  const [activeTemplate, setActiveTemplate] = useState(null);

  useEffect(() => {
    const fetchActiveTemplate = async () => {
      if (form.card_template_id) {
        try {
          const fullTemp = await api.templates.get(form.card_template_id);
          setActiveTemplate(fullTemp);
        } catch (err) {
          console.error("Failed to load active template details", err);
          setActiveTemplate(null);
        }
      } else {
        setActiveTemplate(null);
      }
    };
    fetchActiveTemplate();
  }, [form.card_template_id]);

  const standardFields = [
    'full_name',
    'full_name_amharic',
    'date_of_birth',
    'gender',
    'nationality',
    'occupation',
    'address',
    'woreda',
    'kebele',
    'phone_number',
    'emergency_contact_name',
    'emergency_contact_phone',
    'blood_group',
    'card_number',
    'date_issued',
    'expiry_date',
    'status'
  ];

  const staticLabels = [
    'header_amharic',
    'header_english',
    'disclaimer',
    'sign_authority_text'
  ];

  const isFieldVisible = (fieldName) => {
    if (!activeTemplate) return true;
    
    if (['organization_id', 'card_type_id', 'card_template_id', 'card_number', 'status'].includes(fieldName)) {
      return true;
    }

    const elements = activeTemplate.elements || [];

    if (fieldName === 'photo_url') {
      return elements.some(e => e.element_type === 'PHOTO');
    }

    if (fieldName === 'signature_image_url') {
      return elements.some(e => e.element_type === 'SIGNATURE');
    }
    if (fieldName === 'secondary_photo_url') {
      return elements.some(e => e.element_type === 'SIGNATURE');
    }

    if (fieldName === 'full_name_amharic') {
      return elements.some(e => e.field_name === 'full_name');
    }

    return elements.some(e => e.field_name === fieldName);
  };

  const getCustomFields = () => {
    if (!activeTemplate) return [];
    const elements = activeTemplate.elements || [];
    const uniqueFields = new Set();
    elements.forEach(e => {
      if (
        e.element_type === 'TEXT' && 
        e.field_name && 
        !standardFields.includes(e.field_name) && 
        !staticLabels.includes(e.field_name)
      ) {
        uniqueFields.add(e.field_name);
      }
    });
    return Array.from(uniqueFields);
  };

  const getCustomFieldValue = (name) => {
    const attr = form.attributes.find(a => a.name.toLowerCase() === name.toLowerCase());
    return attr ? attr.value : '';
  };

  const setCustomFieldValue = (name, value) => {
    const index = form.attributes.findIndex(a => a.name.toLowerCase() === name.toLowerCase());
    if (index > -1) {
      const nextAttrs = [...form.attributes];
      nextAttrs[index].value = value;
      setForm({ ...form, attributes: nextAttrs });
    } else {
      setForm({ ...form, attributes: [...form.attributes, { name, value }] });
    }
  };
  
  const modalCanvasRef = useRef(null);

  const handleOpenPreview = async (cardholder) => {
    try {
      setLoading(true);
      
      // Invalidate cache for this cardholder to guarantee fresh data on load
      const frontKey = `${cardholder.id}_FRONT`;
      const backKey = `${cardholder.id}_BACK`;
      setRenderCache(prev => {
        const next = { ...prev };
        delete next[frontKey];
        delete next[backKey];
        return next;
      });

      // 1. Fetch templates for this organization
      const templatesList = await api.templates.list(cardholder.organization_id);
      if (templatesList.length === 0) {
        alert("No card templates defined for this resident's organization. Please configure a template first.");
        return;
      }
      
      // 2. Select template: use cardholder's explicitly linked template, or default template
      const selectedTemp = templatesList.find(t => t.id === cardholder.card_template_id)
        || templatesList.find(t => t.is_default)
        || templatesList[0];
      
      // 3. Fetch detailed template layout including elements
      const fullTemplate = await api.templates.get(selectedTemp.id);
      
      setPreviewTemplate(fullTemplate);
      setPreviewCardholder(cardholder);
      setPreviewSide('FRONT');
      setIsPreviewOpen(true);
      
      // Trigger canvas drawing in next render cycle once ref is mounted
      setTimeout(() => {
        triggerCanvasRender(cardholder, fullTemplate, 'FRONT');
      }, 150);
    } catch (err) {
      alert("Failed to load ID layout template: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const triggerCanvasRender = async (cardholder, template, side) => {
    if (!cardholder || !template) return;
    
    const cacheKey = `${cardholder.id}_${side}`;
    if (renderCache[cacheKey]) {
      return; // Use the cached data URL directly in image tag
    }

    try {
      setIsRendering(true);
      // Wait a tick for canvas rendering ref to bind properly
      setTimeout(async () => {
        if (!modalCanvasRef.current) return;
        try {
          const dataUrl = await drawCardToCanvas(modalCanvasRef.current, cardholder, template, side, 150);
          setRenderCache(prev => ({ ...prev, [cacheKey]: dataUrl }));
        } catch (err) {
          console.error("Canvas draw failure:", err);
        } finally {
          setIsRendering(false);
        }
      }, 50);
    } catch (err) {
      console.error(err);
      setIsRendering(false);
    }
  };

  const handleTogglePreviewSide = (side) => {
    setPreviewSide(side);
    triggerCanvasRender(previewCardholder, previewTemplate, side);
  };

  const handleExportPNG = async (isHighRes = false) => {
    if (!previewCardholder || !previewTemplate) return;
    try {
      const dpi = isHighRes ? 600 : 300;
      const tempCanvas = document.createElement('canvas');
      
      setIsRendering(true);
      const dataUrl = await drawCardToCanvas(tempCanvas, previewCardholder, previewTemplate, previewSide, dpi);
      
      const link = document.createElement('a');
      const filename = `${previewCardholder.full_name.replace(/\s+/g, '_')}_${previewSide}_${isHighRes ? 'HighRes' : 'Standard'}.png`;
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert("Export failed: " + err.message);
    } finally {
      setIsRendering(false);
    }
  };

  const handleExportPDF = async () => {
    if (!previewCardholder || !previewTemplate) return;
    try {
      setIsRendering(true);
      
      // Create offscreen canvases for both sides
      const frontCanvas = document.createElement('canvas');
      const backCanvas = document.createElement('canvas');
      
      const frontUrl = await drawCardToCanvas(frontCanvas, previewCardholder, previewTemplate, 'FRONT', 300);
      const backUrl = await drawCardToCanvas(backCanvas, previewCardholder, previewTemplate, 'BACK', 300);

      // Create a print iframe or child window
      const printWin = window.open('', '_blank');
      if (!printWin) {
        alert("Pop-up blocked! Please allow popups to export PDF print sheets.");
        return;
      }

      printWin.document.write(`
        <html>
        <head>
          <title>${previewCardholder.full_name} ID Card PDF</title>
          <style>
             @page {
              size: A4 portrait;
              margin: 15mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              text-align: center;
              padding: 10px;
              background-color: #fff;
            }
            .title-header {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 8px;
              margin-bottom: 20px;
            }
            .title-header h2 {
              margin: 0;
              text-transform: uppercase;
              font-size: 18px;
              letter-spacing: 0.5px;
            }
            .title-header p {
              margin: 4px 0 0;
              font-size: 11px;
              color: #64748b;
            }
            .cards-container {
              display: flex;
              flex-direction: column;
              gap: 24px;
              align-items: center;
              margin-top: 30px;
            }
            .card-wrapper {
              border: 0.1mm dashed #94a3b8;
              padding: 0;
              background: #fff;
              width: 86.4mm;
              height: 53.3mm;
              box-sizing: border-box;
              page-break-inside: avoid;
            }
            .card-wrapper img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .card-label {
              font-size: 10px;
              font-weight: 600;
              text-transform: uppercase;
              color: #64748b;
              margin-bottom: 4px;
              margin-top: 10px;
            }
            .footer-info {
              margin-top: 60px;
              font-size: 10px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 12px;
            }
            @media print {
              .no-print {
                display: none;
              }
              body {
                padding: 0;
                background-color: #fff;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px;">
            <button onclick="window.print()" style="padding: 8px 16px; font-weight: bold; cursor: pointer; background-color: #4f46e5; color: white; border: none; border-radius: 6px; font-size: 13px;">
              Print / Save to PDF
            </button>
            <button onclick="window.close()" style="padding: 8px 16px; font-weight: bold; cursor: pointer; margin-left: 10px; background-color: #64748b; color: white; border: none; border-radius: 6px; font-size: 13px;">
              Close Window
            </button>
          </div>

          <div class="title-header">
            <h2>Resident ID Card Document</h2>
            <p>Generated by Dire Dawa Resident ID printing service • Cardholder ID: ${previewCardholder.card_number}</p>
          </div>

          <div style="text-align: left; font-size: 12px; margin-bottom: 20px; padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
            <strong>Resident Details:</strong><br/>
            Full Name: ${previewCardholder.full_name}<br/>
            Ketena / Woreda: Ketena ${previewCardholder.kebele || '-'}, Woreda ${previewCardholder.woreda || '-'}<br/>
            Date of Birth: ${previewCardholder.date_of_birth || '-'}<br/>
            Blood Group: ${previewCardholder.blood_group || '-'}
          </div>

          <div class="cards-container">
            <div>
              <div class="card-label">Front Side Layout</div>
              <div class="card-wrapper">
                <img src="${frontUrl}" />
              </div>
            </div>

            <div>
              <div class="card-label">Back Side Layout</div>
              <div class="card-wrapper">
                <img src="${backUrl}" />
              </div>
            </div>
          </div>

          <div class="footer-info">
            Document generated securely on ${new Date().toLocaleString()}. All details encrypted.
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
        </html>
      `);
      printWin.document.close();
    } catch (err) {
      alert("PDF generation failed: " + err.message);
    } finally {
      setIsRendering(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchCardholders();
  }, [search, selectedOrgId, selectedTypeId, page]);

  const fetchInitialData = async () => {
    try {
      const orgs = await api.organizations.list();
      setOrganizations(orgs);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCardholders = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        search,
        organization_id: selectedOrgId,
        card_type_id: selectedTypeId,
        per_page: 10
      };
      const data = await api.cardholders.list(params);
      setCardholders(data.data || []);
      setTotalPages(data.last_page || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOrgChange = async (orgId) => {
    setSelectedOrgId(orgId);
    setSelectedTypeId('');
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

  const handleFormOrgChange = async (orgId) => {
    setForm(prev => ({ ...prev, organization_id: orgId, card_type_id: '', card_template_id: '' }));
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

  const handleFormTypeChange = async (typeId) => {
    setForm(prev => ({ ...prev, card_type_id: typeId, card_template_id: '' }));
    if (typeId && form.organization_id) {
      try {
        const templatesList = await api.templates.list(form.organization_id);
        const filtered = templatesList.filter(t => t.card_type_id === typeId);
        setAvailableTemplates(filtered);
        
        const defaultTemp = filtered.find(t => t.is_default) || filtered[0];
        if (defaultTemp) {
          setForm(prev => ({ ...prev, card_template_id: defaultTemp.id }));
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      setAvailableTemplates([]);
    }
  };

  const handleOpenModal = async (cardholder = null) => {
    if (cardholder) {
      // Fetch card categories for selected cardholder's org first
      if (cardholder.organization_id) {
        try {
          const types = await api.organizations.cardTypes(cardholder.organization_id);
          setCardTypes(types);

          const templatesList = await api.templates.list(cardholder.organization_id);
          const filtered = templatesList.filter(t => t.card_type_id === cardholder.card_type_id);
          setAvailableTemplates(filtered);
        } catch (err) {
          console.error(err);
        }
      }

      setForm({
        id: cardholder.id,
        organization_id: cardholder.organization_id,
        card_type_id: cardholder.card_type_id,
        card_template_id: cardholder.card_template_id || '',
        card_number: cardholder.card_number || '',
        full_name: cardholder.full_name || '',
        full_name_amharic: cardholder.full_name_amharic || '',
        date_of_birth: cardholder.date_of_birth || '',
        gender: cardholder.gender || 'Male',
        nationality: cardholder.nationality || 'Ethiopian',
        occupation: cardholder.occupation || '',
        address: cardholder.address || '',
        woreda: cardholder.woreda || '',
        kebele: cardholder.kebele || '',
        phone_number: cardholder.phone_number || '',
        emergency_contact_name: cardholder.emergency_contact_name || '',
        emergency_contact_phone: cardholder.emergency_contact_phone || '',
        blood_group: cardholder.blood_group || 'O+',
        photo_url: cardholder.photo_url || '',
        signature_image_url: cardholder.signature_image_url || '',
        secondary_photo_url: cardholder.secondary_photo_url || '',
        date_issued: cardholder.date_issued || '',
        expiry_date: cardholder.expiry_date || '',
        status: cardholder.status || 'ACTIVE',
        attributes: (cardholder.attributes || []).map(a => ({ name: a.attribute_name, value: a.attribute_value }))
      });
    } else {
      setAvailableTemplates([]);
      setForm({
        id: null,
        organization_id: selectedOrgId || '',
        card_type_id: '',
        card_template_id: '',
        card_number: '',
        full_name: '',
        full_name_amharic: '',
        date_of_birth: '',
        gender: 'Male',
        nationality: 'Ethiopian',
        occupation: '',
        address: '',
        woreda: '',
        kebele: '',
        phone_number: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        blood_group: 'O+',
        photo_url: '',
        signature_image_url: '',
        secondary_photo_url: '',
        date_issued: '',
        expiry_date: '',
        status: 'ACTIVE',
        attributes: []
      });
      if (selectedOrgId) {
        try {
          const types = await api.organizations.cardTypes(selectedOrgId);
          setCardTypes(types);
        } catch (err) {
          console.error(err);
        }
      }
    }
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);

    try {
      const response = await api.cardholders.uploadImage(formData);
      
      let fieldKey = 'photo_url';
      if (type === 'signature') fieldKey = 'signature_image_url';
      if (type === 'secondary_photo') fieldKey = 'secondary_photo_url';
      
      setForm({ ...form, [fieldKey]: response.url });
    } catch (err) {
      alert(err.message || "Failed to upload image");
    }
  };

  const handleAddAttribute = () => {
    if (!tempAttr.name.trim()) return;
    setForm({
      ...form,
      attributes: [...form.attributes, { name: tempAttr.name.trim(), value: tempAttr.value.trim() }]
    });
    setTempAttr({ name: '', value: '' });
  };

  const handleRemoveAttribute = (index) => {
    setForm({
      ...form,
      attributes: form.attributes.filter((_, i) => i !== index)
    });
  };

  const handleSaveCardholder = async (e) => {
    e.preventDefault();
    
    // Map empty string form fields to null to satisfy Laravel nullable validations and prevent 422 errors
    const cleanedForm = { ...form };
    for (const key in cleanedForm) {
      if (cleanedForm[key] === '') {
        cleanedForm[key] = null;
      }
    }
    
    try {
      if (form.id) {
        await api.cardholders.update(form.id, cleanedForm);
      } else {
        await api.cardholders.create(cleanedForm);
      }
      setIsModalOpen(false);
      fetchCardholders();
    } catch (err) {
      alert(err.message || 'Failed to save cardholder record');
    }
  };

  const handleDeleteCardholder = async (id) => {
    if (await window.confirm('Are you sure you want to delete this cardholder record?')) {
      try {
        await api.cardholders.delete(id);
        fetchCardholders();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importForm.file) return;

    const formData = new FormData();
    formData.append('organization_id', importForm.organization_id);
    formData.append('card_type_id', importForm.card_type_id);
    formData.append('csv_file', importForm.file);

    try {
      setLoading(true);
      const res = await api.cardholders.bulkImport(formData);
      alert(res.message);
      if (res.errors && res.errors.length > 0) {
        console.warn("Import warning errors:", res.errors);
      }
      setIsImportOpen(false);
      fetchCardholders();
    } catch (err) {
      alert("Import failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Directory Filter Bar */}
      <div className="card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px', backgroundColor: 'var(--panel)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 'var(--radius-sm)' }}>
          <Search size={18} style={{ color: 'var(--text-light)' }} />
          <input 
            type="text" 
            placeholder="Search full name, card number, phone..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', color: 'var(--text)' }}
          />
        </div>

        <select 
          className="form-control" 
          value={selectedOrgId} 
          onChange={(e) => handleOrgChange(e.target.value)}
          style={{ width: '200px', margin: 0 }}
        >
          <option value="">All Organizations</option>
          {organizations.map(org => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>

        <select 
          className="form-control" 
          value={selectedTypeId} 
          onChange={(e) => setSelectedTypeId(e.target.value)}
          style={{ width: '200px', margin: 0 }}
          disabled={!selectedOrgId}
        >
          <option value="">All Categories</option>
          {cardTypes.map(type => (
            <option key={type.id} value={type.id}>{type.name}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <button className="btn btn-secondary" onClick={() => setIsImportOpen(true)}>
            <FileSpreadsheet size={16} /> Bulk Import
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={16} /> Add Resident
          </button>
        </div>
      </div>

      {/* Main Directory Table */}
      <div className="table-panel">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Card Number</th>
                <th>Full Name</th>
                <th>Woreda/Ketena</th>
                <th>Gender/Blood</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && cardholders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>Loading cardholder registry...</td>
                </tr>
              ) : cardholders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-light)' }}>
                    No resident records found. Add one or upload a CSV file!
                  </td>
                </tr>
              ) : (
                cardholders.map(ch => (
                  <tr key={ch.id}>
                    <td>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0' }}>
                        {ch.photo_url ? (
                          <img src={getAssetUrl(ch.photo_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '10px', color: '#718096' }}>No Pic</span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--text-h)' }}>{ch.card_number}</td>
                    <td>
                      <div style={{ fontWeight: '500' }}>{ch.full_name}</div>
                      {ch.full_name_amharic && (
                        <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>
                          {ch.full_name_amharic}
                        </div>
                      )}
                    </td>
                    <td>{ch.woreda ? `Woreda ${ch.woreda}` : ''} {ch.kebele ? `• Ketena ${ch.kebele}` : ''}</td>
                    <td>{ch.gender} • {ch.blood_group}</td>
                    <td>
                      <span className={`badge badge-${ch.status.toLowerCase()}`}>{ch.status}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => handleOpenPreview(ch)} title="Preview Card Layout">
                          <Eye size={14} />
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => handleOpenModal(ch)} title="Edit Record">
                          <Edit size={14} />
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '6px', color: 'var(--danger)' }} onClick={() => handleDeleteCardholder(ch.id)} title="Delete Record">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination footer */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid var(--border)', gap: '8px' }}>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '4px 12px' }} 
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Prev
            </button>
            <span style={{ alignSelf: 'center', fontSize: '13px', color: 'var(--text-light)' }}>Page {page} of {totalPages}</span>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '4px 12px' }} 
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Resident Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3>{form.id ? 'Edit Resident Record' : 'Register Resident'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-light)' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveCardholder}>
              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Organization</label>
                  <select 
                    className="form-control" 
                    value={form.organization_id} 
                    onChange={(e) => handleFormOrgChange(e.target.value)} 
                    required
                    disabled={!!form.id}
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
                    onChange={(e) => handleFormTypeChange(e.target.value)} 
                    required
                    disabled={!form.organization_id || !!form.id}
                  >
                    <option value="">Select Category...</option>
                    {cardTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">ID Design Template</label>
                  <select 
                    className="form-control" 
                    value={form.card_template_id} 
                    onChange={(e) => setForm({ ...form, card_template_id: e.target.value })} 
                    disabled={!form.card_type_id}
                  >
                    <option value="">Default Category Template</option>
                    {availableTemplates.map(temp => (
                      <option key={temp.id} value={temp.id}>{temp.name} {temp.is_default ? '(Default)' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(isFieldVisible('full_name') || isFieldVisible('card_number')) && (
                <div className="grid-3">
                  {isFieldVisible('full_name') && (
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={form.full_name} 
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
                        required 
                      />
                    </div>
                  )}
                  {isFieldVisible('full_name') && (
                    <div className="form-group">
                      <label className="form-label">Amharic Full Name (Optional)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Auto-translated if empty"
                        value={form.full_name_amharic || ''} 
                        onChange={(e) => setForm({ ...form, full_name_amharic: e.target.value })} 
                      />
                    </div>
                  )}
                  {isFieldVisible('card_number') && (
                    <div className="form-group">
                      <label className="form-label">Card Number (Optional)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Auto-generated if empty"
                        value={form.card_number} 
                        onChange={(e) => setForm({ ...form, card_number: e.target.value })} 
                      />
                    </div>
                  )}
                </div>
              )}

              {(isFieldVisible('date_of_birth') || isFieldVisible('gender') || isFieldVisible('blood_group')) && (
                <div className="grid-3">
                  {isFieldVisible('date_of_birth') && (
                    <div className="form-group">
                      <label className="form-label">Date of Birth</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={form.date_of_birth} 
                        onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} 
                      />
                    </div>
                  )}
                  {isFieldVisible('gender') && (
                    <div className="form-group">
                      <label className="form-label">Gender</label>
                      <select 
                        className="form-control" 
                        value={form.gender} 
                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  )}
                  {isFieldVisible('blood_group') && (
                    <div className="form-group">
                      <label className="form-label">Blood Group</label>
                      <select 
                        className="form-control" 
                        value={form.blood_group} 
                        onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                      >
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {(isFieldVisible('nationality') || isFieldVisible('occupation') || isFieldVisible('phone_number')) && (
                <div className="grid-3">
                  {isFieldVisible('nationality') && (
                    <div className="form-group">
                      <label className="form-label">Nationality</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={form.nationality} 
                        onChange={(e) => setForm({ ...form, nationality: e.target.value })} 
                      />
                    </div>
                  )}
                  {isFieldVisible('occupation') && (
                    <div className="form-group">
                      <label className="form-label">Occupation</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={form.occupation} 
                        onChange={(e) => setForm({ ...form, occupation: e.target.value })} 
                      />
                    </div>
                  )}
                  {isFieldVisible('phone_number') && (
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={form.phone_number} 
                        onChange={(e) => setForm({ ...form, phone_number: e.target.value })} 
                      />
                    </div>
                  )}
                </div>
              )}

              {(isFieldVisible('address') || isFieldVisible('woreda') || isFieldVisible('kebele')) && (
                <div className="grid-3">
                  {isFieldVisible('address') && (
                    <div className="form-group">
                      <label className="form-label">Address</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={form.address} 
                        onChange={(e) => setForm({ ...form, address: e.target.value })} 
                      />
                    </div>
                  )}
                  {isFieldVisible('woreda') && (
                    <div className="form-group">
                      <label className="form-label">Woreda</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={form.woreda} 
                        onChange={(e) => setForm({ ...form, woreda: e.target.value })} 
                      />
                    </div>
                  )}
                  {isFieldVisible('kebele') && (
                    <div className="form-group">
                      <label className="form-label">Ketena</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={form.kebele} 
                        onChange={(e) => setForm({ ...form, kebele: e.target.value })} 
                      />
                    </div>
                  )}
                </div>
              )}

              {(isFieldVisible('emergency_contact_name') || isFieldVisible('emergency_contact_phone')) && (
                <div className="grid-2">
                  {isFieldVisible('emergency_contact_name') && (
                    <div className="form-group">
                      <label className="form-label">Emergency Contact Name</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={form.emergency_contact_name} 
                        onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} 
                      />
                    </div>
                  )}
                  {isFieldVisible('emergency_contact_phone') && (
                    <div className="form-group">
                      <label className="form-label">Emergency Phone</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={form.emergency_contact_phone} 
                        onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} 
                      />
                    </div>
                  )}
                </div>
              )}

              {(isFieldVisible('date_issued') || isFieldVisible('expiry_date')) && (
                <div className="grid-2" style={{ marginTop: '16px' }}>
                  {isFieldVisible('date_issued') && (
                    <div className="form-group">
                      <label className="form-label">Date Issued</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={form.date_issued} 
                        onChange={(e) => setForm({ ...form, date_issued: e.target.value })} 
                      />
                    </div>
                  )}
                  {isFieldVisible('expiry_date') && (
                    <div className="form-group">
                      <label className="form-label">Expiry Date</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={form.expiry_date} 
                        onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} 
                      />
                    </div>
                  )}
                </div>
              )}

              {(isFieldVisible('photo_url') || isFieldVisible('signature_image_url') || isFieldVisible('secondary_photo_url')) && (
                <div className="grid-3" style={{ margin: '16px 0', padding: '16px', backgroundColor: 'var(--border-light)', borderRadius: 'var(--radius-sm)' }}>
                  {isFieldVisible('photo_url') && (
                    <div className="form-group">
                      <label className="form-label">Resident Photo</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', backgroundColor: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {form.photo_url ? (
                            <img src={getAssetUrl(form.photo_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '10px' }}>No Photo</span>
                          )}
                        </div>
                        <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                          <Upload size={14} /> Upload Photo
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, 'photo')} />
                        </label>
                      </div>
                    </div>
                  )}

                  {isFieldVisible('signature_image_url') && (
                    <div className="form-group">
                      <label className="form-label">Bearer Signature</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', backgroundColor: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {form.signature_image_url ? (
                            <img src={getAssetUrl(form.signature_image_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : (
                            <span style={{ fontSize: '10px' }}>No Sign</span>
                          )}
                        </div>
                        <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                          <Upload size={14} /> Upload Sign
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, 'signature')} />
                        </label>
                      </div>
                    </div>
                  )}

                  {isFieldVisible('secondary_photo_url') && (
                    <div className="form-group">
                      <label className="form-label">Authority Seal (Stamp)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', backgroundColor: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {form.secondary_photo_url ? (
                            <img src={getAssetUrl(form.secondary_photo_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : (
                            <span style={{ fontSize: '10px' }}>No Seal</span>
                          )}
                        </div>
                        <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                          <Upload size={14} /> Upload Seal
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, 'secondary_photo')} />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic custom fields section */}
              {activeTemplate ? (
                getCustomFields().length > 0 && (
                  <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>Required Template Fields</h4>
                    <div className="grid-3">
                      {getCustomFields().map(field => (
                        <div className="form-group" key={field}>
                          <label className="form-label" style={{ textTransform: 'capitalize' }}>
                            {field.replace(/_/g, ' ')}
                          </label>
                          <input 
                            type="text" 
                            className="form-control"
                            value={getCustomFieldValue(field)}
                            onChange={(e) => setCustomFieldValue(field, e.target.value)}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>Dynamic Custom Attributes</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    {form.attributes.map((attr, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>
                        <span>{attr.name}: {attr.value}</span>
                        <button type="button" onClick={() => handleRemoveAttribute(index)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--primary)', fontWeight: 'bold' }}>×</button>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Attribute Name (e.g. Department)" 
                      value={tempAttr.name} 
                      onChange={e => setTempAttr({ ...tempAttr, name: e.target.value })}
                    />
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Value (e.g. ICT)" 
                      value={tempAttr.value} 
                      onChange={e => setTempAttr({ ...tempAttr, value: e.target.value })}
                    />
                    <button type="button" className="btn btn-secondary" onClick={handleAddAttribute}>Add</button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Modal */}
      {isImportOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justify: 'space-between', marginBottom: '20px' }}>
              <h3>Bulk Import Residents via CSV</h3>
              <button onClick={() => setIsImportOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-light)' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleImportSubmit}>
              <div className="form-group">
                <label className="form-label">Organization</label>
                <select 
                  className="form-control" 
                  value={importForm.organization_id} 
                  onChange={(e) => {
                    setImportForm({ ...importForm, organization_id: e.target.value, card_type_id: '' });
                    if (e.target.value) {
                      api.organizations.cardTypes(e.target.value).then(setCardTypes);
                    }
                  }} 
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
                  value={importForm.card_type_id} 
                  onChange={(e) => setImportForm({ ...importForm, card_type_id: e.target.value })} 
                  required
                  disabled={!importForm.organization_id}
                >
                  <option value="">Select Category...</option>
                  {cardTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Upload CSV File</label>
                <input 
                  type="file" 
                  accept=".csv"
                  className="form-control" 
                  required 
                  onChange={(e) => setImportForm({ ...importForm, file: e.target.files[0] })}
                />
              </div>

              <div style={{ padding: '12px', backgroundColor: 'var(--border-light)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-light)', marginBottom: '20px' }}>
                <strong>Expected Headers:</strong> full_name, date_of_birth, gender, nationality, woreda, kebele, phone_number, blood_group, card_number.
                <br />
                <em>Note: Any extra column header (e.g. "Zone" or "Grade") will automatically be imported as a custom dynamic attribute!</em>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsImportOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Start Import</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Card Preview and Exporter Modal */}
      {isPreviewOpen && previewCardholder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', margin: 0 }}>Identity Card Preview</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                  {previewCardholder.full_name} ({previewCardholder.card_number})
                </span>
              </div>
              <button 
                onClick={() => setIsPreviewOpen(false)} 
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-light)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              
              {/* Card Face Viewport Container */}
              <div 
                style={{ 
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', 
                  borderRadius: '12px', 
                  overflow: 'hidden', 
                  lineHeight: 0,
                  border: '1px solid var(--border)',
                  backgroundColor: '#edf2f7',
                  position: 'relative',
                  width: '100%',
                  maxWidth: '450px',
                  aspectRatio: '86.4/53.3'
                }}
              >
                {renderCache[`${previewCardholder?.id}_${previewSide}`] ? (
                  <img 
                    src={renderCache[`${previewCardholder?.id}_${previewSide}`]} 
                    alt="Card Preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  />
                ) : (
                  <canvas 
                    ref={modalCanvasRef} 
                    style={{ 
                      width: '100%', 
                      height: '100%',
                      display: 'block' 
                    }} 
                  />
                )}
                
                {isRendering && !renderCache[`${previewCardholder?.id}_${previewSide}`] && (
                  <div 
                    style={{ 
                      position: 'absolute', 
                      top: 0, 
                      left: 0, 
                      right: 0, 
                      bottom: 0, 
                      backgroundColor: 'rgba(255, 255, 255, 0.7)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '13px', 
                      color: 'var(--primary)',
                      fontWeight: '600' 
                    }}
                  >
                    Drawing Card Face...
                  </div>
                )}
              </div>

              {/* Toggle Front/Back */}
              <div className="toggle-tabs" style={{ maxWidth: '300px', margin: '0 auto' }}>
                <div 
                  className={`toggle-tab ${previewSide === 'FRONT' ? 'active' : ''}`} 
                  onClick={() => handleTogglePreviewSide('FRONT')}
                >
                  Front Card Face
                </div>
                <div 
                  className={`toggle-tab ${previewSide === 'BACK' ? 'active' : ''}`} 
                  onClick={() => handleTogglePreviewSide('BACK')}
                >
                  Back Card Face
                </div>
              </div>

              {/* Action Buttons */}
              <div 
                className="grid-3"
                style={{ 
                  gap: '12px', 
                  width: '100%', 
                  marginTop: '10px',
                  paddingTop: '20px',
                  borderTop: '1px solid var(--border)' 
                }}
              >
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ gap: '8px' }}
                  onClick={() => handleExportPNG(false)}
                  disabled={isRendering}
                >
                  <Printer size={15} /> Export PNG (300 DPI)
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ gap: '8px' }}
                  onClick={() => handleExportPNG(true)}
                  disabled={isRendering}
                >
                  <Printer size={15} /> High-Res PNG (600 DPI)
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ gap: '8px' }}
                  onClick={handleExportPDF}
                  disabled={isRendering}
                >
                  <Printer size={15} /> Generate Single PDF
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cardholders;
