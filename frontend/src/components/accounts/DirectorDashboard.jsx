import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiTrendingUp,
  FiAlertCircle,
  FiDollarSign,
} from 'react-icons/fi';
import { getAllMerchants } from '../../services/merchantService';
import { viewAllOrders } from '../../services/orderService';

function DirectorDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [previousMonthRevenue, setPreviousMonthRevenue] = useState(0);
  const [totalOutstandingDebt, setTotalOutstandingDebt] = useState(0);
  const [defaultedAccounts, setDefaultedAccounts] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // fetch merchants and orders in parallel
        const [merchants, allOrders] = await Promise.all([
          getAllMerchants(),
          viewAllOrders(),
        ]);

        // sum up outstanding debt across all merchant accounts
        const totalDebt = merchants.reduce((sum, m) => sum + (m.currentDebt || 0), 0);

        // build list of defaulted accounts with their debt and company name
        const defaulted = merchants
          .filter((m) => m.account_status === 'in_default')
          .map((m) => ({
            id: m.id,
            name: m.company_name || m.companyName,
            debt: m.currentDebt || 0,
          }));

        // calculate monthly revenue from orders this calendar month
        const now = new Date();
        const thisMonthRevenue = allOrders
          .filter((o) => {
            const d = new Date(o.orderDate);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          })
          .reduce((sum, o) => sum + (o.amountDue || 0), 0);

        // previous month revenue for the percentage change indicator
        const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const prevMonthRevenue = allOrders
          .filter((o) => {
            const d = new Date(o.orderDate);
            return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
          })
          .reduce((sum, o) => sum + (o.amountDue || 0), 0);

        setMonthlyRevenue(thisMonthRevenue);
        setPreviousMonthRevenue(prevMonthRevenue);
        setTotalOutstandingDebt(totalDebt);
        setDefaultedAccounts(defaulted);
      } catch (err) {
        console.error('failed to load director dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // calculate month on month revenue change as a percentage
  const revenueChange = previousMonthRevenue > 0
    ? (((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100).toFixed(1)
    : null;

  // positive change = green, negative = red
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
            {loading ? '—' : `£${monthlyRevenue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
          {/* shows whether revenue went up or down vs last month */}
          {!loading && revenueChange !== null && (
            <p style={{
              fontSize: '0.8rem',
              marginTop: '0.5rem',
              color: isPositiveChange ? '#86efac' : '#fca5a5',
            }}>
              {isPositiveChange ? '↑' : '↓'} {Math.abs(revenueChange)}% vs last month
            </p>
          )}
          {!loading && revenueChange === null && (
            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.6 }}>
              No data for previous month
            </p>
          )}
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
            {loading ? '—' : `£${totalOutstandingDebt.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>
            Across all merchant accounts
          </p>
        </div>
      </div>

      {/* defaulted accounts table - director can reinstate these (SA-DIR-01) */}
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

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
            Loading...
          </div>
        ) : defaultedAccounts.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
            No accounts currently in default
          </div>
        ) : (
          defaultedAccounts.map((account, index) => (
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
              {/* merchant name and outstanding debt */}
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.875rem' }}>
                  {account.name}
                </p>
                <p style={{ color: '#dc2626', fontSize: '0.75rem' }}>
                  Outstanding: £{account.debt.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              {/* clicking review account takes director to the account detail page
                  where they can trigger reinstatement with a reason */}
              <button
                onClick={() => navigate(`/accounts/${account.id}`)}
                style={{
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
          ))
        )}
      </div>
    </div>
  );
}

export default DirectorDashboard;
