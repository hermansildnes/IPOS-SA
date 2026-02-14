import {
  FiUsers,
  FiBook,
  FiShoppingCart,
  FiAlertTriangle,
  FiActivity,
} from 'react-icons/fi';

// mock summary stats shown on the admin dashboard
// TODO: Replace with real API calls when backend is ready
const MOCK_ADMIN_STATS = {
  totalMerchants: 24,
  activeMerchants: 21,
  suspendedAccounts: 2,
  defaultedAccounts: 1,
  pendingOrders: 8,
  lowStockItems: 5,
  totalCatalogueItems: 47,
  recentActivity: [
    {
      id: 1,
      message: 'New merchant account created: Pharma Plus Ltd',
      time: '2 hours ago',
      type: 'account',
    },
    {
      id: 2,
      message: 'Order IP3045 dispatched to Cosymed Ltd',
      time: '4 hours ago',
      type: 'order',
    },
    {
      id: 3,
      message: 'Low stock warning: Paracetamol (250 packs remaining)',
      time: '5 hours ago',
      type: 'warning',
    },
    {
      id: 4,
      message: 'Account suspended: MedShop Ltd (payment overdue)',
      time: '1 day ago',
      type: 'warning',
    },
  ],
};

// Summary card component reused across all the stat cards below

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '0.75rem',
      padding: '1.25rem',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
    }}>
      {/* Coloured icon background */}
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '0.625rem',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>
          {label}
        </p>
        <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
          {value}
        </p>
      </div>
    </div>
  );
}

// Colour coding for activity feed items based on type
const ACTIVITY_COLORS = {
  account: { color: '#6366f1', bg: '#ede9fe' },
  order: { color: '#16a34a', bg: '#dcfce7' },
  warning: { color: '#d97706', bg: '#fef3c7' },
};

function AdminDashboard() {
  const {
    totalMerchants,
    suspendedAccounts,
    defaultedAccounts,
    pendingOrders,
    lowStockItems,
    totalCatalogueItems,
    recentActivity,
  } = MOCK_ADMIN_STATS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* summary stat cards - gives admin a quick overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
      }}>
        <StatCard
          icon={FiUsers}
          label="Total Merchants"
          value={totalMerchants}
          color="#6366f1"
          bg="#ede9fe"
        />
        <StatCard
          icon={FiAlertTriangle}
          label="Suspended / Defaulted"
          value={`${suspendedAccounts} / ${defaultedAccounts}`}
          color="#d97706"
          bg="#fef3c7"
        />
        <StatCard
          icon={FiShoppingCart}
          label="Pending Orders"
          value={pendingOrders}
          color="#2563eb"
          bg="#dbeafe"
        />
        <StatCard
          icon={FiBook}
          label="Catalogue Items"
          value={totalCatalogueItems}
          color="#16a34a"
          bg="#dcfce7"
        />
        <StatCard
          icon={FiAlertTriangle}
          label="Low Stock Alerts"
          value={lowStockItems}
          color="#dc2626"
          bg="#fee2e2"
        />
      </div>

      {/* Recent activity feed */}
      <div style={{
        background: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '1.25rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <FiActivity size={16} style={{ color: '#6366f1' }} />
          <h3 style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>
            Recent Activity
          </h3>
        </div>

        {/* Activity items */}
        <div>
          {recentActivity.map((activity, index) => {
            const style = ACTIVITY_COLORS[activity.type] || ACTIVITY_COLORS.account;
            return (
              <div
                key={activity.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  borderBottom: index < recentActivity.length - 1
                    ? '1px solid #f1f5f9'
                    : 'none',
                }}
              >
                {/* Coloured dot to indicate activity type */}
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: style.color,
                  flexShrink: 0,
                }} />
                <p style={{
                  flex: 1,
                  fontSize: '0.875rem',
                  color: '#374151',
                }}>
                  {activity.message}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', flexShrink: 0 }}>
                  {activity.time}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;