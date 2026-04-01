import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUsers,
  FiBook,
  FiShoppingCart,
  FiAlertTriangle,
  FiActivity,
  FiAlertCircle,
  FiTrendingUp,
} from 'react-icons/fi';
import { getAllMerchants } from '../../services/merchantService';
import { viewAllOrders } from '../../services/orderService';
import reportService from '../../services/reportService';

// reusable stat card - accepts an onClick so each card can navigate somewhere
function StatCard({ icon: Icon, label, value, color, bg, onClick, loading }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s, transform 0.1s',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
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
          {loading ? '—' : value}
        </p>
      </div>
    </div>
  );
}

// colour coding for activity feed items based on order status
const ACTIVITY_COLORS = {
  accepted: { color: '#6366f1', bg: '#ede9fe' },
  processing: { color: '#d97706', bg: '#fef3c7' },
  dispatched: { color: '#16a34a', bg: '#dcfce7' },
  delivered: { color: '#0284c7', bg: '#e0f2fe' },
};

function AdminDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMerchants: 0,
    suspendedAccounts: 0,
    defaultedAccounts: 0,
    pendingOrders: 0,
    ordersThisMonth: 0,
    lowStockItems: 0,
    recentOrders: [],
  });
  const [lowStockBanner, setLowStockBanner] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);

        // fetch everything in parallel - no point waiting for one before the other
        const [merchants, allOrders, stockReport] = await Promise.all([
          getAllMerchants(),
          viewAllOrders(),
          reportService.getLowStockReport(true).catch(() => null),
        ]);

        // count merchants by account status
        const suspended = merchants.filter((m) => m.account_status === 'suspended').length;
        const inDefault = merchants.filter((m) => m.account_status === 'in_default').length;

        // pending = orders still being worked on (not yet dispatched)
        const pending = allOrders.filter(
          (o) => o.status === 'accepted' || o.status === 'processing'
        ).length;

        // count orders placed in the current calendar month
        const now = new Date();
        const thisMonth = allOrders.filter((o) => {
          const d = new Date(o.orderDate);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;

        // most recent 5 orders for the activity feed
        const recent = allOrders.slice(0, 5);

        setStats({
          totalMerchants: merchants.length,
          suspendedAccounts: suspended,
          defaultedAccounts: inDefault,
          pendingOrders: pending,
          ordersThisMonth: thisMonth,
          lowStockItems: stockReport?.total_items_below_minimum ?? 0,
          recentOrders: recent,
        });
      } catch (err) {
        console.error('failed to load dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  const {
    totalMerchants,
    suspendedAccounts,
    defaultedAccounts,
    pendingOrders,
    ordersThisMonth,
    lowStockItems,
    recentOrders,
  } = stats;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* low stock warning - shown if there are items below minimum level */}
      {!loading && lowStockItems > 0 && lowStockBanner && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          background: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: '0.75rem',
          padding: '0.875rem 1.25rem',
          color: '#92400e',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                Low stock alert: {lowStockItems} item{lowStockItems !== 1 ? 's' : ''} below minimum level
              </p>
              <p style={{ fontSize: '0.75rem', marginTop: '0.1rem' }}>
                Go to Reports → Low Stock to see the full list.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            <button
              onClick={() => navigate('/reports')}
              style={{
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                padding: '0.375rem 0.875rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              View Report
            </button>
            <button
              onClick={() => setLowStockBanner(false)}
              style={{ background: 'none', border: 'none', color: '#92400e', cursor: 'pointer', fontSize: '1rem' }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* summary stat cards - clicking each one navigates to the relevant page */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <StatCard
          icon={FiUsers}
          label="Total Merchants"
          value={totalMerchants}
          color="#6366f1"
          bg="#ede9fe"
          loading={loading}
          onClick={() => navigate('/accounts')}
        />
        <StatCard
          icon={FiAlertTriangle}
          label="Suspended / In Default"
          value={`${suspendedAccounts} / ${defaultedAccounts}`}
          color="#d97706"
          bg="#fef3c7"
          loading={loading}
          onClick={() => navigate('/accounts')}
        />
        <StatCard
          icon={FiShoppingCart}
          label="Pending Orders"
          value={pendingOrders}
          color="#2563eb"
          bg="#dbeafe"
          loading={loading}
          onClick={() => navigate('/orders')}
        />
        <StatCard
          icon={FiTrendingUp}
          label="Orders This Month"
          value={ordersThisMonth}
          color="#16a34a"
          bg="#dcfce7"
          loading={loading}
          // navigate to orders page with a flag so it can pre-filter to this month
          onClick={() => navigate('/orders', { state: { filterThisMonth: true } })}
        />
        <StatCard
          icon={FiBook}
          label="Catalogue"
          value="View Items"
          color="#0284c7"
          bg="#e0f2fe"
          loading={false}
          onClick={() => navigate('/catalogue')}
        />
        <StatCard
          icon={FiAlertTriangle}
          label="Low Stock Alerts"
          value={lowStockItems}
          color="#dc2626"
          bg="#fee2e2"
          loading={loading}
          onClick={() => navigate('/reports')}
        />
      </div>

      {/* recent orders feed - replaces the static mock activity list */}
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
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiActivity size={16} style={{ color: '#6366f1' }} />
            <h3 style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>
              Recent Orders
            </h3>
          </div>
          <button
            onClick={() => navigate('/orders')}
            style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '500' }}
          >
            View all →
          </button>
        </div>

        <div>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              Loading...
            </div>
          ) : recentOrders.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
              No orders yet
            </div>
          ) : (
            recentOrders.map((order, index) => {
              const style = ACTIVITY_COLORS[order.status] || ACTIVITY_COLORS.accepted;
              const orderDate = new Date(order.orderDate).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
              });

              return (
                <div
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem 1.25rem',
                    borderBottom: index < recentOrders.length - 1 ? '1px solid #f1f5f9' : 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {/* coloured dot to indicate order status */}
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: style.color, flexShrink: 0,
                  }} />
                  <p style={{ flex: 1, fontSize: '0.875rem', color: '#374151' }}>
                    Order #{order.id?.substring(0, 8).toUpperCase()}
                    {order.merchantName ? ` · ${order.merchantName}` : ''}
                    {' · '}
                    <span style={{
                      background: style.bg, color: style.color,
                      padding: '0.1rem 0.5rem', borderRadius: '9999px',
                      fontSize: '0.75rem', fontWeight: '600',
                      textTransform: 'capitalize',
                    }}>
                      {order.status}
                    </span>
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', flexShrink: 0 }}>
                    {orderDate}
                  </p>
                  <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a', flexShrink: 0 }}>
                    £{parseFloat(order.amountDue).toFixed(2)}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
