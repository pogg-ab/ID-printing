import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Search, Eye, X, ClipboardList } from 'lucide-react';

const AuditTrail = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  
  // Filters
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, [entityFilter, actionFilter, page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        per_page: 20
      };
      if (entityFilter) params.entity_name = entityFilter;
      if (actionFilter) params.action_type = actionFilter;

      const data = await api.auditLogs.list(params);
      setLogs(data.data || []);
      setTotalPages(data.last_page || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Search and Filters panel */}
      <div className="card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClipboardList size={20} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '15px' }}>Filter Logs</h3>
        </div>

        <select 
          className="form-control" 
          value={entityFilter} 
          onChange={e => { setEntityFilter(e.target.value); setPage(1); }}
          style={{ width: '200px', margin: 0 }}
        >
          <option value="">All Entities</option>
          <option value="PrintBatch">PrintBatch</option>
          <option value="ReprintRequest">ReprintRequest</option>
          <option value="Delivery">Delivery</option>
          <option value="Cardholder">Cardholder</option>
        </select>

        <select 
          className="form-control" 
          value={actionFilter} 
          onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          style={{ width: '200px', margin: 0 }}
        >
          <option value="">All Action Types</option>
          <option value="CREATE">CREATE</option>
          <option value="STATUS_CHANGE">STATUS_CHANGE</option>
          <option value="APPROVE">APPROVE</option>
          <option value="REJECT">REJECT</option>
          <option value="MARK_PRINTED">MARK_PRINTED</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      <div className="table-panel">
        <div className="table-container">
          <table className="custom-table" style={{ fontSize: '13px' }}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Entity Class</th>
                <th>Entity UUID</th>
                <th>Action Type</th>
                <th>Operator</th>
                <th style={{ textAlign: 'right' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>Loading audit logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-light)' }}>
                    No audit records match the current filters.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id}>
                    <td>{new Date(log.performed_at || log.created_at).toLocaleString()}</td>
                    <td style={{ fontWeight: '600', color: 'var(--text-h)' }}>{log.entity_name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-light)' }}>{log.entity_id}</td>
                    <td>
                      <span className={`badge badge-${log.action_type.toLowerCase()}`}>{log.action_type}</span>
                    </td>
                    <td>System Admin</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setSelectedLog(log)}>
                        <Eye size={12} /> View Diff
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 24px', borderTop: '1px solid var(--border)', gap: '8px' }}>
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

      {/* JSON Diff Detail Modal */}
      {selectedLog && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div style={{ display: 'flex', justify: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
              <h3>Audit Detail: {selectedLog.entity_name} ({selectedLog.action_type})</h3>
              <button onClick={() => setSelectedLog(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-light)' }}>
                <X size={20} />
              </button>
            </div>
            
            <div className={`grid-diff ${selectedLog.old_value ? '' : 'single'}`}>
              {selectedLog.old_value && (
                <div>
                  <h4 style={{ fontSize: '13px', color: 'var(--danger)', marginBottom: '8px' }}>Previous State</h4>
                  <pre 
                    style={{ 
                      padding: '12px', 
                      backgroundColor: 'var(--border-light)', 
                      borderRadius: 'var(--radius-sm)', 
                      overflowX: 'auto', 
                      fontSize: '11px',
                      color: 'var(--text)',
                      maxHeight: '350px'
                    }}
                  >
                    {JSON.stringify(selectedLog.old_value, null, 2)}
                  </pre>
                </div>
              )}
              
              <div>
                <h4 style={{ fontSize: '13px', color: 'var(--success)', marginBottom: '8px' }}>{selectedLog.old_value ? 'New State' : 'Created Record Details'}</h4>
                <pre 
                  style={{ 
                    padding: '12px', 
                    backgroundColor: 'var(--border-light)', 
                    borderRadius: 'var(--radius-sm)', 
                    overflowX: 'auto', 
                    fontSize: '11px',
                    color: 'var(--text)',
                    maxHeight: '350px'
                  }}
                >
                  {JSON.stringify(selectedLog.new_value, null, 2)}
                </pre>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedLog(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTrail;
