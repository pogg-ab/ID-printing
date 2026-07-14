import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  ArrowLeft, 
  Save, 
  ToggleLeft, 
  Type, 
  Image as ImageIcon, 
  QrCode, 
  Barcode as BarcodeIcon, 
  FileSignature, 
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';

// Scale factor: 1mm = 6px. Custom card is 86.4mm x 53.30mm => 518px x 320px
const SCALE = 6; 

const TemplateDesigner = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  
  const [template, setTemplate] = useState(null);
  const [elements, setElements] = useState([]);
  const [selectedSide, setSelectedSide] = useState('FRONT'); // FRONT or BACK
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [loading, setLoading] = useState(true);

  const getAssetUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('/storage') || url.startsWith('/assets')) {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
      return `${backendUrl}${url}`;
    }
    return url;
  };
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elementStartPos, setElementStartPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchTemplate();
  }, [id]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const data = await api.templates.get(id);
      setTemplate(data);
      setElements(data.elements || []);
    } catch (err) {
      alert("Failed to load template layout settings");
    } finally {
      setLoading(false);
    }
  };

  const handleAddElement = (type, defaultFieldName = '') => {
    const newElement = {
      id: 'new-' + Math.random().toString(36).substr(2, 9),
      side: selectedSide,
      element_type: type,
      field_name: defaultFieldName || type.toLowerCase(),
      x_position: 10.00, // 10mm
      y_position: 10.00, // 10mm
      width: type === 'PHOTO' ? 24.00 : (type === 'QR' ? 20.00 : (type === 'BARCODE' ? 30.00 : 35.00)),
      height: type === 'PHOTO' ? 28.00 : (type === 'QR' ? 20.00 : (type === 'BARCODE' ? 6.00 : 6.00)),
      font_family: 'Inter',
      font_size: 7,
      font_weight: 'normal',
      is_visible: true,
      font_color: ''
    };

    setElements([...elements, newElement]);
    setSelectedElementId(newElement.id);
  };

  const handleRemoveElement = (elemId) => {
    setElements(elements.filter(e => e.id !== elemId));
    setSelectedElementId(null);
  };

  const handleSelectElement = (elemId) => {
    setSelectedElementId(elemId);
  };

  // Mouse Handlers for Dragging
  const handleMouseDown = (e, element) => {
    e.stopPropagation();
    setSelectedElementId(element.id);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStartPos({ 
      x: parseFloat(element.x_position) * SCALE, 
      y: parseFloat(element.y_position) * SCALE 
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !selectedElementId) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    const newPixelX = elementStartPos.x + dx;
    const newPixelY = elementStartPos.y + dy;

    // Boundary constraints: Card is 518px x 320px
    const selectedElem = elements.find(el => el.id === selectedElementId);
    if (!selectedElem) return;

    const elemWidthPx = (selectedElem.width || 20) * SCALE;
    const elemHeightPx = (selectedElem.height || 10) * SCALE;

    const boundedX = Math.max(0, Math.min(518 - elemWidthPx, newPixelX));
    const boundedY = Math.max(0, Math.min(320 - elemHeightPx, newPixelY));

    // Convert back to mm
    const newMmX = Math.round((boundedX / SCALE) * 100) / 100;
    const newMmY = Math.round((boundedY / SCALE) * 100) / 100;

    setElements(elements.map(el => {
      if (el.id === selectedElementId) {
        return { ...el, x_position: newMmX, y_position: newMmY };
      }
      return el;
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Update properties inputs
  const updateSelectedElement = (property, value) => {
    setElements(elements.map(el => {
      if (el.id === selectedElementId) {
        return { ...el, [property]: value };
      }
      return el;
    }));
  };

  const handleSaveLayout = async () => {
    try {
      setLoading(true);
      // Clean temporary client IDs from new elements
      const cleanedElements = elements.map(el => {
        const cleaned = { ...el };
        if (typeof cleaned.id === 'string' && cleaned.id.startsWith('new-')) {
          delete cleaned.id;
        }
        return cleaned;
      });

      await api.templates.saveElements(id, cleanedElements);
      alert("Template elements layout saved successfully!");
      fetchTemplate();
    } catch (err) {
      alert("Failed to save layout: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !template) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Template Designer...</div>;
  }

  const selectedElement = elements.find(e => e.id === selectedElementId);
  const visibleElements = elements.filter(e => e.side === selectedSide);

  const getElementLabel = (elem) => {
    switch(elem.element_type) {
      case 'LOGO': return 'Emblem Logo';
      case 'PHOTO': return 'Bearer Photo';
      case 'BARCODE': return 'ID Barcode';
      case 'QR': return 'Audit QR Code';
      case 'SIGNATURE': return 'Authority Sign';
      case 'IMAGE': return 'Flag/Decorative';
      case 'TEXT': return elem.field_name ? `Field: ${elem.field_name}` : 'Text Field';
      default: return 'Element';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      {/* Designer Toolbar Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={() => navigate('/templates')}>
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h2 style={{ fontSize: '20px' }}>{template?.name} Layout Editor</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
              {template?.organization?.name} • Custom ID Format (86.40 x 53.30 mm)
            </span>
          </div>
        </div>
        
        <button className="btn btn-primary" onClick={handleSaveLayout}>
          <Save size={16} /> Save Template Layout
        </button>
      </div>

      {/* Editor Main Workspace Grid */}
      <div className="designer-grid">
        
        {/* Left Side: Layout Toolbox */}
        <div className="designer-toolbox">
          <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Card Face side</h4>
          <div className="toggle-tabs">
            <div 
              className={`toggle-tab ${selectedSide === 'FRONT' ? 'active' : ''}`}
              onClick={() => { setSelectedSide('FRONT'); setSelectedElementId(null); }}
            >
              Front Side
            </div>
            <div 
              className={`toggle-tab ${selectedSide === 'BACK' ? 'active' : ''}`}
              onClick={() => { setSelectedSide('BACK'); setSelectedElementId(null); }}
            >
              Back Side
            </div>
          </div>

          <h4 style={{ fontSize: '14px', marginTop: '12px', marginBottom: '8px' }}>Add Elements</h4>
          
          <button className="toolbox-btn" onClick={() => handleAddElement('TEXT', 'full_name')}>
            <Type size={16} />
            <span>Text Field</span>
          </button>

          <button className="toolbox-btn" onClick={() => handleAddElement('PHOTO')}>
            <ImageIcon size={16} />
            <span>Bearer Photo</span>
          </button>

          <button className="toolbox-btn" onClick={() => handleAddElement('LOGO')}>
            <ImageIcon size={16} />
            <span>Emblem Logo</span>
          </button>

          <button className="toolbox-btn" onClick={() => handleAddElement('IMAGE', 'national_flag')}>
            <ImageIcon size={16} />
            <span>Decor Image/Flag</span>
          </button>

          <button className="toolbox-btn" onClick={() => handleAddElement('QR')}>
            <QrCode size={16} />
            <span>Audit QR Code</span>
          </button>

          <button className="toolbox-btn" onClick={() => handleAddElement('BARCODE')}>
            <BarcodeIcon size={16} />
            <span>ID Barcode</span>
          </button>

          <button className="toolbox-btn" onClick={() => handleAddElement('SIGNATURE')}>
            <FileSignature size={16} />
            <span>Authority Signature</span>
          </button>
        </div>

        {/* Center: Canvas Workspace Area */}
        <div className="designer-workspace">
          <div 
            ref={canvasRef}
            className="card-canvas"
            style={{ 
              backgroundImage: selectedSide === 'FRONT' 
                ? `url(${getAssetUrl(template?.front_background_image || '/assets/id_front_bg.png')})`
                : `url(${getAssetUrl(template?.back_background_image || '/assets/id_back_bg.png')})`,
              backgroundColor: '#edf2f7',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            {visibleElements.map((elem) => {
              const xPx = parseFloat(elem.x_position) * SCALE;
              const yPx = parseFloat(elem.y_position) * SCALE;
              const wPx = parseFloat(elem.width || 30) * SCALE;
              const hPx = parseFloat(elem.height || 10) * SCALE;
              const isSelected = elem.id === selectedElementId;

              return (
                <div
                  key={elem.id}
                  className={`canvas-element ${isSelected ? 'selected' : ''}`}
                  style={{
                    left: `${xPx}px`,
                    top: `${yPx}px`,
                    width: `${wPx}px`,
                    height: `${hPx}px`,
                    fontSize: `${(elem.font_size || 7) * 1.5}px`, // Scaled for designer canvas display
                    fontFamily: elem.font_family || 'var(--font-sans)',
                    fontWeight: elem.font_weight || 'normal',
                    backgroundColor: isSelected ? 'rgba(129, 140, 248, 0.1)' : 'rgba(255, 255, 255, 0.65)',
                    border: isSelected ? '2px solid var(--primary)' : '1px dashed #718096',
                    borderRadius: '4px',
                    color: elem.font_color || 'var(--text-h)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '2px',
                    overflow: 'hidden',
                    lineHeight: '1',
                    textAlign: 'center',
                    opacity: elem.is_visible ? 1 : 0.4
                  }}
                  onMouseDown={(e) => handleMouseDown(e, elem)}
                >
                  <span style={{ fontSize: '9px', color: 'var(--text-light)', fontWeight: 'normal', display: 'block', textTransform: 'uppercase' }}>
                    {elem.element_type}
                  </span>
                  <strong style={{ fontSize: '10px' }}>
                    {elem.element_type === 'TEXT' ? elem.field_name : elem.element_type}
                  </strong>
                </div>
              );
            })}
          </div>
          
          <div style={{ marginTop: '20px', display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-light)', fontSize: '13px' }}>
            <HelpCircle size={16} />
            <span>Select any element on the canvas to drag it around or adjust its styles.</span>
          </div>
        </div>

        {/* Right Side: Properties Inspector Panel */}
        <div className="designer-properties">
          {selectedElement ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '16px' }}>Inspector</h3>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '4px 8px', color: 'var(--danger)', fontSize: '12px' }}
                  onClick={() => handleRemoveElement(selectedElement.id)}
                >
                  Delete
                </button>
              </div>

              <div className="form-group">
                <span className="form-label" style={{ fontWeight: 'bold' }}>Type: {selectedElement.element_type}</span>
              </div>

              {selectedElement.element_type === 'TEXT' && (
                <div className="form-group">
                  <label className="form-label">Database Field Name</label>
                  <select 
                    className="form-control"
                    value={selectedElement.field_name}
                    onChange={(e) => updateSelectedElement('field_name', e.target.value)}
                  >
                    <option value="full_name">Full Name</option>
                    <option value="card_number">Card Number</option>
                    <option value="date_of_birth">Date of Birth</option>
                    <option value="gender">Gender/Sex</option>
                    <option value="nationality">Nationality</option>
                    <option value="occupation">Occupation</option>
                    <option value="woreda">Woreda</option>
                    <option value="kebele">Ketena</option>
                    <option value="address">Address</option>
                    <option value="phone_number">Phone Number</option>
                    <option value="blood_group">Blood Group</option>
                    <option value="emergency_contact_name">Emergency Contact Name</option>
                    <option value="emergency_contact_phone">Emergency Contact Phone</option>
                    <option value="date_issued">Date Issued</option>
                    <option value="expiry_date">Expiry Date</option>
                    
                    {/* Header labels */}
                    <option value="header_amharic">Header Label (Amharic)</option>
                    <option value="header_english">Header Label (English)</option>
                    <option value="disclaimer">Back ID Disclaimer</option>
                    <option value="sign_authority_text">Signature Role Text</option>
                  </select>
                </div>
              )}

              {/* Coordinates Grid */}
              <div className="grid-2" style={{ gap: '12px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">X Position (mm)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    className="form-control" 
                    value={selectedElement.x_position}
                    onChange={(e) => updateSelectedElement('x_position', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Y Position (mm)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    className="form-control" 
                    value={selectedElement.y_position}
                    onChange={(e) => updateSelectedElement('y_position', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Width (mm)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    className="form-control" 
                    value={selectedElement.width || 0}
                    onChange={(e) => updateSelectedElement('width', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Height (mm)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    className="form-control" 
                    value={selectedElement.height || 0}
                    onChange={(e) => updateSelectedElement('height', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Font settings for TEXT element */}
              {selectedElement.element_type === 'TEXT' && (
                <div>
                  <div className="form-group">
                    <label className="form-label">Font Size (pt)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={selectedElement.font_size || 7}
                      onChange={(e) => updateSelectedElement('font_size', parseInt(e.target.value) || 7)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Font Family</label>
                    <select 
                      className="form-control"
                      value={selectedElement.font_family || 'Inter'}
                      onChange={(e) => updateSelectedElement('font_family', e.target.value)}
                    >
                      <option value="Inter">Inter (Sans)</option>
                      <option value="Arial">Arial</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Georgia">Georgia</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Font Weight</label>
                    <select 
                      className="form-control"
                      value={selectedElement.font_weight || 'normal'}
                      onChange={(e) => updateSelectedElement('font_weight', e.target.value)}
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Font Color</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input 
                        type="color" 
                        className="form-control" 
                        style={{ width: '40px', height: '36px', padding: '2px', cursor: 'pointer' }}
                        value={selectedElement.font_color || '#1e293b'}
                        onChange={(e) => updateSelectedElement('font_color', e.target.value)}
                      />
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="#1e293b"
                        value={selectedElement.font_color || ''}
                        onChange={(e) => updateSelectedElement('font_color', e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '8px 12px' }}
                        onClick={() => updateSelectedElement('font_color', '')}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                <input 
                  type="checkbox" 
                  id="visibilityCheck"
                  checked={selectedElement.is_visible}
                  onChange={(e) => updateSelectedElement('is_visible', e.target.checked)}
                />
                <label htmlFor="visibilityCheck" className="form-label" style={{ margin: 0 }}>Visible on Card</label>
              </div>

            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-light)', fontSize: '14px' }}>
              No element selected. Select an item on the canvas to inspect or adjust its properties.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default TemplateDesigner;
