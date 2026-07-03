import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Plus, Printer, Check, X, FileText, ArrowLeft, Eye, Download } from 'lucide-react';
import { drawCardToCanvas } from '../utils/cardRenderer';

const SecurityOverlay = () => (
  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.15 }}>
    <path d="M0,20 Q100,5 200,20 T400,20 T600,20 T800,20" fill="none" stroke="#6b7280" strokeWidth="0.5" />
    <path d="M0,40 Q100,25 200,40 T400,40 T600,40 T800,40" fill="none" stroke="#6b7280" strokeWidth="0.5" />
    <path d="M0,60 Q100,45 200,60 T400,60 T600,60 T800,60" fill="none" stroke="#6b7280" strokeWidth="0.5" />
    <circle cx="50%" cy="50%" r="40" fill="none" stroke="#6b7280" strokeWidth="0.3" strokeDasharray="2,2" />
    <circle cx="50%" cy="50%" r="80" fill="none" stroke="#6b7280" strokeWidth="0.3" />
  </svg>
);

const PrintBatches = () => {
  const [batches, setBatches] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [cardholders, setCardholders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Row-level checkbox selection for export
  const [selectedBatchIds, setSelectedBatchIds] = useState(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [printSheetType, setPrintSheetType] = useState('FRONTS'); // FRONTS or BACKS

  // Preview states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewCardholder, setPreviewCardholder] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [previewSide, setPreviewSide] = useState('FRONT');
  const [isRendering, setIsRendering] = useState(false);
  const [renderCache, setRenderCache] = useState({}); // Cache drawn data URLs by resident_side key
  
  const modalCanvasRef = useRef(null);

  const handleOpenPreview = async (cardholder) => {
    if (!selectedBatch?.card_template) return;
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

      // Fetch full template settings with elements
      const fullTemplate = await api.templates.get(selectedBatch.card_template.id);
      
      setPreviewTemplate(fullTemplate);
      setPreviewCardholder(cardholder);
      setPreviewSide('FRONT');
      setIsPreviewOpen(true);
      
      setTimeout(() => {
        triggerCanvasRender(cardholder, fullTemplate, 'FRONT');
      }, 150);
    } catch (err) {
      alert("Failed to load template elements: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const triggerCanvasRender = async (cardholder, template, side) => {
    if (!cardholder || !template) return;
    
    const cacheKey = `${cardholder.id}_${side}`;
    if (renderCache[cacheKey]) {
      return; // Use cached data URL directly in image tag
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
          console.error(err);
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
      link.download = `${previewCardholder.full_name.replace(/\s+/g, '_')}_${previewSide}_${isHighRes ? 'HighRes' : 'Standard'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsRendering(false);
    }
  };

  const handleExportPDF = async () => {
    if (!previewCardholder || !previewTemplate) return;
    try {
      setIsRendering(true);
      const frontCanvas = document.createElement('canvas');
      const backCanvas = document.createElement('canvas');
      
      const frontUrl = await drawCardToCanvas(frontCanvas, previewCardholder, previewTemplate, 'FRONT', 300);
      const backUrl = await drawCardToCanvas(backCanvas, previewCardholder, previewTemplate, 'BACK', 300);

      const printWin = window.open('', '_blank');
      if (!printWin) {
        alert("Please enable popups for exporting PDF files");
        return;
      }

      printWin.document.write(`
        <html>
        <head>
          <title>\${previewCardholder.full_name} ID Card PDF</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            body {
              font-family: sans-serif;
              color: #1e293b;
              text-align: center;
              padding: 10px;
            }
            .title-header {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 8px;
              margin-bottom: 20px;
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
              width: 86.4mm;
              height: 53.3mm;
            }
            .card-wrapper img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px;">
            <button onclick="window.print()" style="padding: 8px 16px; font-weight: bold; cursor: pointer; background-color: #4f46e5; color: white; border: none; border-radius: 6px;">Print / Save to PDF</button>
            <button onclick="window.close()" style="padding: 8px 16px; font-weight: bold; cursor: pointer; margin-left: 10px; background-color: #64748b; color: white; border: none; border-radius: 6px;">Close</button>
          </div>
          <div class="title-header">
            <h2>Resident ID Card Document</h2>
            <p>Generated by Dire Dawa Resident ID printing service</p>
          </div>
          <div class="cards-container">
            <div>
              <div style="font-size:10px; text-transform:uppercase; margin-bottom:4px;">Front Side</div>
              <div class="card-wrapper"><img src="\${frontUrl}" /></div>
            </div>
            <div>
              <div style="font-size:10px; text-transform:uppercase; margin-bottom:4px;">Back Side</div>
              <div class="card-wrapper"><img src="\${backUrl}" /></div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 500);
            }
          </script>
        </body>
        </html>
      `);
      printWin.document.close();
    } catch (err) {
      alert("Export failed: " + err.message);
    } finally {
      setIsRendering(false);
    }
  };

  // ── CSV helpers ────────────────────────────────────────────────────────────
  const exportToCSV = (filename, headers, rows) => {
    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(cell => {
        const val = cell === null || cell === undefined ? '' : String(cell);
        return `"${val.replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\r\n');
    // UTF-8 BOM ensures Amharic characters open correctly in Excel
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle a single batch row checkbox
  const handleToggleBatchSelect = (e, batchId) => {
    e.stopPropagation();
    setSelectedBatchIds(prev => {
      const next = new Set(prev);
      next.has(batchId) ? next.delete(batchId) : next.add(batchId);
      return next;
    });
  };

  // Toggle select-all checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedBatchIds(new Set(batches.map(b => b.id)));
    } else {
      setSelectedBatchIds(new Set());
    }
  };

  // Export full cardholder details for every checked batch
  const handleExportSelectedCSV = async () => {
    if (selectedBatchIds.size === 0) return;
    try {
      setIsExporting(true);

      const headers = [
        'Batch Number', 'Batch Status', 'Template',
        'Card Number', 'Full Name', 'Gender', 'Date of Birth',
        'Nationality', 'Occupation', 'Address', 'Woreda', 'Kebele',
        'Phone Number', 'Emergency Contact Name', 'Emergency Contact Phone',
        'Blood Group', 'Date Issued', 'Expiry Date',
        'Print Status', 'Printed At'
      ];

      const rows = [];

      for (const batchId of selectedBatchIds) {
        // Fetch full batch detail (includes cardholder data)
        const detail = await api.batches.get(batchId);
        const batchNum = detail.batch_number;
        const batchStatus = detail.status;
        const templateName = detail.card_template?.name || 'N/A';

        const cards = detail.print_batch_cards || [];
        for (const bc of cards) {
          const ch = bc.cardholder || {};
          rows.push([
            batchNum,
            batchStatus,
            templateName,
            ch.card_number || '',
            ch.full_name || '',
            ch.gender || '',
            ch.date_of_birth || '',
            ch.nationality || '',
            ch.occupation || '',
            ch.address || '',
            ch.woreda || '',
            ch.kebele || '',
            ch.phone_number || '',
            ch.emergency_contact_name || '',
            ch.emergency_contact_phone || '',
            ch.blood_group || '',
            ch.date_issued || '',
            ch.expiry_date || '',
            bc.print_status || '',
            bc.printed_at ? new Date(bc.printed_at).toLocaleString() : 'N/A'
          ]);
        }
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const batchCount = selectedBatchIds.size;
      exportToCSV(
        `selected_batches_${batchCount}_export_${dateStr}.csv`,
        headers,
        rows
      );
    } catch (err) {
      alert('Export failed: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Export full cardholder details for the currently-viewed batch (detail panel)
  const handleExportBatchCardsCSV = () => {
    if (!selectedBatch) return;
    const headers = [
      'Batch Number', 'Batch Status', 'Template',
      'Card Number', 'Full Name', 'Gender', 'Date of Birth',
      'Nationality', 'Occupation', 'Address', 'Woreda', 'Kebele',
      'Phone Number', 'Emergency Contact Name', 'Emergency Contact Phone',
      'Blood Group', 'Date Issued', 'Expiry Date',
      'Print Status', 'Printed At'
    ];
    const cards = selectedBatch.print_batch_cards || [];
    const rows = cards.map(bc => {
      const ch = bc.cardholder || {};
      return [
        selectedBatch.batch_number,
        selectedBatch.status,
        selectedBatch.card_template?.name || 'N/A',
        ch.card_number || '',
        ch.full_name || '',
        ch.gender || '',
        ch.date_of_birth || '',
        ch.nationality || '',
        ch.occupation || '',
        ch.address || '',
        ch.woreda || '',
        ch.kebele || '',
        ch.phone_number || '',
        ch.emergency_contact_name || '',
        ch.emergency_contact_phone || '',
        ch.blood_group || '',
        ch.date_issued || '',
        ch.expiry_date || '',
        bc.print_status || '',
        bc.printed_at ? new Date(bc.printed_at).toLocaleString() : 'N/A'
      ];
    });
    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCSV(`batch_${selectedBatch.batch_number}_full_details_${dateStr}.csv`, headers, rows);
  };

  // Form bindings
  const [form, setForm] = useState({
    organization_id: '',
    card_template_id: '',
    cardholder_ids: []
  });

  useEffect(() => {
    loadBatches();
    loadOrgs();
  }, []);

  // Auto-trigger window.print() once print mode is active and all card faces are pre-rendered in cache
  useEffect(() => {
    if (isPrintMode && selectedBatch) {
      const cards = selectedBatch.print_batch_cards || [];
      const allCached = cards.every(bc => {
        const ch = bc.cardholder;
        if (!ch) return true;
        const frontKey = `${ch.id}_FRONT`;
        const backKey = `${ch.id}_BACK`;
        return renderCache[frontKey] && renderCache[backKey];
      });

      if (allCached) {
        const timer = setTimeout(() => {
          window.print();
          if (selectedBatch.status === 'APPROVED') {
            if (window.confirm("Did the batch print successfully? Click OK to mark it as PRINTED.")) {
              api.batches.updateStatus(selectedBatch.id, 'PRINTED').then(() => {
                loadBatches();
              });
            }
          }
        }, 800); // 800ms gives browser time to render the image tags fully
        return () => clearTimeout(timer);
      }
    }
  }, [isPrintMode, renderCache, selectedBatch]);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const data = await api.batches.list();
      setBatches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrgs = async () => {
    try {
      const orgs = await api.organizations.list();
      setOrganizations(orgs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOrgChange = async (orgId) => {
    setForm({ ...form, organization_id: orgId, card_template_id: '', cardholder_ids: [] });
    if (orgId) {
      try {
        const temps = await api.templates.list(orgId);
        setTemplates(temps);

        const residents = await api.cardholders.list({ organization_id: orgId, per_page: 100 });
        setCardholders(residents.data || []);
      } catch (err) {
        console.error(err);
      }
    } else {
      setTemplates([]);
      setCardholders([]);
    }
  };

  const handleToggleCardholder = (id) => {
    const ids = [...form.cardholder_ids];
    if (ids.includes(id)) {
      setForm({ ...form, cardholder_ids: ids.filter(x => x !== id) });
    } else {
      setForm({ ...form, cardholder_ids: [...ids, id] });
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (form.cardholder_ids.length === 0) {
      alert("Please select at least one cardholder for the batch.");
      return;
    }

    try {
      await api.batches.create(form);
      setIsModalOpen(false);
      loadBatches();
    } catch (err) {
      alert(err.message || "Failed to create print batch");
    }
  };

  const handleUpdateStatus = async (id, status) => {
    if (await window.confirm(`Move batch status to ${status}?`)) {
      try {
        await api.batches.updateStatus(id, status);
        loadBatches();
        if (selectedBatch && selectedBatch.id === id) {
          const detail = await api.batches.get(id);
          setSelectedBatch(detail);
        }
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleViewBatch = async (batch) => {
    try {
      setLoading(true);
      const detail = await api.batches.get(batch.id);
      setSelectedBatch(detail);
    } catch (err) {
      alert("Failed to load batch cards details");
    } finally {
      setLoading(false);
    }
  };

  const triggerPrintLayout = async () => {
    if (!selectedBatch) return;
    try {
      setIsRendering(true);
      
      // 1. Fetch full template elements
      const fullTemplate = await api.templates.get(selectedBatch.card_template.id);
      
      const cards = selectedBatch.print_batch_cards || [];
      const tempCanvas = document.createElement('canvas');
      const newCache = {};
      
      // 2. Loop through all cards and render Front/Back if not cached
      for (let i = 0; i < cards.length; i++) {
        const ch = cards[i].cardholder;
        if (!ch) continue;
        
        const frontKey = `${ch.id}_FRONT`;
        const backKey = `${ch.id}_BACK`;
        
        if (!renderCache[frontKey] && !newCache[frontKey]) {
          const frontUrl = await drawCardToCanvas(tempCanvas, ch, fullTemplate, 'FRONT', 300);
          newCache[frontKey] = frontUrl;
        }
        
        if (!renderCache[backKey] && !newCache[backKey]) {
          const backUrl = await drawCardToCanvas(tempCanvas, ch, fullTemplate, 'BACK', 300);
          newCache[backKey] = backUrl;
        }
      }
      
      if (Object.keys(newCache).length > 0) {
        setRenderCache(prev => ({ ...prev, ...newCache }));
      }
      
      // 3. Set print mode (useEffect will auto-trigger print when renderCache finishes updating)
      setIsPrintMode(true);
      
    } catch (err) {
      alert("Failed to prepare print layout: " + err.message);
    } finally {
      setIsRendering(false);
    }
  };

  if (isPrintMode && selectedBatch) {
    const cards = selectedBatch.print_batch_cards || [];

    // Chunk cards into groups of 5 for A4 pages
    const pages = [];
    for (let i = 0; i < cards.length; i += 5) {
      pages.push(cards.slice(i, i + 5));
    }

    return (
      <div className="print-page-area" style={{ background: '#edf2f7', minHeight: '100vh', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'center',
            gap: '12px', 
            zIndex: 100, 
            background: 'var(--panel)', 
            padding: '12px 24px', 
            borderRadius: 'var(--radius-md)', 
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border)',
            margin: '0 auto 24px auto',
            width: 'fit-content'
          }} 
          className="no-print"
        >
          <button className="btn btn-secondary" onClick={() => setIsPrintMode(false)}>
            <ArrowLeft size={14} /> Exit Print Layout
          </button>
          <button 
            className={`btn ${printSheetType === 'FRONTS' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setPrintSheetType('FRONTS'); setTimeout(() => window.print(), 300); }}
          >
            Print Front Sheets (A4 Grid)
          </button>
          <button 
            className={`btn ${printSheetType === 'BACKS' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setPrintSheetType('BACKS'); setTimeout(() => window.print(), 300); }}
          >
            Print Back Sheets (A4 Mirrored)
          </button>
          <button 
            className={`btn ${printSheetType === 'BOTH' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setPrintSheetType('BOTH'); setTimeout(() => window.print(), 300); }}
          >
            Print Both Sides (Side-by-Side)
          </button>
        </div>

        {pages.map((pageCards, pageIdx) => {
          let orderedCards = [];
          if (printSheetType === 'BOTH') {
            pageCards.forEach(bc => {
              if (bc) {
                orderedCards.push({ bc, side: 'FRONT', key: `${bc.id}_FRONT` });
                orderedCards.push({ bc, side: 'BACK', key: `${bc.id}_BACK` });
              }
            });
            while (orderedCards.length < 10) {
              orderedCards.push(null);
            }
          } else if (printSheetType === 'FRONTS') {
            pageCards.forEach(bc => {
              if (bc) {
                orderedCards.push({ bc, side: 'FRONT', key: `${bc.id}_FRONT` });
              }
            });
            while (orderedCards.length < 5) {
              orderedCards.push(null);
            }
          } else {
            // Mirrored mapping for double-sided sheet alignment
            const mapIndexBack = (idx) => {
              if (idx === 0) return pageCards[1] || null;
              if (idx === 1) return pageCards[0] || null;
              if (idx === 2) return pageCards[3] || null;
              if (idx === 3) return pageCards[2] || null;
              if (idx === 4) return null; // 5th card left slot is empty
              if (idx === 5) return pageCards[4] || null; // 5th card goes to right slot
              return null;
            };
            for (let k = 0; k < 6; k++) {
              const bc = mapIndexBack(k);
              if (bc) {
                orderedCards.push({ bc, side: 'BACK', key: `${bc.id}_BACK` });
              } else {
                orderedCards.push(null);
              }
            }
          }

          return (
            <div 
              key={pageIdx} 
              style={{ 
                width: '210mm', 
                height: '297mm', 
                padding: printSheetType === 'BOTH' ? '4mm 10mm' : '15mm 10mm',
                boxSizing: 'border-box',
                pageBreakAfter: 'always', 
                breakAfter: 'page', 
                backgroundColor: 'white',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gridGap: printSheetType === 'BOTH' ? '1.5mm 8mm' : '12mm 8mm',
                justifyContent: 'center',
                justifyItems: 'center',
                alignContent: 'center',
                margin: '0 auto',
                position: 'relative'
              }}
            >
              {orderedCards.map((cardObj, cardIdx) => {
                if (!cardObj) {
                  return <div key={`empty-${cardIdx}`} style={{ width: '86.4mm', height: '53.3mm' }} />;
                }

                const { bc, side, key } = cardObj;
                const ch = bc.cardholder;
                const cacheKey = `${ch.id}_${side}`;
                const cardDataUrl = renderCache[cacheKey];

                return (
                  <div 
                    key={key} 
                    style={{ 
                      width: '86.4mm', 
                      height: '53.3mm', 
                      position: 'relative',
                      border: '0.1mm dashed #aaa', 
                      backgroundColor: 'white',
                      overflow: 'hidden',
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid'
                    }}
                  >
                    {cardDataUrl ? (
                      <img src={cardDataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justify: 'center', height: '100%', fontSize: '12px', color: '#888' }}>
                        Rendering card face...
                      </div>
                    )}
                    {side === 'FRONT' && <SecurityOverlay />}

                    {/* Crop Mark Corners Ticks */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '2mm', height: '2mm', borderTop: '0.2mm solid #000', borderLeft: '0.2mm solid #000' }} />
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '2mm', height: '2mm', borderTop: '0.2mm solid #000', borderRight: '0.2mm solid #000' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '2mm', height: '2mm', borderBottom: '0.2mm solid #000', borderLeft: '0.2mm solid #000' }} />
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: '2mm', height: '2mm', borderBottom: '0.2mm solid #000', borderRight: '0.2mm solid #000' }} />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  if (isRendering && !isPrintMode) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', background: 'var(--bg-main)' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--primary-light)', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ fontWeight: '600', color: 'var(--text-h)' }}>Preparing high-resolution print sheets...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }


  return (
    <div className={`batches-grid-container ${selectedBatch ? 'has-detail' : ''}`}>
      
      {/* Batches Queue */}
      <div>
        {/* Toolbar: shows Export Selected only when rows are checked */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {selectedBatchIds.size > 0 && (
              <>
                <span style={{ fontSize: '13px', color: 'var(--text-light)', fontWeight: '500' }}>
                  {selectedBatchIds.size} batch{selectedBatchIds.size > 1 ? 'es' : ''} selected
                </span>
                <button
                  className="btn btn-primary"
                  onClick={handleExportSelectedCSV}
                  disabled={isExporting}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Download size={15} />
                  {isExporting ? 'Exporting...' : `Export Selected (Full Details)`}
                </button>
              </>
            )}
          </div>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Create Print Batch
          </button>
        </div>

        <div className="table-panel">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '36px' }}>
                  <input
                    type="checkbox"
                    title="Select all batches"
                    checked={batches.length > 0 && selectedBatchIds.size === batches.length}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                  />
                </th>
                <th>Batch Number</th>
                <th>Template</th>
                <th>Total Cards</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(batch => (
                <tr
                  key={batch.id}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: selectedBatch?.id === batch.id
                      ? 'var(--primary-light)'
                      : selectedBatchIds.has(batch.id)
                        ? 'rgba(99,102,241,0.06)'
                        : 'transparent'
                  }}
                  onClick={() => handleViewBatch(batch)}
                >
                  <td onClick={e => e.stopPropagation()} style={{ verticalAlign: 'middle' }}>
                    <input
                      type="checkbox"
                      checked={selectedBatchIds.has(batch.id)}
                      onChange={e => handleToggleBatchSelect(e, batch.id)}
                      style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                    />
                  </td>
                  <td style={{ fontWeight: '600', color: 'var(--text-h)' }}>{batch.batch_number}</td>
                  <td>{batch.card_template?.name}</td>
                  <td>{batch.total_cards}</td>
                  <td>
                    <span className={`badge badge-${batch.status.toLowerCase()}`}>{batch.status}</span>
                  </td>
                  <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleViewBatch(batch)}>
                      View Queue
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Cards Detail Panel */}
      {selectedBatch && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <h3>Batch Detail: {selectedBatch.batch_number}</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                Template: {selectedBatch.card_template?.name}
              </span>
            </div>
            <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setSelectedBatch(null)}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {selectedBatch.status === 'DRAFT' && (
              <button className="btn btn-success" onClick={() => handleUpdateStatus(selectedBatch.id, 'APPROVED')}>
                <Check size={14} /> Approve Batch
              </button>
            )}

            {(selectedBatch.status === 'APPROVED' || selectedBatch.status === 'PRINTED') && (
              <button className="btn btn-primary" onClick={triggerPrintLayout}>
                <Printer size={14} /> Print A4 Layout (5/Page)
              </button>
            )}

            <button
              className="btn btn-secondary"
              onClick={handleExportBatchCardsCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              title={`Export all ${selectedBatch.total_cards} cardholder details for ${selectedBatch.batch_number}`}
            >
              <Download size={14} /> Export Batch Details CSV
            </button>

            {selectedBatch.status === 'PRINTED' && (
              <span style={{ color: 'var(--text-light)', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                Batch printed. Ready for Delivery note.
              </span>
            )}
          </div>

          <div className="table-panel" style={{ flex: 1, overflowY: 'auto', maxHeight: '450px' }}>
            <table className="custom-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Card Number</th>
                  <th>Full Name</th>
                  <th>Print Status</th>
                  <th style={{ textAlign: 'right' }}>Preview</th>
                </tr>
              </thead>
              <tbody>
                {selectedBatch.print_batch_cards?.map(bc => (
                  <tr key={bc.id}>
                    <td style={{ fontWeight: '600' }}>{bc.cardholder?.card_number}</td>
                    <td>{bc.cardholder?.full_name}</td>
                    <td>
                      <span className={`badge badge-${bc.print_status.toLowerCase()}`}>{bc.print_status}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '4px 8px', fontSize: '12px' }} 
                        onClick={() => handleOpenPreview(bc.cardholder)}
                      >
                        <Eye size={12} /> Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Batch Dialog Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div style={{ display: 'flex', justify: 'space-between', marginBottom: '20px' }}>
              <h3>Create New Print Batch</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-light)' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateBatch}>
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
                <label className="form-label">Active Template</label>
                <select 
                  className="form-control" 
                  value={form.card_template_id} 
                  onChange={(e) => setForm({ ...form, card_template_id: e.target.value })} 
                  required
                  disabled={!form.organization_id}
                >
                  <option value="">Select Card Template...</option>
                  {templates.map(temp => (
                    <option key={temp.id} value={temp.id}>{temp.name} {temp.is_default ? '(Default)' : ''}</option>
                  ))}
                </select>
              </div>

              {form.organization_id && (
                <div className="form-group">
                  <label className="form-label">Select Cardholders ({form.cardholder_ids.length} selected)</label>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', maxHeight: '250px', overflowY: 'auto', padding: '8px' }}>
                    {cardholders.length === 0 ? (
                      <div style={{ color: 'var(--text-light)', padding: '12px', textAlign: 'center' }}>No cardholders available for this organization.</div>
                    ) : (
                      cardholders.map(ch => (
                        <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderBottom: '1px solid var(--border-light)' }}>
                          <input 
                            type="checkbox" 
                            id={`ch-${ch.id}`}
                            checked={form.cardholder_ids.includes(ch.id)}
                            onChange={() => handleToggleCardholder(ch.id)}
                          />
                          <label htmlFor={`ch-${ch.id}`} style={{ cursor: 'pointer', fontSize: '13px', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>{ch.full_name} ({ch.card_number})</span>
                            <span style={{ color: 'var(--text-light)' }}>Ketena {ch.kebele || '-'}</span>
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Batch</button>
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
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr 1fr', 
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

export default PrintBatches;
