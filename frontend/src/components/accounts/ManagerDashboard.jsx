import {
  FiShoppingCart,
  FiAlertTriangle,
  FiTrendingUp,
  FiPackage,
} from 'react-icons/fi';

// mock data for manager overview
// TODO: Replace with real API calls when backend is ready
const MOCK_MANAGER_DATA = {
  pendingOrders: 8,
  ordersToDispatch: 3,
  lowStockItems: [
    { id: '100 00001', name: 'Paracetamol', available: 250, limit: 300 },
    { id: '100 00002', name: 'Aspirin', available: 320, limit: 500 },
    { id: '200 00004', name: 'Iodine Tincture', available: 87, limit: 200 },
  ],
  monthlyOrderCount: 47,
};

function ManagerDashboard() {
  const { pendingOrders, ordersToDispatch, lowStockItems, monthlyOrderCount } =
    MOCK_MANAGER_DATA;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* quick stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
      }}>

        {/* pending orders needing attention */}
        <div style={{
          background: 'white',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
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
              {pendingOrders}
            </p>
          </div>
        </div>

        {/* orders ready to dispatch */}
        <div style={{
          background: 'white',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
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
              {ordersToDispatch}
            </p>
          </div>
        </div>

        {/* Monthly order total */}
        <div style={{
          background: 'white',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
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
              {monthlyOrderCount}
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
          gap: '0.5rem',
        }}>
          <FiAlertTriangle size={16} style={{ color: '#d97706' }} />
          <h3 style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>
            Low Stock Alerts
          </h3>
        </div>

        {lowStockItems.map((item, index) => {
          // Calculate how close we are to the stock limit as a percentage
          const stockPercentage = (item.available / item.limit) * 100;

          return (
            <div
              key={item.id}
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
                    {item.name}
                  </p>
                  <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                    ID: {item.id}
                  </p>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  {item.available} / {item.limit} packs
                </p>
              </div>

              {/* Stock level progress bar */}
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
                  // Red when critically low, amber when getting low
                  background: stockPercentage < 50 ? '#ef4444' : '#f59e0b',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ManagerDashboard;