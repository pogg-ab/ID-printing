import React from 'react';
import { ShieldOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AccessDenied = () => {
  const navigate = useNavigate();
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      gap: '20px',
      color: 'var(--text-light)'
    }}>
      <div style={{
        width: '80px', height: '80px', borderRadius: '50%',
        backgroundColor: 'var(--danger-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <ShieldOff size={38} style={{ color: 'var(--danger)' }} />
      </div>
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-h)', marginBottom: '8px' }}>
          Access Denied
        </h2>
        <p style={{ fontSize: '14px', maxWidth: '360px' }}>
          You don't have permission to access this page.
          Please contact your system administrator to request access.
        </p>
      </div>
      <button className="btn btn-primary" onClick={() => navigate('/')}>
        Return to Dashboard
      </button>
    </div>
  );
};

export default AccessDenied;
