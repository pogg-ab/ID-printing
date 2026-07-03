import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FileText, Printer, BarChart3, TrendingUp, CheckCircle, Clock } from 'lucide-react';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('PRINT'); // PRINT, DELIVERY, REPRINT, ORG
  const [loading, setLoading] = useState(false);

  // Report Data
  const [printData, setPrintData] = useState([]);
  const [deliveryData, setDeliveryData] = useState([]);
  const [reprintData, setReprintData] = useState([]);
  const [orgSummary, setOrgSummary] = useState([]);

  // Fetch all report data datasets on mount to make calculations dynamic
  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      setLoading(true);
      // Fetch all datasets concurrently
      const [batches, deliveries, reprints, orgs] = await Promise.all([
        api.batches.list(),
        api.deliveries.list(),
        api.reprints.list(),
        api.organizations.list()
      ]);

      // Process printed/delivered batches
      const list = batches
        .filter(b => b.status === 'PRINTED' || b.status === 'DELIVERED')
        .map(b => ({
          date: new Date(b.updated_at || b.created_at).toLocaleDateString(),
          batchNo: b.batch_number,
          orgName: b.card_template?.organization?.name || b.organization?.name || 'Dire Dawa',
          count: b.total_cards,
        }));

      setPrintData(list);
      setDeliveryData(deliveries);
      setReprintData(reprints);
      setOrgSummary(orgs);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintSummary = () => {
    window.print();
  };

  // Dynamic calculated metrics for top stat cards
  const totalPrinted = printData.reduce((sum, b) => sum + (b.count || 0), 0);
  const totalDispatched = deliveryData.reduce((sum, d) => sum + (d.print_batch?.total_cards || 0), 0);
  const pendingReprints = reprintData.filter(r => r.status === 'PENDING').length;
  const approvedReprints = reprintData.filter(r => r.status === 'APPROVED' || r.status === 'PRINTED').length;

  // Print Success Rate = (Total Printed - Approved Reprints) / Total Printed
  const successRate = totalPrinted > 0
    ? Math.max(0, Math.min(100, ((totalPrinted - approvedReprints) / totalPrinted) * 100)).toFixed(1)
    : "100.0";

  return (
    <div>
      {/* Upper Cards */}
      <div className="card-grid" style={{ marginBottom: '24px' }}>
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-light)' }}>Print Success Rate</span>
            <div className="stat-val" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{successRate}%</span>
              <TrendingUp size={16} style={{ color: 'var(--success)' }} />
            </div>
          </div>
          <div className="stat-icon"><BarChart3 size={20} /></div>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-light)' }}>Total Dispatched</span>
            <div className="stat-val" style={{ color: 'var(--success)' }}>{totalDispatched.toLocaleString()}</div>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}><CheckCircle size={20} /></div>
        </div>

        <div className="card stat-card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div>
            <span style={{ fontSize: '13px', color: 'var(--text-light)' }}>Pending Reprint Approvals</span>
            <div className="stat-val" style={{ color: 'var(--warning)' }}>{pendingReprints}</div>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}><Clock size={20} /></div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="card" style={{ padding: '12px', marginBottom: '24px' }}>
        <div className="toggle-tabs" style={{ margin: 0 }}>
          <div className={`toggle-tab ${activeTab === 'PRINT' ? 'active' : ''}`} onClick={() => setActiveTab('PRINT')}>
            Printed Cards Report
          </div>
          <div className={`toggle-tab ${activeTab === 'DELIVERY' ? 'active' : ''}`} onClick={() => setActiveTab('DELIVERY')}>
            Delivered Cards Report
          </div>
          <div className={`toggle-tab ${activeTab === 'REPRINT' ? 'active' : ''}`} onClick={() => setActiveTab('REPRINT')}>
            Reprint Summary
          </div>
          <div className={`toggle-tab ${activeTab === 'ORG' ? 'active' : ''}`} onClick={() => setActiveTab('ORG')}>
            Organization Summary
          </div>
        </div>
      </div>

      {/* Reports Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={handlePrintSummary}>
          <Printer size={16} /> Print Report Summary
        </button>
      </div>

      {/* Report Table display */}
      <div className="table-panel print-page-area">
        <div className="table-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} style={{ color: 'var(--primary)' }} />
            {activeTab === 'PRINT' && "Printed Cards Registry Log"}
            {activeTab === 'DELIVERY' && "Delivered Cards Registry Log"}
            {activeTab === 'REPRINT' && "Reprint Logs & Reason Distribution"}
            {activeTab === 'ORG' && "Organization summary Activity metrics"}
          </h3>
        </div>

        <div className="table-container">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>Generating report data...</div>
          ) : (
            <>
              {activeTab === 'PRINT' && (
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Date Printed</th>
                      <th>Batch Number</th>
                      <th>Organization</th>
                      <th>Cards Printed</th>
                      <th>Operator</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printData.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-light)' }}>No print logs found for printed batches.</td>
                      </tr>
                    ) : (
                      printData.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: '500' }}>{row.date}</td>
                          <td style={{ fontFamily: 'monospace' }}>{row.batchNo}</td>
                          <td>{row.orgName}</td>
                          <td style={{ fontWeight: 'bold' }}>{row.count}</td>
                          <td>System Admin</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'DELIVERY' && (
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Dispatch Number</th>
                      <th>Organization</th>
                      <th>Delivery Date</th>
                      <th>Receiver Name</th>
                      <th>Phone</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryData.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-light)' }}>No dispatch deliveries found.</td>
                      </tr>
                    ) : (
                      deliveryData.map(row => (
                        <tr key={row.id}>
                          <td style={{ fontWeight: '600' }}>{row.delivery_number}</td>
                          <td>{row.organization?.name}</td>
                          <td>{new Date(row.delivery_date || row.created_at).toLocaleDateString()}</td>
                          <td>{row.received_by}</td>
                          <td>{row.receiver_phone || '-'}</td>
                          <td>
                            <span className="badge badge-success">Delivered</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'REPRINT' && (
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Cardholder Name</th>
                      <th>Reason</th>
                      <th>Requested At</th>
                      <th>Approved At</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reprintData.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-light)' }}>No reprint history logged.</td>
                      </tr>
                    ) : (
                      reprintData.map(row => (
                        <tr key={row.id}>
                          <td style={{ fontWeight: '600' }}>{row.cardholder?.full_name}</td>
                          <td>{row.reason}</td>
                          <td>{new Date(row.requested_at || row.created_at).toLocaleDateString()}</td>
                          <td>{row.approved_at ? new Date(row.approved_at).toLocaleDateString() : '-'}</td>
                          <td>
                            <span className={`badge badge-${row.status.toLowerCase()}`}>{row.status}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'ORG' && (
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Org Code</th>
                      <th>Organization Name</th>
                      <th>Active Categories</th>
                      <th>Total Cardholders</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgSummary.map(row => (
                      <tr key={row.id}>
                        <td style={{ fontWeight: '600' }}>{row.code}</td>
                        <td>{row.name}</td>
                        <td>{row.card_types_count || 0}</td>
                        <td style={{ fontWeight: 'bold' }}>{row.cardholders_count || 0}</td>
                        <td>
                          <span className={`badge badge-${row.status.toLowerCase()}`}>{row.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
