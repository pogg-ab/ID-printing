import React, { useState, useEffect } from 'react';
import { toast, confirmDialog } from '../utils/toast';
import { AlertCircle, CheckCircle, Info, X, HelpCircle } from 'lucide-react';

const ToastContainer = () => {
  const [activeToasts, setActiveToasts] = useState([]);
  
  // Custom Confirm State
  const [confirmState, setConfirmState] = useState({
    show: false,
    message: '',
    resolve: null
  });

  useEffect(() => {
    // Subscribe to toasts
    const unsubscribeToast = toast.subscribe((message, type) => {
      const id = Date.now() + Math.random();
      const newToast = {
        id,
        message,
        type,
        title: type === 'success' 
          ? 'Operation Successful' 
          : type === 'warning' 
            ? 'Action Warning' 
            : 'Validation Alert'
      };
      
      setActiveToasts(prev => [...prev, newToast]);

      // Auto-remove after 6 seconds
      setTimeout(() => {
        setActiveToasts(prev => prev.filter(t => t.id !== id));
      }, 6000);
    });

    // Subscribe to custom confirms
    const unsubscribeConfirm = confirmDialog.subscribe((message, resolve) => {
      setConfirmState({
        show: true,
        message,
        resolve
      });
    });

    return () => {
      unsubscribeToast();
      unsubscribeConfirm();
    };
  }, []);

  const handleCloseToast = (id) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleConfirmResponse = (value) => {
    if (confirmState.resolve) {
      confirmState.resolve(value);
    }
    setConfirmState({
      show: false,
      message: '',
      resolve: null
    });
  };

  return (
    <>
      {/* Toast container */}
      <div className="toast-container">
        {activeToasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginTop: '2px' }}>
              {t.type === 'success' && <CheckCircle size={20} style={{ color: 'var(--success)' }} />}
              {t.type === 'error' && <AlertCircle size={20} style={{ color: 'var(--danger)' }} />}
              {t.type === 'warning' && <AlertCircle size={20} style={{ color: 'var(--warning)' }} />}
              {t.type === 'info' && <Info size={20} style={{ color: 'var(--primary)' }} />}
            </div>
            <div className="toast-content">
              <div className="toast-title">{t.title}</div>
              <div className="toast-message">{t.message}</div>
            </div>
            <button type="button" className="toast-close" onClick={() => handleCloseToast(t.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Custom Confirm Modal Popup */}
      {confirmState.show && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '420px', padding: '32px', borderRadius: '16px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ padding: '16px', backgroundColor: 'var(--primary-light)', borderRadius: '50%', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HelpCircle size={32} />
              </div>
            </div>
            <h3 style={{ fontSize: '20px', marginBottom: '12px', fontFamily: 'var(--font-heading)' }}>Please Confirm</h3>
            <p style={{ color: 'var(--text-light)', fontSize: '14px', marginBottom: '28px', lineHeight: '1.5' }}>
              {confirmState.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '10px 20px', flex: 1, justifyContent: 'center' }}
                onClick={() => handleConfirmResponse(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ padding: '10px 20px', flex: 1, backgroundColor: 'var(--danger)', border: 'none', justifyContent: 'center' }}
                onClick={() => handleConfirmResponse(true)}
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ToastContainer;
