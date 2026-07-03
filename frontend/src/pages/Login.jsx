import React, { useState } from 'react';
import { api } from '../services/api';
import { Printer, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('superadmin@gmail.com');
  const [password, setPassword] = useState('password!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Authenticate against the backend database using seeded credentials
      const response = await api.auth.login(email, password);
      // Pass the full user object (name, role, permissions) to parent
      onLoginSuccess(response.user || { name: email, role: 'staff', permissions: {} });
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        width: '100vw', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: 'var(--bg)',
        fontFamily: 'var(--font-sans)',
        padding: '20px',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        transition: 'background-color 0.3s'
      }}
    >
      <div 
        style={{ 
          width: '100%', 
          maxWidth: '420px', 
          backgroundColor: 'var(--panel)', 
          borderRadius: 'var(--radius-lg)', 
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Soft background glow decoration */}
        <div 
          style={{ 
            position: 'absolute', 
            top: '-50px', 
            right: '-50px', 
            width: '150px', 
            height: '150px', 
            borderRadius: '50%', 
            background: 'radial-gradient(circle, var(--primary-light) 0%, transparent 70%)',
            pointerEvents: 'none' 
          }} 
        />

        {/* Logo Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div 
            style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: 'var(--radius-md)', 
              backgroundColor: 'var(--primary-light)', 
              color: 'var(--primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(129, 140, 248, 0.15)'
            }}
          >
            <Printer size={30} />
          </div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', fontFamily: 'var(--font-heading)', color: 'var(--text-h)', margin: '4px 0 0 0' }}>
              IPMS Board
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-light)', marginTop: '4px' }}>
              Dire Dawa Resident ID printing service
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div 
              style={{ 
                padding: '12px 16px', 
                backgroundColor: 'var(--danger-light)', 
                color: 'var(--danger)', 
                borderRadius: 'var(--radius-sm)', 
                fontSize: '13px', 
                fontWeight: '500',
                border: '1px solid rgba(239, 68, 68, 0.2)' 
              }}
            >
              {error}
            </div>
          )}

          {/* Email Address */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="form-label" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-h)' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', display: 'flex' }}>
                <User size={16} />
              </span>
              <input 
                type="email" 
                className="form-control" 
                style={{ paddingLeft: '40px', width: '100%' }}
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="form-label" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-h)' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)', display: 'flex' }}>
                <Lock size={16} />
              </span>
              <input 
                type={showPassword ? "text" : "password"} 
                className="form-control" 
                style={{ paddingLeft: '40px', paddingRight: '40px', width: '100%' }}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{ 
                  position: 'absolute', 
                  right: '14px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  border: 'none', 
                  background: 'transparent', 
                  cursor: 'pointer', 
                  color: 'var(--text-light)',
                  display: 'flex',
                  padding: 0
                }}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ 
              marginTop: '10px', 
              justifyContent: 'center', 
              height: '44px', 
              fontWeight: '600', 
              fontSize: '15px',
              opacity: loading ? 0.8 : 1,
              pointerEvents: loading ? 'none' : 'auto'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Verifying Credentials...
              </>
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>

        {/* Hint footer */}
        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-light)', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
          <span>Seeded Credentials: <br /><strong>superadmin@gmail.com</strong> / <strong>password!</strong></span>
        </div>

        {/* Global spinner animation css rule (inline helper) */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }
        `}</style>
      </div>
    </div>
  );
};

export default Login;
