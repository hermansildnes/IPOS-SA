import {
  FiShoppingCart,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiTruck,
  FiCreditCard,
} from 'react-icons/fi';

// Mock data representing what will eventually come from the backend

// TODO: Replace with real API calls when backend is ready
const MOCK_MERCHANT_DATA = {
  creditLimit: 10000,
  currentDebt: 7800,
  recentOrders: [
    {
      id: 'IP2034',
      date: '12/01/2026',
      value: 302.50,
      status: 'Delivered',
    },
    {
      id: 'IP2780',
      date: '17/01/2026',
      value: 525.00,
      status: 'Dispatched',
    },
    {
      id: 'IP3021',
      date: '29/01/2026',
      value: 750.30,
      status: 'Processing',
    },
  ],
};

// maps order status to a colour and icon for the status badge
const STATUS_STYLES = {
  Delivered: { color: '#16a34a', bg: '#dcfce7', icon: FiCheckCircle },
  Dispatched: { color: '#2563eb', bg: '#dbeafe', icon: FiTruck },
  Processing: { color: '#d97706', bg: '#fef3c7', icon: FiClock },
  Accepted: { color: '#7c3aed', bg: '#ede9fe', icon: FiCheckCircle },
};

function MerchantDashboard() {
  const { creditLimit, currentDebt, recentOrders } = MOCK_MERCHANT_DATA;

  // available credit = total limit minus what's already owed
  const availableCredit = creditLimit - currentDebt;

  // warn the merchant if they've used more than 90% of their credit
  // maintained consistency with user stories - the SA-MER-03 acceptance criteria
  const isNearLimit = currentDebt / creditLimit >= 0.9;

  // Shows what percentage of credit has been used as a progress bar
  const debtPercentage = Math.min((currentDebt / creditLimit) * 100, 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Warning banner - only shows when merchant is near their credit limit */}
      {isNearLimit && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: '0.75rem',
          padding: '1rem 1.25rem',
          color: '#92400e',
        }}>
          <FiAlertCircle size={20} style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: '600', fontSize: '0.875rem' }}>
              Credit limit warning
            </p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.1rem' }}>
              You've used {debtPercentage.toFixed(0)}% of your credit limit.
              Please make a payment to avoid account suspension.
            </p>
          </div>
        </div>
      )}

      {/* credit overview cards - matches SA-MER-03 requirements */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
      }}>
        {/* Total credit limit */}
        <div style={{
          background: 'white',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem',
          }}>
            <FiCreditCard size={16} style={{ color: '#6366f1' }} />
            <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
              Credit Limit
            </p>
          </div>
          <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
            £{creditLimit.toLocaleString()}
          </p>
        </div>

        {/* Current outstanding debt */}
        <div style={{
          background: 'white',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem',
          }}>
            <FiAlertCircle size={16} style={{ color: '#f59e0b' }} />
            <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
              Outstanding Debt
            </p>
          </div>
          <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
            £{currentDebt.toLocaleString()}
          </p>
        </div>

        {/* Available credit = limit minus debt */}
        <div style={{
          background: 'white',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          border: isNearLimit ? '1px solid #fcd34d' : '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          background: isNearLimit ? '#fffbeb' : 'white',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem',
          }}>
            <FiCheckCircle size={16} style={{ color: '#16a34a' }} />
            <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
              Available Credit
            </p>
          </div>
          <p style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            // Red text when almost at limit, green when plenty available
            color: isNearLimit ? '#dc2626' : '#16a34a',
          }}>
            £{availableCredit.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Credit usage progress bar */}
      <div style={{
        background: 'white',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        border: '1px solid #e2e8f0',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
        }}>
          <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
            Credit Usage
          </p>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            {debtPercentage.toFixed(0)}% used
          </p>
        </div>
        {/* Grey track behind the coloured progress bar */}
        <div style={{
          background: '#f1f5f9',
          borderRadius: '9999px',
          height: '8px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${debtPercentage}%`,
            height: '100%',
            borderRadius: '9999px',
            // bar turns red when near limit, yellow at warning level, green otherwise
            background: debtPercentage >= 90
              ? '#ef4444'
              : debtPercentage >= 70
                ? '#f59e0b'
                : '#22c55e',
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* recent orders table */}
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
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiShoppingCart size={16} style={{ color: '#6366f1' }} />
            <h3 style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>
              Recent Orders
            </h3>
          </div>
          {/* This will link to the full orders page eventually */}
          <button style={{
            background: 'none',
            border: 'none',
            color: '#6366f1',
            fontSize: '0.8rem',
            cursor: 'pointer',
            fontWeight: '500',
          }}>
            View all →
          </button>
        </div>

        {/* order rows */}
        <div>
          {recentOrders.map((order, index) => {
            const statusStyle = STATUS_STYLES[order.status] || STATUS_STYLES.Processing;
            const StatusIcon = statusStyle.icon;

            return (
              <div
                key={order.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1rem 1.25rem',
                  // Alternate row background for readability
                  background: index % 2 === 0 ? 'white' : '#fafafa',
                  borderBottom: index < recentOrders.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}
              >
                {/* Order ID and date */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.875rem' }}>
                    {order.id}
                  </p>
                  <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                    {order.date}
                  </p>
                </div>

                {/* Order total */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.875rem' }}>
                    £{order.value.toFixed(2)}
                  </p>
                </div>

                {/* Status badge with colour and icon */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: statusStyle.bg,
                  color: statusStyle.color,
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                }}>
                  <StatusIcon size={12} />
                  {order.status}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MerchantDashboard;