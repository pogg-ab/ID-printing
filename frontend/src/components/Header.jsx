import React, { useState, useEffect } from 'react';
import { Sun, Moon, User, LogOut, Menu } from 'lucide-react';

const Header = ({ title, onLogout, currentUser, onMenuToggle }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="header-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          onClick={onMenuToggle}
          className="btn btn-secondary mobile-menu-toggle"
          style={{ padding: '8px', display: 'none', alignItems: 'center', justifyContent: 'center' }}
        >
          <Menu size={20} />
        </button>
        <div className="header-title">
          <h1>{title}</h1>
        </div>
      </div>
      <div className="header-actions">
        <button 
          onClick={toggleTheme} 
          className="btn btn-secondary" 
          style={{ padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        {onLogout && (
          <button 
            onClick={onLogout} 
            className="btn btn-secondary" 
            style={{ padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        )}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '6px 12px', 
            borderRadius: '20px', 
            backgroundColor: 'var(--panel)', 
            border: '1px solid var(--border)' 
          }}
        >
          <div 
            style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--primary-light)', 
              color: 'var(--primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justify: 'center' 
            }}
          >
            <User size={16} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-h)', lineHeight: '1.2' }}>
              {currentUser?.name || 'User'}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-light)', lineHeight: '1.2' }}>
              {currentUser?.role === 'super_admin' ? 'System Admin' : 'Staff'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
