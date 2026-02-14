import {
  FiTrendingUp,
  FiAlertCircle,
  FiUsers,
  FiDollarSign,
} from 'react-icons/fi';

// mock financial overview data
// TODO: replace with real API calls when backend is ready
const MOCK_DIRECTOR_DATA = {
  monthlyRevenue: 48750,
  previousMonthRevenue: 42300,
  totalOutstandingDebt: 23400,
  defaultedAccounts: [
    {
      id: 1,
      name: 'MedShop Ltd',
      debt: 4200,
      daysPastDue: 35,
    },
    {
      id: 2,
      name: 'QuickPharma Ltd',
      debt: 2800,
      daysPastDue: 42,
    },
  ],
};

function DirectorDashboard() {
  const { monthlyRevenue, previousMonthRevenue, totalOutstandingDebt, defaultedAccounts } =
    MOCK_DIRECTOR_DATA;

  // Calculate month on month revenue change as a percentage
  const revenueChange = (
    ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
  ).toFixed(1);

  // positive change = green, negative = red etc
  const isPositiveChange = revenueChange > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Revenue overview cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
      }}>

        {/* Monthly revenue */}
        <div style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <FiTrendingUp size={16} />
            <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>Monthly Revenue</p>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: '700' }}>
            £{monthlyRevenue.toLocaleString()}
          </p>
          {/* shows whether revenue went up or down vs last month */}
          <p style={{
            fontSize: '0.8rem',
            marginTop: '0.5rem',
            color: isPositiveChange ? '#86efac' : '#fca5a5',
          }}>
            {isPositiveChange ? '↑' : '↓'} {Math.abs(revenueChange)}% vs last month
          </p>
        </div>

        {/* Total outstanding debt across all merchants */}
        <div style={{
          background: 'white',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <FiDollarSign size={16} style={{ color: '#f59e0b' }} />
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Outstanding Debt</p>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: '700', color: '#0f172a' }}>
            £{totalOutstandingDebt.toLocaleString()}
          </p>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>
            Across all merchant accounts
          </p>
        </div>
      </div>

      {/* 
      defaulted accounts table - director can reinstate these (SA-DIR-01) */}
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
          <FiAlertCircle size={16} style={{ color: '#dc2626' }} />
          <h3 style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>
            Accounts In Default (Require Action)
          </h3>
        </div>

        {defaultedAccounts.map((account, index) => (
          <div
            key={account.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '1rem 1.25rem',
              borderBottom: index < defaultedAccounts.length - 1
                ? '1px solid #f1f5f9'
                : 'none',
            }}
          >
            {/* Merchant name and days past due */}
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.875rem' }}>
                {account.name}
              </p>
              <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>
                {account.daysPastDue} days past due
              </p>
            </div>

            {/* Debt amount */}
            <p style={{ fontWeight: '600', color: '#0f172a', marginRight: '1rem' }}>
              £{account.debt.toLocaleString()}
            </p>

            {/* reinstate button -  SA-DIR-01 requirement
                Full functionality will be built in the Accounts module */}
            <button style={{
              background: '#fee2e2',
              color: '#dc2626',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}>
              Review Account
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DirectorDashboard;