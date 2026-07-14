import React, { useState } from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Organizations from './pages/Organizations';
import Templates from './pages/Templates';
import TemplateDesigner from './pages/TemplateDesigner';
import Cardholders from './pages/Cardholders';
import PrintBatches from './pages/PrintBatches';
import Reprints from './pages/Reprints';
import Deliveries from './pages/Deliveries';
import Reports from './pages/Reports';
import AuditTrail from './pages/AuditTrail';
import Login from './pages/Login';
import UsersPage from './pages/Users';
import PermissionsPage from './pages/Permissions';
import AccessDenied from './pages/AccessDenied';

import './utils/toast';
import ToastContainer from './components/ToastContainer';

// Route guard: allows super_admin unconditionally, checks staff permissions
const ProtectedRoute = ({ currentUser, pageKey, children }) => {
  if (!currentUser) return <Navigate to="/" replace />;
  if (currentUser.role === 'super_admin') return children;
  if (currentUser.permissions?.[pageKey]) return children;
  return <AccessDenied />;
};

// Guard for super_admin only routes (Users, Permissions)
const AdminRoute = ({ currentUser, children }) => {
  if (!currentUser) return <Navigate to="/" replace />;
  if (currentUser.role === 'super_admin') return children;
  return <AccessDenied />;
};

function App() {
  const location = useLocation();
  const currentPath = location.pathname;
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    localStorage.getItem('isAuthenticated') === 'true'
  );

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('currentUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLoginSuccess = (userData) => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('currentUser', JSON.stringify(userData));
    setIsAuthenticated(true);
    setCurrentUser(userData);
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('currentUser');
    setIsAuthenticated(false);
    setCurrentUser(null);
    navigate('/');
  };

  const getPageTitle = () => {
    if (currentPath === '/') return 'Dashboard';
    if (currentPath.startsWith('/organizations')) return 'Organizations Directory';
    if (currentPath.startsWith('/templates/designer')) return 'Template Studio';
    if (currentPath.startsWith('/templates')) return 'Card Templates';
    if (currentPath.startsWith('/cardholders')) return 'Resident Registry';
    if (currentPath.startsWith('/batches')) return 'Print Job Batches';
    if (currentPath.startsWith('/reprints')) return 'Reprint Operations';
    if (currentPath.startsWith('/deliveries')) return 'Dispatch & Deliveries';
    if (currentPath.startsWith('/reports')) return 'Performance & Activity Reports';
    if (currentPath.startsWith('/audit-trail')) return 'Security Audit Trail';
    if (currentPath.startsWith('/users')) return 'User Management';
    if (currentPath.startsWith('/permissions')) return 'Permission Control';
    return 'Management Board';
  };

  if (!isAuthenticated) {
    return (
      <div className="app-container">
        <ToastContainer />
        <Login onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <ToastContainer />
      {mobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}
      <Sidebar currentUser={currentUser} isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <main className="main-content">
        <Header 
          title={getPageTitle()} 
          onLogout={handleLogout} 
          currentUser={currentUser} 
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} 
        />
        <div style={{ marginTop: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={
              <ProtectedRoute currentUser={currentUser} pageKey="dashboard">
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/organizations" element={
              <ProtectedRoute currentUser={currentUser} pageKey="organizations">
                <Organizations />
              </ProtectedRoute>
            } />
            <Route path="/templates" element={
              <ProtectedRoute currentUser={currentUser} pageKey="templates">
                <Templates />
              </ProtectedRoute>
            } />
            <Route path="/templates/designer/:id" element={
              <ProtectedRoute currentUser={currentUser} pageKey="templates">
                <TemplateDesigner />
              </ProtectedRoute>
            } />
            <Route path="/cardholders" element={
              <ProtectedRoute currentUser={currentUser} pageKey="cardholders">
                <Cardholders />
              </ProtectedRoute>
            } />
            <Route path="/batches" element={
              <ProtectedRoute currentUser={currentUser} pageKey="batches">
                <PrintBatches />
              </ProtectedRoute>
            } />
            <Route path="/reprints" element={
              <ProtectedRoute currentUser={currentUser} pageKey="reprints">
                <Reprints />
              </ProtectedRoute>
            } />
            <Route path="/deliveries" element={
              <ProtectedRoute currentUser={currentUser} pageKey="deliveries">
                <Deliveries />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute currentUser={currentUser} pageKey="reports">
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="/audit-trail" element={
              <ProtectedRoute currentUser={currentUser} pageKey="audit_trail">
                <AuditTrail />
              </ProtectedRoute>
            } />

            {/* Admin-only routes */}
            <Route path="/users" element={
              <AdminRoute currentUser={currentUser}><UsersPage /></AdminRoute>
            } />
            <Route path="/permissions" element={
              <AdminRoute currentUser={currentUser}><PermissionsPage /></AdminRoute>
            } />

            <Route path="/access-denied" element={<AccessDenied />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
