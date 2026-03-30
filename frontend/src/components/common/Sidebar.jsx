import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiHome,
  FiBook,
  FiShoppingCart,
  FiUsers,
  FiBarChart2,
  FiLogOut,
  FiPackage,
  FiUser,
  FiShield,
} from 'react-icons/fi';
import logo from '../../assets/logo.png';

// each nav item needs a label, icon, path, and which roles can see it so sidebar is dynamic

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    icon: FiHome,
    path: '/dashboard',
    // Every role gets a dashboard
    roles: ['admin', 'director', 'manager', 'merchant'],
  },
  {
    label: 'Catalogue',
    icon: FiBook,
    path: '/catalogue',
    // Merchants browse the catalogue, admins manage it
    roles: ['admin', 'manager', 'merchant'],
  },
  {
    label: 'Orders',
    icon: FiShoppingCart,
    path: '/orders',
    // Merchants place orders, admins and managers process them
    roles: ['admin', 'manager', 'merchant'],
  },
  {
    label: 'Accounts',
    icon: FiUsers,
    path: '/accounts',
    // Management roles can view merchant accounts
    roles: ['admin', 'director', 'manager'],
  },
  {
    label: 'My Account',
    icon: FiUser,
    path: '/my-account',
    // Merchants get their own self-service account page
    roles: ['merchant'],
  },
  {
    label: 'Reports',
    icon: FiBarChart2,
    path: '/reports',
    // Only management roles can view reports
    roles: ['admin', 'director', 'manager'],
  },
  {
  label: 'Audit Log',
  icon: FiShield,
  path: '/audit',
  roles: ['admin', 'manager'],
  },
  {
    label: 'Applications',
    icon: FiPackage,
    path: '/applications',
    // Only admin can manage applications
    roles: ['admin'],
  },
];

// colour badge shown next to the user's name to identify their role quickly
const ROLE_COLORS = {
  admin: { bg: '#fee2e2', text: '#dc2626', label: 'Admin' },
  director: { bg: '#fef3c7', text: '#d97706', label: 'Director' },
  manager: { bg: '#dcfce7', text: '#16a34a', label: 'Manager' },
  merchant: { bg: '#ede9fe', text: '#7c3aed', label: 'Merchant' },
};

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // normalise the current role first so role checks work reliably
  const userRole = user?.role?.toLowerCase() || '';

  // Log the user out and send them back to the login page
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // only show nav items the current user's role is allowed to see
  const visibleNavItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );

  // role badge styling - fallback included in case an unexpected role appears
  const roleStyle = ROLE_COLORS[userRole] || {
    bg: '#e2e8f0',
    text: '#475569',
    label: user?.role || 'User',
  };

  return (
    <div
      style={{
        width: '240px',
        minHeight: '100vh',
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 100,
      }}
    >
      {/* logo and app name at the top of the sidebar */}
      <div
        style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <img
            src={logo}
            alt="Logo"
            style={{
              width: '28px',
              height: '28px',
              objectFit: 'contain',
            }}
          />
        </div>

        <div>
          <p
            style={{
              color: 'white',
              fontWeight: '700',
              fontSize: '0.9rem',
              lineHeight: 1,
            }}
          >
            IPOS-SA
          </p>
          <p
            style={{
              color: '#475569',
              fontSize: '0.65rem',
              marginTop: '0.2rem',
            }}
          >
            InfoPharma Ltd.
          </p>
        </div>
      </div>

      {/* navigation links - filtered by role above */}
      <nav
        style={{
          flex: 1,
          padding: '1rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}
      >
        <p
          style={{
            color: '#334155',
            fontSize: '0.65rem',
            fontWeight: '600',
            letterSpacing: '0.08em',
            padding: '0 0.75rem',
            marginBottom: '0.5rem',
          }}
        >
          NAVIGATION
        </p>

        {visibleNavItems.map((item) => {
          const Icon = item.icon;

          return (
            // NavLink automatically adds an 'active' class when on that route
            // used it to highlight the current page in the sidebar
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0.75rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: isActive ? '600' : '400',
                // Highlighted purple background for the active page
                background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: isActive ? '#818cf8' : '#64748b',
                transition: 'all 0.15s',
              })}
            >
              <Icon size={16} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* User info and logout button at the bottom of the sidebar */}
      <div
        style={{
          padding: '1rem 0.75rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Shows who is currently logged in */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.625rem 0.75rem',
            marginBottom: '0.5rem',
          }}
        >
          {/* Avatar circle using the first available initial */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(99,102,241,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8',
              fontSize: '0.875rem',
              fontWeight: '600',
              flexShrink: 0,
            }}
          >
            {user?.name?.charAt(0) || user?.username?.charAt(0) || 'U'}
          </div>

          <div style={{ overflow: 'hidden' }}>
            <p
              style={{
                color: 'white',
                fontSize: '0.8rem',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.name || user?.username || 'User'}
            </p>

            {/* role badge - colour coded to match the login page */}
            <span
              style={{
                display: 'inline-block',
                background: roleStyle.bg,
                color: roleStyle.text,
                fontSize: '0.6rem',
                fontWeight: '600',
                padding: '0.1rem 0.4rem',
                borderRadius: '9999px',
                marginTop: '0.15rem',
              }}
            >
              {roleStyle.label}
            </span>
          </div>
        </div>

        {/* logout button - calls handleLogout above */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.625rem 0.75rem',
            background: 'transparent',
            border: 'none',
            borderRadius: '0.5rem',
            color: '#64748b',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
            e.currentTarget.style.color = '#f87171';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          <FiLogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default Sidebar;