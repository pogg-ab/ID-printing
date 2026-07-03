import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { 
  Building2, 
  Layers, 
  Users, 
  Printer, 
  RefreshCcw, 
  Truck, 
  CheckCircle, 
  Clock 
} from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    organizations: 0,
    templates: 0,
    cardholders: 0,
    batches: 0,
    pendingReprints: 0,
    deliveries: 0
  });
  const [recentBatches, setRecentBatches] = useState([]);
  const [recentAudits, setRecentAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Load data from APIs
        const orgs = await api.organizations.list();
        const templates = await api.templates.list();
        const cardholders = await api.cardholders.list({ per_page: 1 });
        const batches = await api.batches.list();
        const reprints = await api.reprints.list('PENDING');
        const deliveries = await api.deliveries.list();
        const audits = await api.auditLogs.list({ per_page: 5 });

        setStats({
          organizations: orgs.length,
          templates: templates.length,
          cardholders: cardholders.total || 0,
          batches: batches.length,
          pendingReprints: reprints.length,
          deliveries: deliveries.length
        });

        setRecentBatches(batches.slice(0, 5));
        setRecentAudits(audits.data || []);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>Loading dashboard...</div>;
  }

  return (
    <div>
      {/* Analytics Grid */}
      <div className="card-grid">
        <div className="card stat-card">
          <div>
            <span style={{ fontSize: '14px', color: 'var(--text-light)', fontWeight: '500' }}>Organizations</span>
            <div className="stat-val">{stats.organizations}</div>
          </div>
          <div className="stat-icon">
            <Building2 size={24} />
          </div>
        </div>

        <div className="card stat-card">
          <div>
            <span style={{ fontSize: '14px', color: 'var(--text-light)', fontWeight: '500' }}>Active Templates</span>
            <div className="stat-val">{stats.templates}</div>
          </div>
          <div className="stat-icon">
            <Layers size={24} />
          </div>
        </div>

        <div className="card stat-card">
          <div>
            <span style={{ fontSize: '14px', color: 'var(--text-light)', fontWeight: '500' }}>Total Cardholders</span>
            <div className="stat-val">{stats.cardholders}</div>
          </div>
          <div className="stat-icon">
            <Users size={24} />
          </div>
        </div>

        <div className="card stat-card">
          <div>
            <span style={{ fontSize: '14px', color: 'var(--text-light)', fontWeight: '500' }}>Pending Reprints</span>
            <div className="stat-val">{stats.pendingReprints}</div>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
            <RefreshCcw size={24} />
          </div>
        </div>
      </div>

      {/* Main Panel Division */}
      <div className="dashboard-grid-container">
        
        {/* Print Job Batches Queue */}
        <div className="table-panel">
          <div className="table-header">
            <h3>Recent Print Batches</h3>
            <Link to="/batches" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
              View All
            </Link>
          </div>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Batch Number</th>
                  <th>Template Name</th>
                  <th>Total Cards</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBatches.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-light)' }}>
                      No print batches found. Create one in the Batches tab!
                    </td>
                  </tr>
                ) : (
                  recentBatches.map(batch => (
                    <tr key={batch.id}>
                      <td style={{ fontWeight: '600', color: 'var(--text-h)' }}>
                        <Link to={`/batches?id=${batch.id}`}>{batch.batch_number}</Link>
                      </td>
                      <td>{batch.card_template?.name || 'Standard'}</td>
                      <td>{batch.total_cards}</td>
                      <td>
                        <span className={`badge badge-${batch.status.toLowerCase()}`}>
                          {batch.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log / Recent Action Logs */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '16px' }}>Recent Logs</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {recentAudits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-light)', fontSize: '14px' }}>
                No audit entries recorded yet.
              </div>
            ) : (
              recentAudits.map(log => (
                <div 
                  key={log.id} 
                  style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    paddingBottom: '12px', 
                    borderBottom: '1px solid var(--border-light)',
                    fontSize: '13px'
                  }}
                >
                  <div style={{ marginTop: '2px', color: log.action_type === 'DELETE' ? 'var(--danger)' : 'var(--primary)' }}>
                    {log.action_type === 'STATUS_CHANGE' || log.action_type === 'MARK_PRINTED' ? <Clock size={16} /> : <CheckCircle size={16} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-h)' }}>
                      {log.entity_name} {log.action_type}
                    </div>
                    <div style={{ color: 'var(--text-light)', fontSize: '11px', marginTop: '2px' }}>
                      {new Date(log.performed_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <Link 
            to="/audit-trail" 
            className="btn btn-secondary" 
            style={{ width: '100%', justifyContent: 'center', marginTop: 'auto', fontSize: '13px' }}
          >
            Open Audit Trail
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
