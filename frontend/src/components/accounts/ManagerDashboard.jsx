import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiShoppingCart,
  FiAlertTriangle,
  FiTrendingUp,
  FiPackage,
} from 'react-icons/fi';
import { viewAllOrders } from '../../services/orderService';
import reportService from '../../services/reportService';

function ManagerDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [ordersToDispatch, setOrdersToDispatch] = useState(0);
  const [monthlyOrderCount, setMonthlyOrderCount] = useState(0);
  const [lowStockItems, setLowStockItems] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // load orders and low stock report at the same time
        const [allOrders, stockReport] = await Promise.all([
          viewAllOrders(),
          reportService.getLowStockReport().catch(() => null),
        ]);

        // pending = accepted or processing (not dispatched yet)
        const pending = allOrders.filter(
          (o) => o.status === 'accepted' || o.status === 'processing'
        ).length;

        // ready to dispatch = processing specifically
        const toDispatch = allOrders.filter((o) => o.status === 'processing').length;

        // orders placed this calendar month
        const now = new Date();
        const thisMonth = allOrders.filter((o) => {
          const d = new Date(o.orderDate);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;

        // low stock list lives under .items in the report response
        const lowStock = stockReport?.items || [];

        setPendingOrders(pending);
        setOrdersToDispatch(toDispatch);
        setMonthlyOrderCount(thisMonth);
        setLowStockItems(lowStock);
      } catch (err) {
        console.error('failed to load manager dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* quick stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
      }}>

        {/* pending orders needing attention */}
        <div
          onClick={() => navigate('/orders')}
          style={{
            background: 'white',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
            transition: 'box-shadow 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
        >
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '0.625rem',
            background: '#dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <FiShoppingCart size={20} style={{ color: '#2563eb' }} />
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Pending Orders</p>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
              {loading ? '—' : pendingOrders}
            </p>
          </div>
        </div>

        {/* orders ready to dispatch */}
        <div
          onClick={() => navigate('/orders')}
          style={{
            background: 'white',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
            transition: 'box-shadow 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
        >
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '0.625rem',
            background: '#dcfce7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <FiPackage size={20} style={{ color: '#16a34a' }} />
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Ready to Dispatch</p>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
              {loading ? '—' : ordersToDispatch}
            </p>
          </div>
        </div>

        {/* monthly order total */}
        <div
          onClick={() => navigate('/orders', { state: { filterThisMonth: true } })}
          style={{
            background: 'white',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            cursor: 'pointer',
            transition: 'box-shadow 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
        >
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '0.625rem',
            background: '#ede9fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <FiTrendingUp size={20} style={{ color: '#7c3aed' }} />
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Orders This Month</p>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
              {loading ? '—' : monthlyOrderCount}
            </p>
          </div>
        </div>
      </div>

      {/* Low stock warnings table - CAT-04 requirement */}
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
            <FiAlertTriangle size={16} style={{ color: '#d97706' }} />
            <h3 style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>
              Low Stock Alerts
            </h3>
          </div>
          <button
            onClick={() => navigate('/reports')}
            style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '500' }}
          >
            View Report →
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
            Loading...
          </div>
        ) : lowStockItems.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
            All stock levels are above minimum — nothing to report
          </div>
        ) : (
          lowStockItems.map((item, index) => {
            // Calculate how close we are to the stock limit as a percentage
            const stockPercentage = item.min_stock_level > 0
              ? Math.min((item.current_stock / item.min_stock_level) * 100, 100)
              : 100;

            return (
              <div
                key={item.product_id}
                style={{
                  padding: '1rem 1.25rem',
                  borderBottom: index < lowStockItems.length - 1
                    ? '1px solid #f1f5f9'
                    : 'none',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                }}>
                  <div>
                    <p style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.875rem' }}>
                      {item.product_name}
                    </p>
                    <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                      ID: {item.product_code}
                    </p>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    {item.current_stock} / {item.min_stock_level} min
                  </p>
                </div>

                {/* stock level progress bar */}
                <div style={{
                  background: '#f1f5f9',
                  borderRadius: '9999px',
                  height: '6px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${stockPercentage}%`,
                    height: '100%',
                    borderRadius: '9999px',
                    // red when critically low, amber when getting low
                    background: stockPercentage < 50 ? '#ef4444' : '#f59e0b',
                  }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ManagerDashboard;
