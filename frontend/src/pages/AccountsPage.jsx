import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllMerchants } from '../services/merchantService';
import { STATUS_STYLES, ROLES } from '../utils/constants';
import {
  FiUsers,
  FiPlus,
  FiSearch,
  FiFilter,
  FiChevronRight,
  FiAlertCircle,
} from 'react-icons/fi';

function AccountsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // merchants data state
  const [allMerchants, setAllMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // fetch merchants on component mount
  useEffect(() => {
    async function fetchMerchants() {
      try {
        setLoading(true);
        const merchants = await getAllMerchants();
        setAllMerchants(merchants);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMerchants();
  }, []);

  // apply search and status filter together - both work simultaneously
  const filteredMerchants = allMerchants.filter((merchant) => {
    // check if merchant matches the search query
    const matchesSearch =
      merchant.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      merchant.account_number?.includes(searchQuery) ||
      merchant.contact_name?.toLowerCase().includes(searchQuery.toLowerCase());

    // check if merchant matches the status filter
    const matchesStatus =
      statusFilter === 'all' || merchant.account_status === statusFilter;

    // only show merchants that match BOTH filters
    return matchesSearch && matchesStatus;
  });

  // count merchants by status for the summary cards at the top
  const statusCounts = {
    all: allMerchants.length,
    normal: allMerchants.filter((m) => m.account_status === 'normal').length,
    suspended: allMerchants.filter((m) => m.account_status === 'suspended').length,
    in_default: allMerchants.filter((m) => m.account_status === 'in_default').length,
  };

  // show loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem',
          }} />
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading accounts...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // show error state
  if (error) {
    return (
      <div style={{
        padding: '3rem',
        textAlign: 'center',
        color: '#ef4444',
      }}>
        <FiAlertCircle size={48} style={{ marginBottom: '1rem' }} />
        <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Failed to load accounts</p>
        <p style={{ fontSize: '0.875rem' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* page header with title and create button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#0f172a',
            marginBottom: '0.25rem',
          }}>
            Merchant Accounts
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Manage merchant accounts, credit limits and discount plans
          </p>
        </div>

        {/* only admins can create new merchant accounts */}
        {user?.role === ROLES.ADMIN && (
          <button
            onClick={() => navigate('/accounts/new')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '0.625rem',
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            }}
          >
            <FiPlus size={16} />
            New Account
          </button>
        )}
      </div>

      {/* status summary cards - clicking one filters the list below */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
      }}>
        {[
          { key: 'all', label: 'All Accounts', color: '#6366f1', bg: '#ede9fe' },
          { key: 'normal', label: 'Normal', color: '#16a34a', bg: '#dcfce7' },
          { key: 'suspended', label: 'Suspended', color: '#d97706', bg: '#fef3c7' },
          { key: 'in_default', label: 'In Default', color: '#dc2626', bg: '#fee2e2' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setStatusFilter(item.key)}
            style={{
              background: statusFilter === item.key ? item.bg : 'white',
              border: statusFilter === item.key
                ? `2px solid ${item.color}`
                : '1px solid #e2e8f0',
              borderRadius: '0.75rem',
              padding: '1rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            <p style={{
              fontSize: '0.75rem',
              color: statusFilter === item.key ? item.color : '#64748b',
              fontWeight: '500',
              marginBottom: '0.25rem',
            }}>
              {item.label}
            </p>
            <p style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: statusFilter === item.key ? item.color : '#0f172a',
            }}>
              {statusCounts[item.key]}
            </p>
          </button>
        ))}
      </div>

      {/* Search bar and filter row */}
      <div style={{
        background: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
        }}>
          {/* Search input */}
          <div style={{ position: 'relative', flex: 1 }}>
            <FiSearch style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
            }} />
            <input
              type="text"
              placeholder="Search by company name, account number or contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '2.25rem',
                paddingRight: '1rem',
                paddingTop: '0.625rem',
                paddingBottom: '0.625rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box',
                color: '#0f172a',
              }}
            />
          </div>

          {/* Results count */}
          <p style={{ color: '#64748b', fontSize: '0.875rem', flexShrink: 0 }}>
            {filteredMerchants.length} of {allMerchants.length} accounts
          </p>
        </div>

        {/* Merchant list table */}
        {filteredMerchants.length === 0 ? (
          // empty state when no results match the filters
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: '#94a3b8',
          }}>
            <FiUsers size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ fontWeight: '500' }}>No accounts found</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Try adjusting your search or filter
            </p>
          </div>
        ) : (
          filteredMerchants.map((merchant, index) => {
            const statusStyle = STATUS_STYLES[merchant.account_status] || STATUS_STYLES.normal;

            // calculate available credit for each merchant row
            const availableCredit = merchant.credit_limit - (merchant.current_debt || 0);

            return (
              <div
                key={merchant.id}
                onClick={() => navigate(`/accounts/${merchant.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1rem 1.25rem',
                  borderBottom: index < filteredMerchants.length - 1
                    ? '1px solid #f1f5f9'
                    : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {/* avatar circle using first letter of company name */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#ede9fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6366f1',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  flexShrink: 0,
                  marginRight: '1rem',
                }}>
                  {merchant.company_name?.charAt(0) || 'M'}
                </div>

                {/* Company name and account number */}
                <div style={{ flex: 2 }}>
                  <p style={{
                    fontWeight: '600',
                    color: '#0f172a',
                    fontSize: '0.875rem',
                  }}>
                    {merchant.company_name}
                  </p>
                  <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                    #{merchant.account_number} · {merchant.contact_name}
                  </p>
                </div>

                {/* Account status badge */}
                <div style={{ flex: 1 }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: statusStyle.bg,
                    color: statusStyle.color,
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                  }}>
                    {statusStyle.label}
                  </span>
                </div>

                {/* Credit info */}
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>
                    £{availableCredit.toLocaleString()} available
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    of £{merchant.credit_limit?.toLocaleString()} limit
                  </p>
                </div>

                {/* Warning icon for accounts that need attention */}
                {merchant.account_status !== 'normal' && (
                  <FiAlertCircle
                    size={16}
                    style={{ color: statusStyle.color, marginLeft: '1rem', flexShrink: 0 }}
                  />
                )}

                {/* Arrow indicating the row is clickable */}
                <FiChevronRight
                  size={16}
                  style={{ color: '#94a3b8', marginLeft: '0.5rem', flexShrink: 0 }}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default AccountsPage;