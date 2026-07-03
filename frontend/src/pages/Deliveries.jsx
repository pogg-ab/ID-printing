import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Plus, Eye, Printer, X, Truck, ArrowLeft } from 'lucide-react';

const Deliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [printedBatches, setPrintedBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [isPrintMode, setIsPrintMode] = useState(false);

  // Form State
  const [form, setForm] = useState({
    organization_id: '',
    print_batch_id: '',
    received_by: '',
    receiver_phone: '',
    remarks: ''
  });

  useEffect(() => {
    fetchDeliveries();
    loadOrgs();
  }, []);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const data = await api.deliveries.list();
      setDeliveries(data);
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
    setForm({ ...form, organization_id: orgId, print_batch_id: '' });
    if (orgId) {
      try {
        const batches = await api.batches.list({ organization_id: orgId, status: 'PRINTED' });
        setPrintedBatches(batches);
      } catch (err) {
        console.error(err);
      }
    } else {
      setPrintedBatches([]);
    }
  };

  const handleSaveDelivery = async (e) => {
    e.preventDefault();
    try {
      await api.deliveries.create(form);
      setIsModalOpen(false);
      setForm({ organization_id: '', print_batch_id: '', received_by: '', receiver_phone: '', remarks: '' });
      fetchDeliveries();
    } catch (err) {
      alert(err.message || "Failed to log delivery note");
    }
  };

  const handleViewDelivery = async (delivery) => {
    try {
      setLoading(true);
      const data = await api.deliveries.get(delivery.id);
      setSelectedDelivery(data);
    } catch (err) {
      alert("Failed to load delivery details");
    } finally {
      setLoading(false);
    }
  };

  const triggerPrintDelivery = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  if (isPrintMode && selectedDelivery) {
    return (
      <div className="print-page-area" style={{ background: '#edf2f7', minHeight: '100vh', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', fontFamily: 'sans-serif', color: 'black' }}>
        <style>{`
          @media print {
            body {
              background: white !important;
            }
            .print-page-area {
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              display: block !important;
            }
            .print-page-area > div:last-child {
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              width: 100% !important;
              min-height: auto !important;
            }
          }
        `}</style>

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
            <ArrowLeft size={14} /> Exit Print layout
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={14} /> Print Note
          </button>
        </div>

        {/* Official delivery note invoice design */}
        <div style={{ width: '210mm', minHeight: '297mm', padding: '20mm', backgroundColor: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', boxSizing: 'border-box', border: '1px solid #e2e8f0', textAlign: 'left' }}>
          <div style={{ borderBottom: '2px solid black', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '24px', margin: 0, textTransform: 'uppercase' }}>Delivery Note</h1>
              <span style={{ fontSize: '12px' }}>Dire Dawa Resident ID printing service</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 style={{ margin: 0 }}>Note #: {selectedDelivery.delivery_number}</h3>
              <span style={{ fontSize: '12px' }}>Date: {selectedDelivery.delivery_date}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px', fontSize: '13px' }}>
            <div>
              <strong>Organization:</strong>
              <p>{selectedDelivery.organization?.name}</p>
              <p>{selectedDelivery.organization?.address}</p>
            </div>
            <div>
              <strong>Receiver Information:</strong>
              <p>Name: {selectedDelivery.received_by}</p>
              <p>Phone: {selectedDelivery.receiver_phone || '-'}</p>
            </div>
          </div>

          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Delivered Cards List (Batch: {selectedDelivery.print_batch?.batch_number})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '40px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid black' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>#</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Card Number</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>FullName</th>
                <th style={{ textAlign: 'center', padding: '8px' }}>Delivered [ ✓ ]</th>
              </tr>
            </thead>
            <tbody>
              {selectedDelivery.delivery_items?.map((item, index) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px' }}>{index + 1}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{item.cardholder?.card_number}</td>
                  <td style={{ padding: '8px' }}>{item.cardholder?.full_name}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>[  ✓  ]</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signing fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '60px', fontSize: '13px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid black', width: '200px', margin: '0 auto 8px' }}></div>
              <p>Dispatched By (Sign/Stamp)</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid black', width: '200px', margin: '0 auto 8px' }}></div>
              <p>Received By (Sign/Stamp)</p>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className={`deliveries-grid-container ${selectedDelivery ? 'has-detail' : ''}`}>
      
      {/* Deliveries List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Log Dispatch Delivery
          </button>
        </div>

        <div className="table-panel">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Note Number</th>
                <th>Organization</th>
                <th>Received By</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-light)' }}>
                    No delivery notes recorded. Dispatch a printed batch to create one!
                  </td>
                </tr>
              ) : (
                deliveries.map(del => (
                  <tr 
                    key={del.id} 
                    style={{ cursor: 'pointer', backgroundColor: selectedDelivery?.id === del.id ? 'var(--primary-light)' : 'transparent' }}
                    onClick={() => handleViewDelivery(del)}
                  >
                    <td style={{ fontWeight: '600', color: 'var(--text-h)' }}>{del.delivery_number}</td>
                    <td>{del.organization?.name}</td>
                    <td>{del.received_by}</td>
                    <td>{new Date(del.delivery_date || del.created_at).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => handleViewDelivery(del)}>
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delivery Detail Panel */}
      {selectedDelivery && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <h3>Note Details: {selectedDelivery.delivery_number}</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                Date: {selectedDelivery.delivery_date}
              </span>
            </div>
            <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setSelectedDelivery(null)}>
              <X size={16} />
            </button>
          </div>

          <div style={{ marginBottom: '20px', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div><strong>Organization:</strong> {selectedDelivery.organization?.name}</div>
            <div><strong>Batch Number:</strong> {selectedDelivery.print_batch?.batch_number}</div>
            <div><strong>Received By:</strong> {selectedDelivery.received_by} ({selectedDelivery.receiver_phone || 'No phone'})</div>
            {selectedDelivery.remarks && <div><strong>Remarks:</strong> {selectedDelivery.remarks}</div>}
          </div>

          <button className="btn btn-primary" style={{ alignSelf: 'flex-start', marginBottom: '20px' }} onClick={triggerPrintDelivery}>
            <Printer size={14} /> Print Delivery Note
          </button>

          <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Items in Dispatch ({selectedDelivery.delivery_items?.length || 0} cards)</h4>
          <div className="table-panel" style={{ flex: 1, overflowY: 'auto', maxHeight: '300px' }}>
            <table className="custom-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Card Number</th>
                  <th>Full Name</th>
                  <th>Ketena</th>
                </tr>
              </thead>
              <tbody>
                {selectedDelivery.delivery_items?.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: '600' }}>{item.cardholder?.card_number}</td>
                    <td>{item.cardholder?.full_name}</td>
                    <td>{item.cardholder?.kebele || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Delivery Note Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justify: 'space-between', marginBottom: '20px' }}>
              <h3>Log Batch Dispatch Delivery</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-light)' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveDelivery}>
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
                <label className="form-label">Select Printed Batch</label>
                <select 
                  className="form-control" 
                  value={form.print_batch_id} 
                  onChange={(e) => setForm({ ...form, print_batch_id: e.target.value })} 
                  required
                  disabled={!form.organization_id}
                >
                  <option value="">Choose printed batch...</option>
                  {printedBatches.map(batch => (
                    <option key={batch.id} value={batch.id}>{batch.batch_number} ({batch.total_cards} cards)</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Received By (Name)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={form.received_by}
                    onChange={e => setForm({ ...form, received_by: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Receiver Phone</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={form.receiver_phone}
                    onChange={e => setForm({ ...form, receiver_phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Remarks / Courier Notes</label>
                <textarea 
                  className="form-control" 
                  value={form.remarks}
                  onChange={e => setForm({ ...form, remarks: e.target.value })}
                  rows="3"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!form.print_batch_id}>Log Dispatch</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Deliveries;
