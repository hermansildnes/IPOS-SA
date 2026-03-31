import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllMerchants, convertStaffToMerchant } from '../services/merchantService';
import { getStaffUsers, changeUserRole, deleteStaffUser } from '../services/authService';
import { STATUS_STYLES, ROLES } from '../utils/constants';
import {
  FiUsers,
  FiPlus,
  FiSearch,
  FiFilter,
  FiChevronRight,
  FiAlertCircle,
  FiUser,
  FiCheck,
  FiRefreshCw,
  FiTrash2,
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

  // staff user data - admin only
  const [staffUsers, setStaffUsers] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  // tracks which user has a pending role change in progress
  const [roleChanging, setRoleChanging] = useState({});
  // local override of the selected role for each user before it's saved
  const [pendingRoles, setPendingRoles] = useState({});

  // delete staff user confirmation state - { userId, username } or null
  const [deleteStaffConfirm, setDeleteStaffConfirm] = useState(null);
  const [isDeletingStaff, setIsDeletingStaff] = useState(false);

  // convert-to-merchant modal state - opens when clicking "→ Merchant" on a staff user
  const [convertModal, setConvertModal] = useState(null); // { userId, username }
  const [convertForm, setConvertForm] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    creditLimit: '',
    discountPlanType: 'fixed',
    fixedDiscountRate: '',
  });
  const [convertSaving, setConvertSaving] = useState(false);
  const [convertError, setConvertError] = useState('');

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

  // fetch staff users - only needed for admins
  useEffect(() => {
    if (user?.role !== ROLES.ADMIN) return;

    async function fetchStaff() {
      setStaffLoading(true);
      try {
        const users = await getStaffUsers();
        setStaffUsers(users);
        // initialise pending roles to match current roles
        const initialRoles = {};
        users.forEach(u => { initialRoles[u.id] = u.role; });
        setPendingRoles(initialRoles);
      } catch (_) {
        // not a fatal error - just don't show the staff section
      } finally {
        setStaffLoading(false);
      }
    }

    fetchStaff();
  }, [user]);

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

  // save a role change for a specific staff user
  async function handleRoleChange(userId) {
    const newRole = pendingRoles[userId];
    setRoleChanging(prev => ({ ...prev, [userId]: true }));
    const result = await changeUserRole(userId, newRole);
    setRoleChanging(prev => ({ ...prev, [userId]: false }));

    if (result.success) {
      // update the displayed role to match what was saved
      setStaffUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } else {
      // reset back to the actual role on failure
      const user = staffUsers.find(u => u.id === userId);
      if (user) setPendingRoles(prev => ({ ...prev, [userId]: user.role }));
      alert(result.error || 'Failed to change role');
    }
  }

  // permanently delete a staff account - admin only
  async function handleDeleteStaffUser() {
    if (!deleteStaffConfirm) return;
    setIsDeletingStaff(true);
    const result = await deleteStaffUser(deleteStaffConfirm.userId);
    setIsDeletingStaff(false);

    if (result.success) {
      setDeleteStaffConfirm(null);
      setStaffUsers(prev => prev.filter(u => u.id !== deleteStaffConfirm.userId));
    } else {
      alert(result.error || 'Failed to delete user');
      setDeleteStaffConfirm(null);
    }
  }

  // open the convert-to-merchant modal for a specific staff user
  function openConvertModal(staffUser) {
    setConvertModal({ userId: staffUser.id, username: staffUser.username });
    setConvertForm({
      companyName: '',
      contactName: staffUser.name || staffUser.username,
      contactEmail: staffUser.email || '',
      contactPhone: '',
      address: '',
      creditLimit: '',
      discountPlanType: 'fixed',
      fixedDiscountRate: '',
    });
    setConvertError('');
  }

  // submit the convert-to-merchant form
  async function handleConvertToMerchant() {
    if (!convertForm.companyName.trim()) {
      setConvertError('Company name is required');
      return;
    }
    if (!convertForm.contactName.trim()) {
      setConvertError('Contact name is required');
      return;
    }
    if (!convertForm.address.trim()) {
      setConvertError('Address is required');
      return;
    }
    if (!convertForm.creditLimit || isNaN(parseFloat(convertForm.creditLimit))) {
      setConvertError('A valid credit limit is required');
      return;
    }
    if (convertForm.discountPlanType === 'fixed' && !convertForm.fixedDiscountRate && convertForm.fixedDiscountRate !== '0') {
      setConvertError('Fixed discount rate is required');
      return;
    }

    setConvertSaving(true);
    setConvertError('');

    const result = await convertStaffToMerchant(convertModal.userId, {
      companyName: convertForm.companyName,
      contactName: convertForm.contactName,
      contactEmail: convertForm.contactEmail,
      contactPhone: convertForm.contactPhone || null,
      address: convertForm.address,
      creditLimit: parseFloat(convertForm.creditLimit),
      discountPlanType: convertForm.discountPlanType,
      fixedDiscountRate: convertForm.discountPlanType === 'fixed'
        ? parseFloat(convertForm.fixedDiscountRate)
        : null,
    });

    setConvertSaving(false);

    if (result.success) {
      setConvertModal(null);
      // remove the converted user from staff list and reload merchants
      setStaffUsers(prev => prev.filter(u => u.id !== convertModal.userId));
      const updated = await getAllMerchants();
      setAllMerchants(updated);
    } else {
      setConvertError(result.error || 'Failed to convert account');
    }
  }

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

      {/* staff users section - admin only, shows system users and lets you change their roles */}
      {user?.role === ROLES.ADMIN && (
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.25rem' }}>
              Staff Accounts
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Internal staff users — admins, managers and directors
            </p>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}>
            {staffLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                <p style={{ fontSize: '0.875rem' }}>Loading staff accounts...</p>
              </div>
            ) : staffUsers.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                <FiUser size={24} style={{ marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.875rem' }}>No staff accounts found</p>
              </div>
            ) : (
              staffUsers.map((staffUser, index) => {
                const isChanging = roleChanging[staffUser.id];
                const currentPendingRole = pendingRoles[staffUser.id] ?? staffUser.role;
                const hasUnsavedChange = currentPendingRole !== staffUser.role;

                return (
                  <div
                    key={staffUser.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.875rem 1.25rem',
                      borderBottom: index < staffUsers.length - 1 ? '1px solid #f1f5f9' : 'none',
                      gap: '1rem',
                    }}
                  >
                    {/* avatar */}
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0 }}>
                      <FiUser size={16} />
                    </div>

                    {/* username and email */}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.875rem' }}>{staffUser.username}</p>
                      <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{staffUser.email}</p>
                    </div>

                    {/* role selector */}
                    <select
                      value={currentPendingRole}
                      onChange={(e) => setPendingRoles(prev => ({ ...prev, [staffUser.id]: e.target.value }))}
                      disabled={isChanging}
                      style={{ padding: '0.375rem 0.5rem', border: hasUnsavedChange ? '1px solid #6366f1' : '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.8rem', outline: 'none', cursor: 'pointer', background: hasUnsavedChange ? '#ede9fe' : 'white', color: hasUnsavedChange ? '#6366f1' : '#374151' }}
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="director">Director</option>
                    </select>

                    {/* save button - only shown if role was changed */}
                    {hasUnsavedChange && (
                      <button
                        onClick={() => handleRoleChange(staffUser.id)}
                        disabled={isChanging}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: isChanging ? '#cbd5e1' : '#6366f1', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.375rem 0.75rem', fontSize: '0.8rem', fontWeight: '600', cursor: isChanging ? 'not-allowed' : 'pointer' }}
                      >
                        <FiCheck size={13} />
                        {isChanging ? 'Saving...' : 'Save'}
                      </button>
                    )}

                    {/* convert to merchant - opens a modal to collect the merchant details */}
                    {!hasUnsavedChange && (
                      <button
                        onClick={() => openConvertModal(staffUser)}
                        title="Convert to Merchant Account"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '0.375rem', padding: '0.375rem 0.625rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
                      >
                        <FiRefreshCw size={12} />
                        → Merchant
                      </button>
                    )}

                    {/* delete staff user - admin only, shown when no pending role change */}
                    {!hasUnsavedChange && (
                      <button
                        onClick={() => setDeleteStaffConfirm({ userId: staffUser.id, username: staffUser.username })}
                        title="Delete staff account"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '0.375rem', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <FiTrash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* delete staff account confirmation modal */}
      {deleteStaffConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '2rem', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.75rem' }}>
              Delete Staff Account
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
              Are you sure you want to permanently delete <strong>{deleteStaffConfirm.username}</strong>?
            </p>
            <p style={{ fontSize: '0.8rem', color: '#dc2626', marginBottom: '1.5rem' }}>
              This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteStaffConfirm(null)}
                disabled={isDeletingStaff}
                style={{ padding: '0.625rem 1.25rem', background: 'white', color: '#374151', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStaffUser}
                disabled={isDeletingStaff}
                style={{ padding: '0.625rem 1.25rem', background: isDeletingStaff ? '#fca5a5' : '#dc2626', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '600', cursor: isDeletingStaff ? 'not-allowed' : 'pointer' }}
              >
                {isDeletingStaff ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* convert staff to merchant modal */}
      {convertModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '2rem', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.25rem' }}>
              Convert to Merchant Account
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Converting <strong>{convertModal.username}</strong> — fill in their merchant details below.
            </p>

            {convertError && (
              <div style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.625rem 0.875rem', fontSize: '0.8rem', fontWeight: '500', marginBottom: '1rem' }}>
                {convertError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'Company Name *', key: 'companyName', placeholder: 'e.g. PharmaCo Ltd' },
                { label: 'Contact Name *', key: 'contactName', placeholder: 'e.g. Jane Smith' },
                { label: 'Contact Email *', key: 'contactEmail', placeholder: 'e.g. jane@pharmaco.com' },
                { label: 'Contact Phone', key: 'contactPhone', placeholder: 'e.g. 07700 900123' },
                { label: 'Address *', key: 'address', placeholder: 'e.g. 123 High Street, London' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>{label}</label>
                  <input
                    type="text"
                    value={convertForm[key]}
                    onChange={(e) => setConvertForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>Credit Limit (£) *</label>
                <input
                  type="number"
                  value={convertForm.creditLimit}
                  onChange={(e) => setConvertForm(prev => ({ ...prev, creditLimit: e.target.value }))}
                  placeholder="e.g. 5000"
                  min="0"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>Discount Plan *</label>
                <select
                  value={convertForm.discountPlanType}
                  onChange={(e) => setConvertForm(prev => ({ ...prev, discountPlanType: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.875rem', outline: 'none' }}
                >
                  <option value="fixed">Fixed</option>
                  <option value="flexible">Flexible (set tiers later)</option>
                </select>
              </div>

              {convertForm.discountPlanType === 'fixed' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>Fixed Discount Rate (%) *</label>
                  <input
                    type="number"
                    value={convertForm.fixedDiscountRate}
                    onChange={(e) => setConvertForm(prev => ({ ...prev, fixedDiscountRate: e.target.value }))}
                    placeholder="e.g. 5"
                    min="0"
                    max="100"
                    step="0.01"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button onClick={() => setConvertModal(null)} disabled={convertSaving} style={{ padding: '0.625rem 1.25rem', background: 'white', color: '#374151', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleConvertToMerchant} disabled={convertSaving} style={{ padding: '0.625rem 1.25rem', background: convertSaving ? '#cbd5e1' : '#6366f1', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '600', cursor: convertSaving ? 'not-allowed' : 'pointer' }}>
                {convertSaving ? 'Converting...' : 'Create Merchant Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountsPage;