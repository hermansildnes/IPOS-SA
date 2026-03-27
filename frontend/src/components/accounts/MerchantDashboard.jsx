import { useState, useEffect } from 'react';
import {
  FiShoppingCart,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiTruck,
  FiCreditCard,
  FiBell,
  FiLock,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { queryBalance, viewPreviousOrders } from '../../services/orderService';
import { apiClient } from '../../services/apiClient';

// maps order status to a colour and icon for the status badge
// backend sends lowercase strings so keys must match exactly
const ORDER_STATUS_STYLES = {
  delivered: { color: '#16a34a', bg: '#dcfce7', icon: FiCheckCircle },
  dispatched: { color: '#2563eb', bg: '#dbeafe', icon: FiTruck },
  processing: { color: '#d97706', bg: '#fef3c7', icon: FiClock },
  accepted: { color: '#7c3aed', bg: '#ede9fe', icon: FiCheckCircle },
};

// account status styles for the badge shown in the header
const ACCOUNT_STATUS_STYLES = {
  normal: { bg: '#dcfce7', color: '#166534', label: 'Active' },
  suspended: { bg: '#fef3c7', color: '#92400e', label: 'Suspended' },
  in_default: { bg: '#fee2e2', color: '#dc2626', label: 'In Default' },
};

function MerchantDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [merchantData, setMerchantData] = useState(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);

        // get merchant details including account status and payment reminder fields
        const merchant = await apiClient.get('/merchants/me');

        // get balance info
        const balance = await queryBalance(merchant.id);

        // get recent orders (last 3)
        const allOrders = await viewPreviousOrders(merchant.id);
        const recentOrders = allOrders.slice(0, 3);

        setMerchantData({
          creditLimit: balance.creditLimit,
          currentDebt: balance.currentDebt,
          recentOrders: recentOrders,
          // account status stuff
          accountStatus: merchant.account_status,
          // reminder flags from the merchant record
          status1stReminder: merchant.status_1st_reminder,
          status2ndReminder: merchant.status_2nd_reminder,
          date1stReminder: merchant.date_1st_reminder,
          date2ndReminder: merchant.date_2nd_reminder,
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

  const {
    creditLimit,
    currentDebt,
    recentOrders,
    accountStatus,
    status1stReminder,
    status2ndReminder,
    date1stReminder,
    date2ndReminder,
  } = merchantData;

  // available credit = total limit minus what's already owed
  const availableCredit = creditLimit - currentDebt;

  // warn the merchant if they've used more than 90% of their credit
  const isNearLimit = creditLimit > 0 && currentDebt / creditLimit >= 0.9;

  // shows what percentage of credit has been used as a progress bar
  const debtPercentage = creditLimit > 0 ? Math.min((currentDebt / creditLimit) * 100, 100) : 0;

  // payment is overdue if either reminder flag is 'due'
  const hasPaymentReminder = status1stReminder === 'due' || status2ndReminder === 'due';
  const isSecondReminder = status2ndReminder === 'due';

  // account is suspended or defaulted
  const isSuspended = accountStatus === 'suspended';
  const isInDefault = accountStatus === 'in_default';
  const isRestricted = isSuspended || isInDefault;

  const accountStatusStyle = ACCOUNT_STATUS_STYLES[accountStatus] || ACCOUNT_STATUS_STYLES.normal;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Account suspension / default banner - shown when placing orders is blocked */}
      {isRestricted && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          background: isInDefault ? '#fee2e2' : '#fef3c7',
          border: `1px solid ${isInDefault ? '#fecaca' : '#fcd34d'}`,
          borderRadius: '0.75rem',
          padding: '1rem 1.25rem',
          color: isInDefault ? '#dc2626' : '#92400e',
        }}>
          <FiLock size={20} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          <div>
            <p style={{ fontWeight: '700', fontSize: '0.875rem' }}>
              {isInDefault ? 'Account In Default' : 'Account Suspended'}
            </p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.2rem', lineHeight: '1.5' }}>
              {isInDefault
                ? 'Your account is in default. New orders cannot be placed. Please contact InfoPharma to resolve this.'
                : 'Your account is suspended due to a payment overdue by more than 15 days. Orders are blocked until payment is received.'
              }
            </p>
          </div>
        </div>
      )}

      {/* Payment reminder banner - shown when a payment reminder has been triggered */}
      {hasPaymentReminder && !isRestricted && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          background: '#fffbeb',
          border: '1px solid #f59e0b',
          borderRadius: '0.75rem',
          padding: '1rem 1.25rem',
          color: '#92400e',
        }}>
          <FiBell size={20} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          <div>
            <p style={{ fontWeight: '700', fontSize: '0.875rem' }}>
              {isSecondReminder ? 'Payment Overdue — Final Reminder' : 'Payment Reminder'}
            </p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.2rem', lineHeight: '1.5' }}>
              {isSecondReminder
                ? `Your account has an overdue payment (since ${date2ndReminder || 'your last billing date'}). Your account may be suspended soon if payment is not received.`
                : `A payment is due on your account (since ${date1stReminder || 'your billing date'}). Please arrange a bank transfer to InfoPharma using the IBAN provided.`
              }
            </p>
          </div>
        </div>
      )}

      {/* Credit limit warning - only shows when merchant is near their limit */}
      {isNearLimit && !isRestricted && (
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

      {/* Account status and credit overview cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
      }}>
        {/* Account status card */}
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
            <FiCheckCircle size={16} style={{ color: '#6366f1' }} />
            <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
              Account Status
            </p>
          </div>
          <span style={{
            display: 'inline-block',
            background: accountStatusStyle.bg,
            color: accountStatusStyle.color,
            padding: '0.35rem 0.875rem',
            borderRadius: '9999px',
            fontSize: '0.875rem',
            fontWeight: '700',
          }}>
            {accountStatusStyle.label}
          </span>
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
            <FiCreditCard size={16} style={{ color: '#16a34a' }} />
            <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
              Available Credit
            </p>
          </div>
          <p style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            // red when almost at limit, green when plenty available
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
            Credit Usage (Limit: £{creditLimit.toLocaleString()})
          </p>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            {debtPercentage.toFixed(0)}% used
          </p>
        </div>
        {/* grey track behind the coloured progress bar */}
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
              // backend sends lowercase status - map to style object
              const statusStyle = ORDER_STATUS_STYLES[order.status] || ORDER_STATUS_STYLES.accepted;
              const StatusIcon = statusStyle.icon;

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
                    // alternate row background for readability
                    background: index % 2 === 0 ? 'white' : '#fafafa',
                    borderBottom: index < recentOrders.length - 1 ? '1px solid #f1f5f9' : 'none',
                  }}
                >
                  {/* order ID and date */}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.875rem' }}>
                      #{order.id.substring(0, 8).toUpperCase()}
                    </p>
                    <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                      {formattedDate}
                    </p>
                  </div>

                  {/* order total */}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.875rem' }}>
                      £{order.amountDue.toFixed(2)}
                    </p>
                  </div>

                  {/* status badge with colour and icon */}
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
