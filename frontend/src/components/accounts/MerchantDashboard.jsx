import { useState, useEffect } from 'react';
import {
  FiShoppingCart,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiTruck,
  FiCreditCard,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { queryBalance, viewPreviousOrders } from '../../services/orderService';
import { apiClient } from '../../services/apiClient';

// maps order status to a colour and icon for the status badge
const STATUS_STYLES = {
  DELIVERED: { color: '#16a34a', bg: '#dcfce7', icon: FiCheckCircle },
  DISPATCHED: { color: '#2563eb', bg: '#dbeafe', icon: FiTruck },
  PROCESSING: { color: '#d97706', bg: '#fef3c7', icon: FiClock },
  ACCEPTED: { color: '#7c3aed', bg: '#ede9fe', icon: FiCheckCircle },
};

function MerchantDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [merchantData, setMerchantData] = useState(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);

        // Get merchant ID
        const merchant = await apiClient.get('/merchants/me');
        
        // Get balance info
        const balance = await queryBalance(merchant.id);
        
        // Get recent orders (last 3)
        const allOrders = await viewPreviousOrders(merchant.id);
        const recentOrders = allOrders.slice(0, 3);

        setMerchantData({
          creditLimit: balance.creditLimit,
          currentDebt: balance.currentDebt,
          recentOrders: recentOrders,
        });
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    if (user?.role === 'merchant') {
      loadDashboardData();
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e2e8f0',
          borderTop: '4px solid #6366f1',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!merchantData) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <FiAlertCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
        <p style={{ color: '#64748b' }}>Failed to load dashboard data</p>
      </div>
    );
  }

  const { creditLimit, currentDebt, recentOrders } = merchantData;

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
          background: isNearLimit ? '#fffbeb' : 'white',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          border: isNearLimit ? '1px solid #fcd34d' : '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
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
          <button 
            onClick={() => window.location.href = '/orders'}
            style={{
              background: 'none',
              border: 'none',
              color: '#6366f1',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            View all →
          </button>
        </div>

        {/* order rows */}
        <div>
          {recentOrders.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
              <p>No recent orders</p>
            </div>
          ) : (
            recentOrders.map((order, index) => {
              const statusStyle = STATUS_STYLES[order.status] || STATUS_STYLES.PROCESSING;
              const StatusIcon = statusStyle.icon;

              // Format date
              const orderDate = new Date(order.orderDate);
              const formattedDate = orderDate.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              });

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
                      #{order.id.substring(0, 8).toUpperCase()}
                    </p>
                    <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                      {formattedDate}
                    </p>
                  </div>

                  {/* Order total */}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.875rem' }}>
                      £{order.amountDue.toFixed(2)}
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
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default MerchantDashboard;