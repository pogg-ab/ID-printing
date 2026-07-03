import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Layers,
  Users,
  Printer,
  RefreshCcw,
  Truck,
  ClipboardList,
  BarChart3,
  UserCog,
  ShieldCheck,
} from 'lucide-react';

// Map each nav item to the page_key used in permissions
const ALL_MENU_ITEMS = [
  { name: 'Dashboard',     path: '/',             icon: LayoutDashboard, key: 'dashboard' },
  { name: 'Organizations', path: '/organizations', icon: Building2,       key: 'organizations' },
  { name: 'Templates',     path: '/templates',     icon: Layers,          key: 'templates' },
  { name: 'Cardholders',   path: '/cardholders',   icon: Users,           key: 'cardholders' },
  { name: 'Print Batches', path: '/batches',       icon: Printer,         key: 'batches' },
  { name: 'Reprints',      path: '/reprints',      icon: RefreshCcw,      key: 'reprints' },
  { name: 'Deliveries',    path: '/deliveries',    icon: Truck,           key: 'deliveries' },
  { name: 'Reports',       path: '/reports',       icon: BarChart3,       key: 'reports' },
  { name: 'Audit Trail',   path: '/audit-trail',   icon: ClipboardList,   key: 'audit_trail' },
];

// Super Admin only items (no page_key guard needed)
const ADMIN_MENU_ITEMS = [
  { name: 'Users',         path: '/users',         icon: UserCog,         key: null },
  { name: 'Permissions',   path: '/permissions',   icon: ShieldCheck,     key: null },
];

const Sidebar = ({ currentUser, isOpen, onClose }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  const role = currentUser?.role || 'staff';
  const perms = currentUser?.permissions || {};
  const isSuperAdmin = role === 'super_admin';

  // For staff: only show items they have permission to access
  const visibleItems = ALL_MENU_ITEMS.filter(item => {
    if (isSuperAdmin) return true;
    return perms[item.key] === true;
  });

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <Printer size={28} style={{ color: 'var(--primary)' }} />
        <h2>IPMS Board</h2>
      </div>

      <ul className="sidebar-menu">
        {visibleItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
          return (
            <li key={item.name} className={`sidebar-item ${isActive ? 'active' : ''}`}>
              <Link to={item.path} onClick={onClose}>
                <IconComponent size={20} />
                <span>{item.name}</span>
              </Link>
            </li>
          );
        })}

        {/* Admin-only section: Users & Permissions */}
        {isSuperAdmin && (
          <>
            <li style={{
              padding: '16px 20px 4px',
              fontSize: '10px',
              fontWeight: '700',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-light)',
              userSelect: 'none',
            }}>
              Administration
            </li>
            {ADMIN_MENU_ITEMS.map(item => {
              const IconComponent = item.icon;
              const isActive = currentPath.startsWith(item.path);
              return (
                <li key={item.name} className={`sidebar-item ${isActive ? 'active' : ''}`}>
                  <Link to={item.path} onClick={onClose}>
                    <IconComponent size={20} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </>
        )}
      </ul>
    </aside>
  );
};

export default Sidebar;
