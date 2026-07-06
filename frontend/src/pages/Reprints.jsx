import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, Check, X, Printer, Search } from 'lucide-react';
import { drawCardToCanvas } from '../utils/cardRenderer';

const Reprints = () => {
  const [reprints, setReprints] = useState([]);
  const [cardholders, setCardholders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [printingId, setPrintingId] = useState(null);
  
  // Form State
  const [form, setForm] = useState({
    cardholder_id: '',
    reason: '',
    date_issued: '',
    expiry_date: ''
  });

  const handleCardholderSelect = (chId) => {
    const selectedCh = cardholders.find(ch => ch.id === chId);
    if (selectedCh) {
      // Use original issue date if present, otherwise default to today
      const originalIssue = selectedCh.date_issued;
      const today = new Date().toISOString().split('T')[0];
      const issue = originalIssue || today;

      // Use original expiry date if present, otherwise default to today + 2 years
      const originalExpiry = selectedCh.expiry_date;
      const twoYearsLater = new Date();
      twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 2);
      const expiry = originalExpiry || twoYearsLater.toISOString().split('T')[0];

      setForm({
        ...form,
        cardholder_id: chId,
        date_issued: issue,
        expiry_date: expiry
      });
    } else {
      setForm({
        ...form,
        cardholder_id: '',
        date_issued: '',
        expiry_date: ''
      });
    }
  };

  useEffect(() => {
    fetchReprints();
  }, []);

  const fetchReprints = async () => {
    try {
      setLoading(true);
      const data = await api.reprints.list();
      setReprints(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search: Trigger cardholders list API as the user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setCardholders([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await api.cardholders.list({ search: searchQuery, per_page: 5 });
        setCardholders(response.data || []);
      } catch (err) {
        console.error(err);
      }
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleRequestReprint = async (e) => {
    e.preventDefault();
    if (!form.cardholder_id || !form.reason) {
      alert("Please select a resident and specify the reason.");
      return;
    }

    try {
      await api.reprints.create(
        form.cardholder_id, 
        form.reason, 
        form.date_issued || null, 
        form.expiry_date || null
      );
      setIsModalOpen(false);
      setForm({ cardholder_id: '', reason: '', date_issued: '', expiry_date: '' });
      setSearchQuery('');
      setCardholders([]);
      fetchReprints();
    } catch (err) {
      alert(err.message || "Failed to submit reprint request");
    }
  };

  const handleApprove = async (id) => {
    if (await window.confirm("Approve this reprint request?")) {
      try {
        await api.reprints.approve(id);
        fetchReprints();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleReject = async (id) => {
    if (await window.confirm("Reject this reprint request?")) {
      try {
        await api.reprints.reject(id);
        fetchReprints();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handlePrintReprint = async (rep) => {
    try {
      setPrintingId(rep.id);
      
      // 1. Fetch full cardholder details
      const fullCardholder = await api.cardholders.get(rep.cardholder_id);
      
      // 2. Fetch templates for this organization
      const templates = await api.templates.list(fullCardholder.organization_id);
      const activeTemplateSummary = templates.find(t => t.is_default && t.status === 'ACTIVE') || templates[0];
      
      if (!activeTemplateSummary) {
        throw new Error("No active card template found for this organization.");
      }
      
      // 3. Fetch full active template elements
      const fullTemplate = await api.templates.get(activeTemplateSummary.id);
      
      // 4. Draw card sides to canvas
      const frontCanvas = document.createElement('canvas');
      const backCanvas = document.createElement('canvas');
      const frontUrl = await drawCardToCanvas(frontCanvas, fullCardholder, fullTemplate, 'FRONT', 300);
      const backUrl = await drawCardToCanvas(backCanvas, fullCardholder, fullTemplate, 'BACK', 300);

      // 5. Open new window for print
      const printWin = window.open('', '_blank');
      if (!printWin) {
        alert("Please enable popups to allow print window to open.");
        return;
      }

      printWin.document.write(`
        <html>
        <head>
          <title>${fullCardholder.full_name} ID Card PDF</title>
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
            <p>Generated by Dire Dawa Resident ID printing service • ID: ${fullCardholder.card_number}</p>
          </div>
          <div class="cards-container">
            <div>
              <div style="font-size:10px; text-transform:uppercase; margin-bottom:4px;">Front Side</div>
              <div class="card-wrapper"><img src="${frontUrl}" /></div>
            </div>
            <div>
              <div style="font-size:10px; text-transform:uppercase; margin-bottom:4px;">Back Side</div>
              <div class="card-wrapper"><img src="${backUrl}" /></div>
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

      // 6. Prompt user to confirm print success before marking as printed on backend
      setTimeout(async () => {
        if (window.confirm("Did the ID card print successfully? Click OK to mark this request as PRINTED.")) {
          try {
            await api.reprints.markPrinted(rep.id);
            fetchReprints();
          } catch (err) {
            alert("Failed to update status: " + err.message);
          }
        }
      }, 1000);

    } catch (err) {
      alert("Failed to render card for print: " + err.message);
    } finally {
      setPrintingId(null);
    }
  };

  if (loading && reprints.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading reprint requests...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Request Reprint
        </button>
      </div>

      <div className="table-panel">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Card Number</th>
              <th>Resident Name</th>
              <th>Organization</th>
              <th>Reason for Reprint</th>
              <th>Issue Date</th>
              <th>Expiry Date</th>
              <th>Requested At</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reprints.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-light)' }}>
                  No reprint requests logged. Click "Request Reprint" to submit one.
                </td>
              </tr>
            ) : (
              reprints.map(rep => (
                <tr key={rep.id}>
                  <td style={{ fontWeight: '600', color: 'var(--text-h)' }}>{rep.cardholder?.card_number}</td>
                  <td>{rep.cardholder?.full_name}</td>
                  <td>{rep.cardholder?.organization?.name}</td>
                  <td>{rep.reason}</td>
                  <td>{rep.cardholder?.date_issued ? new Date(rep.cardholder.date_issued + 'T00:00:00').toLocaleDateString() : '-'}</td>
                  <td>{rep.cardholder?.expiry_date ? new Date(rep.cardholder.expiry_date + 'T00:00:00').toLocaleDateString() : '-'}</td>
                  <td>{new Date(rep.requested_at || rep.created_at).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge badge-${rep.status.toLowerCase()}`}>{rep.status}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {rep.status === 'PENDING' && (
                        <>
                          <button className="btn btn-success" style={{ padding: '6px' }} onClick={() => handleApprove(rep.id)} title="Approve Request">
                            <Check size={14} />
                          </button>
                          <button className="btn btn-danger" style={{ padding: '6px' }} onClick={() => handleReject(rep.id)} title="Reject Request">
                            <X size={14} />
                          </button>
                        </>
                      )}
                      {rep.status === 'APPROVED' && (
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }} 
                          onClick={() => handlePrintReprint(rep)}
                          disabled={printingId === rep.id}
                        >
                          <Printer size={12} /> {printingId === rep.id ? 'Preparing...' : 'Print'}
                        </button>
                      )}
                      {(rep.status === 'REJECTED' || rep.status === 'PRINTED') && (
                        <span style={{ color: 'var(--text-light)', fontSize: '12px' }}>Locked</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Request Reprint Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justify: 'space-between', marginBottom: '20px' }}>
              <h3>Submit Reprint Request</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-light)' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRequestReprint}>
              
              <div className="form-group">
                <label className="form-label">Search Resident Name/Card No</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Enter name or card number..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {cardholders.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Select Resident</label>
                  <select 
                    className="form-control" 
                    value={form.cardholder_id}
                    onChange={e => handleCardholderSelect(e.target.value)}
                    required
                  >
                    <option value="">Choose resident...</option>
                    {cardholders.map(ch => (
                      <option key={ch.id} value={ch.id}>{ch.full_name} ({ch.card_number}) - Ketena {ch.kebele}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Reason for Reprint</label>
                <select 
                  className="form-control"
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  required
                >
                  <option value="">Select reason...</option>
                  <option value="Lost Card">Lost Card</option>
                  <option value="Stolen Card">Stolen Card</option>
                  <option value="Damaged Card">Damaged/Defective Card</option>
                  <option value="Name/Information Change">Name/Information Correction</option>
                  <option value="Renewal">Expiry Renewal</option>
                </select>
              </div>

              {form.cardholder_id && (
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">New Issue Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={form.date_issued}
                      onChange={e => setForm({ ...form, date_issued: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Expiry Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={form.expiry_date}
                      onChange={e => setForm({ ...form, expiry_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!form.cardholder_id}>Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reprints;
