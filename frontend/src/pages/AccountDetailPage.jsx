import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getMerchantById,
  getCurrentMerchant,
  updateMerchant,
  updateMyContactDetails,
  reinstateAccount,
} from '../services/merchantService';
import { changePassword } from '../services/authService';
import { STATUS_STYLES, ROLES, ACCOUNT_STATUS, DISCOUNT_TYPES } from '../utils/constants';
import {
  FiArrowLeft,
  FiEdit,
  FiSave,
  FiX,
  FiAlertCircle,
  FiCheckCircle,
  FiUser,
  FiPhone,
  FiMail,
  FiMapPin,
  FiCreditCard,
  FiPercent,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi';

// helper to convert backend threshold format to the simpler frontend format
// backend gives { up_to: X, rate: Y } or { above: X, rate: Y }
// we use { limit: X|null, rate: Y } where null = open-ended last tier
function parseThresholdsFromBackend(raw) {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((t) => ({
    limit: t.upTo ?? t.up_to ?? null,
    rate: t.rate ?? 0,
  }));
}

// default tiers to show when switching to flexible plan for the first time
const DEFAULT_FLEXIBLE_TIERS = [
  { limit: 1000, rate: 5 },
  { limit: null, rate: 10 },
];

function AccountDetailPage() {
  // id comes from the URL when management roles view /accounts/:id
  // no id means we're on /my-account (merchant self-service page)
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isMerchantSelfView = user?.role === ROLES.MERCHANT && !id;

  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showReinstateModal, setShowReinstateModal] = useState(false);
  const [reinstateReason, setReinstateReason] = useState('');
  const [message, setMessage] = useState(null);

  // formData mirrors the editable fields on the merchant account
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    creditLimit: 0,
    discountPlanType: DISCOUNT_TYPES.FIXED,
    fixedDiscountRate: 0,
    flexibleThresholds: DEFAULT_FLEXIBLE_TIERS,
    accountStatus: ACCOUNT_STATUS.NORMAL,
  });

  // validation errors for the flexible tier editor
  const [tierErrors, setTierErrors] = useState('');

  // password change form state - only used on the merchant self-view (/my-account)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState(null);

  useEffect(() => {
    async function loadMerchant() {
      try {
        setLoading(true);

        const loaded = isMerchantSelfView
          ? await getCurrentMerchant()
          : await getMerchantById(id);

        setMerchant(loaded);

        if (loaded) {
          const existingTiers = parseThresholdsFromBackend(loaded.flexibleThresholds);
          setFormData({
            companyName: loaded.companyName || '',
            contactName: loaded.contactName || '',
            contactEmail: loaded.contactEmail || '',
            contactPhone: loaded.contactPhone || '',
            address: loaded.address || '',
            creditLimit: loaded.creditLimit || 0,
            discountPlanType: loaded.discountPlanType || DISCOUNT_TYPES.FIXED,
            fixedDiscountRate: loaded.fixedDiscountRate || 0,
            flexibleThresholds: existingTiers.length > 0
              ? existingTiers
              : DEFAULT_FLEXIBLE_TIERS,
            accountStatus: loaded.accountStatus || ACCOUNT_STATUS.NORMAL,
          });
        }
      } finally {
        setLoading(false);
      }
    }

    loadMerchant();
  }, [id, isMerchantSelfView]);

  // loading spinner - shown while fetching account
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
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading account...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
        <FiAlertCircle size={32} style={{ marginBottom: '1rem' }} />
        <p style={{ fontWeight: '500' }}>Merchant not found</p>
        <button
          onClick={() => navigate(user?.role === ROLES.MERCHANT ? '/dashboard' : '/accounts')}
          style={{
            marginTop: '1rem',
            background: 'none',
            border: 'none',
            color: '#6366f1',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          ← Back
        </button>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[merchant.status] || STATUS_STYLES.normal;
  const availableCredit = (merchant.creditLimit || 0) - (merchant.currentDebt || 0);

  // admins and managers can edit any merchant account
  // merchants can edit their own contact details (email and phone only)
  const canEdit = user?.role === ROLES.ADMIN || user?.role === ROLES.MANAGER || isMerchantSelfView;

  // only the director can reinstate a defaulted account
  const canReinstate =
    user?.role === ROLES.DIRECTOR && merchant.status === ACCOUNT_STATUS.IN_DEFAULT;

  const backPath = user?.role === ROLES.MERCHANT ? '/dashboard' : '/accounts';

  // --- flexible tier management ---

  // add a new tier above the final open-ended tier
  const addTier = () => {
    const tiers = [...formData.flexibleThresholds];
    // insert a new bounded tier before the last open-ended one
    const lastBounded = tiers.filter((t) => t.limit !== null);
    const lastLimit = lastBounded.length > 0 ? lastBounded[lastBounded.length - 1].limit : 0;
    const openTierIndex = tiers.findIndex((t) => t.limit === null);
    const newTier = { limit: lastLimit + 1000, rate: 0 };
    if (openTierIndex >= 0) {
      tiers.splice(openTierIndex, 0, newTier);
    } else {
      tiers.push(newTier);
    }
    setFormData({ ...formData, flexibleThresholds: tiers });
    setTierErrors('');
  };

  // remove a specific tier (can't remove the last open-ended tier)
  const removeTier = (index) => {
    const tiers = [...formData.flexibleThresholds];
    tiers.splice(index, 1);
    setFormData({ ...formData, flexibleThresholds: tiers });
    setTierErrors('');
  };

  // update a single tier field
  const updateTier = (index, field, value) => {
    const tiers = formData.flexibleThresholds.map((t, i) =>
      i === index ? { ...t, [field]: value } : t
    );
    setFormData({ ...formData, flexibleThresholds: tiers });
    setTierErrors('');
  };

  // validate that tiers are in strict ascending order with no gaps or overlaps
  const validateTiers = (tiers) => {
    const bounded = tiers.filter((t) => t.limit !== null);
    for (let i = 1; i < bounded.length; i++) {
      if (bounded[i].limit <= bounded[i - 1].limit) {
        return 'Tier thresholds must be in ascending order with no duplicates';
      }
    }
    for (const t of tiers) {
      if (t.rate < 0 || t.rate > 100) {
        return 'Discount rates must be between 0 and 100';
      }
    }
    return null;
  };

  // save edits back to the backend
  const handleSave = async () => {
    // validate flexible tiers before saving (admin/manager only)
    if (!isMerchantSelfView && formData.discountPlanType === DISCOUNT_TYPES.FLEXIBLE) {
      const err = validateTiers(formData.flexibleThresholds);
      if (err) {
        setTierErrors(err);
        return;
      }
    }

    setIsSaving(true);
    setMessage(null);

    // merchants only update their own contact details via the /merchants/me endpoint
    // admin/manager use the full update endpoint
    const result = isMerchantSelfView
      ? await updateMyContactDetails({
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone,
        })
      : await updateMerchant(merchant.id, formData);

    setIsSaving(false);

    if (result.success) {
      setMerchant(result.merchant);
      const existingTiers = parseThresholdsFromBackend(result.merchant.flexibleThresholds);
      setFormData({
        companyName: result.merchant.companyName || '',
        contactName: result.merchant.contactName || '',
        contactEmail: result.merchant.contactEmail || '',
        contactPhone: result.merchant.contactPhone || '',
        address: result.merchant.address || '',
        creditLimit: result.merchant.creditLimit || 0,
        discountPlanType: result.merchant.discountPlanType || DISCOUNT_TYPES.FIXED,
        fixedDiscountRate: result.merchant.fixedDiscountRate || 0,
        flexibleThresholds: existingTiers.length > 0
          ? existingTiers
          : DEFAULT_FLEXIBLE_TIERS,
        accountStatus: result.merchant.accountStatus || ACCOUNT_STATUS.NORMAL,
      });
      setIsEditing(false);
      setTierErrors('');
      setMessage({ type: 'success', text: 'Account updated successfully' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to save changes' });
    }
  };

  // discard edits and return to view mode
  const handleCancel = () => {
    const existingTiers = parseThresholdsFromBackend(merchant.flexibleThresholds);
    setFormData({
      companyName: merchant.companyName || '',
      contactName: merchant.contactName || '',
      contactEmail: merchant.contactEmail || '',
      contactPhone: merchant.contactPhone || '',
      address: merchant.address || '',
      creditLimit: merchant.creditLimit || 0,
      discountPlanType: merchant.discountPlanType || DISCOUNT_TYPES.FIXED,
      fixedDiscountRate: merchant.fixedDiscountRate || 0,
      flexibleThresholds: existingTiers.length > 0
        ? existingTiers
        : DEFAULT_FLEXIBLE_TIERS,
      accountStatus: merchant.accountStatus || ACCOUNT_STATUS.NORMAL,
    });
    setIsEditing(false);
    setTierErrors('');
  };

  // director reinstating a defaulted account - requires a reason for the audit trail
  const handleReinstate = async () => {
    const result = await reinstateAccount(merchant.id, reinstateReason, user?.id);

    if (result.success) {
      if (result.merchant) {
        setMerchant(result.merchant);
      } else {
        const refreshed = await getMerchantById(merchant.id);
        setMerchant(refreshed);
      }
      setShowReinstateModal(false);
      setReinstateReason('');
      setMessage({ type: 'success', text: 'Account successfully reinstated' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to reinstate account' });
    }
  };

  // figure out what tier applies to a given order total (used for view-mode display)
  const getTierLabel = (tier, index, allTiers) => {
    if (tier.limit !== null) {
      const prevLimit = index > 0 ? allTiers[index - 1].limit : 0;
      return prevLimit > 0
        ? `£${prevLimit.toLocaleString()} – £${tier.limit.toLocaleString()}`
        : `Up to £${tier.limit.toLocaleString()}`;
    }
    // open-ended final tier
    const prevLimit = index > 0 ? allTiers[index - 1].limit : 0;
    return `Over £${prevLimit?.toLocaleString() || '0'}`;
  };

  const pageTitle = isMerchantSelfView ? 'My Account' : merchant.companyName;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '900px' }}>

      {/* header row with back button, title and action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => navigate(backPath)}
          style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            padding: '0.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FiArrowLeft size={16} style={{ color: '#64748b' }} />
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
              {pageTitle}
            </h1>
            <span style={{
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
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Account #{merchant.accountNumber}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {/* reinstate button - director only, defaulted accounts only */}
          {canReinstate && (
            <button
              onClick={() => setShowReinstateModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '0.625rem',
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              <FiCheckCircle size={16} />
              Reinstate Account
            </button>
          )}

          {canEdit && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
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
              }}
            >
              <FiEdit size={16} />
              Edit Account
            </button>
          )}

          {isEditing && (
            <>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'white',
                  color: '#64748b',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.625rem',
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.5 : 1,
                }}
              >
                <FiX size={16} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: isSaving
                    ? '#cbd5e1'
                    : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.625rem',
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                }}
              >
                {isSaving ? (
                  <>
                    <div style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSave size={16} />
                    Save Changes
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* success / error banner */}
      {message && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${message.type === 'success' ? '#86efac' : '#fecaca'}`,
          color: message.type === 'success' ? '#16a34a' : '#dc2626',
          padding: '0.875rem 1.25rem',
          borderRadius: '0.75rem',
          fontSize: '0.875rem',
          fontWeight: '500',
        }}>
          {message.type === 'success'
            ? <FiCheckCircle size={16} />
            : <FiAlertCircle size={16} />
          }
          {message.text}
        </div>
      )}

      {/* two-column layout: contact details left, credit + discount right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

        {/* contact details card */}
        <div style={{
          background: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem',
          }}>
            <FiUser size={16} style={{ color: '#6366f1' }} />
            <h3 style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>
              Contact Details
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* company name and contact name: editable by admin/manager only */}
            <DetailField
              icon={FiUser}
              label="Company Name"
              value={formData.companyName}
              isEditing={isEditing && !isMerchantSelfView}
              onChange={(v) => setFormData({ ...formData, companyName: v })}
            />
            <DetailField
              icon={FiUser}
              label="Contact Name"
              value={formData.contactName}
              isEditing={isEditing && !isMerchantSelfView}
              onChange={(v) => setFormData({ ...formData, contactName: v })}
            />
            {/* email and phone: merchants can update these themselves */}
            <DetailField
              icon={FiMail}
              label="Email"
              value={formData.contactEmail}
              isEditing={isEditing}
              onChange={(v) => setFormData({ ...formData, contactEmail: v })}
            />
            <DetailField
              icon={FiPhone}
              label="Phone"
              value={formData.contactPhone}
              isEditing={isEditing}
              onChange={(v) => setFormData({ ...formData, contactPhone: v })}
            />
            <DetailField
              icon={FiMapPin}
              label="Address"
              value={formData.address}
              isEditing={isEditing && !isMerchantSelfView}
              onChange={(v) => setFormData({ ...formData, address: v })}
            />
          </div>
        </div>

        {/* right column: credit info + discount plan */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* credit info card */}
          <div style={{
            background: 'white',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}>
              <FiCreditCard size={16} style={{ color: '#6366f1' }} />
              <h3 style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>
                Credit Information
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Credit Limit</p>
                {/* admins/managers can change the credit limit - merchants cannot */}
                {isEditing && !isMerchantSelfView ? (
                  <input
                    type="number"
                    value={formData.creditLimit}
                    min="0"
                    onChange={(e) => setFormData({
                      ...formData,
                      creditLimit: Number(e.target.value),
                    })}
                    style={{
                      width: '120px',
                      padding: '0.25rem 0.5rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      textAlign: 'right',
                      outline: 'none',
                    }}
                  />
                ) : (
                  <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>
                    £{merchant.creditLimit.toLocaleString()}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Current Debt</p>
                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#dc2626' }}>
                  £{merchant.currentDebt.toLocaleString()}
                </p>
              </div>

              {/* account status - managers and admins can change this, never the merchant themselves */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Account Status</p>
                {isEditing && !isMerchantSelfView ? (
                  <select
                    value={formData.accountStatus}
                    onChange={(e) => setFormData({ ...formData, accountStatus: e.target.value })}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value={ACCOUNT_STATUS.NORMAL}>Normal</option>
                    <option value={ACCOUNT_STATUS.SUSPENDED}>Suspended</option>
                    <option value={ACCOUNT_STATUS.IN_DEFAULT}>In Default</option>
                  </select>
                ) : (
                  <span style={{
                    background: statusStyle.bg,
                    color: statusStyle.color,
                    padding: '0.2rem 0.625rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                  }}>
                    {statusStyle.label}
                  </span>
                )}
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '0.75rem',
                borderTop: '1px solid #f1f5f9',
              }}>
                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Available Credit</p>
                <p style={{
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  color: availableCredit < 0 ? '#dc2626' : '#16a34a',
                }}>
                  £{availableCredit.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* discount plan card - hidden on the merchant self-view, managed by admin */}
          {!isMerchantSelfView && <div style={{
            background: 'white',
            borderRadius: '0.75rem',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}>
              <FiPercent size={16} style={{ color: '#6366f1' }} />
              <h3 style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>
                Discount Plan
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

              {/* plan type - dropdown in edit mode, badge in view mode */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Plan Type</p>
                {isEditing ? (
                  <select
                    value={formData.discountPlanType}
                    onChange={(e) => {
                      setFormData({ ...formData, discountPlanType: e.target.value });
                      setTierErrors('');
                    }}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value={DISCOUNT_TYPES.FIXED}>Fixed</option>
                    <option value={DISCOUNT_TYPES.FLEXIBLE}>Flexible</option>
                  </select>
                ) : (
                  <span style={{
                    background: '#ede9fe',
                    color: '#7c3aed',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'capitalize',
                  }}>
                    {merchant.discountPlanType}
                  </span>
                )}
              </div>

              {/* fixed rate field */}
              {formData.discountPlanType === DISCOUNT_TYPES.FIXED && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Discount Rate</p>
                  {isEditing ? (
                    <input
                      type="number"
                      value={formData.fixedDiscountRate}
                      min="0"
                      max="100"
                      onChange={(e) => setFormData({
                        ...formData,
                        fixedDiscountRate: Number(e.target.value),
                      })}
                      style={{
                        width: '80px',
                        padding: '0.25rem 0.5rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        textAlign: 'right',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>
                      {merchant.fixedDiscountRate ?? 0}%
                    </p>
                  )}
                </div>
              )}

              {/* flexible tier editor / viewer */}
              {formData.discountPlanType === DISCOUNT_TYPES.FLEXIBLE && (
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                    Monthly order value thresholds:
                  </p>

                  {/* tier error message */}
                  {tierErrors && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      background: '#fee2e2',
                      color: '#dc2626',
                      fontSize: '0.75rem',
                      padding: '0.5rem 0.625rem',
                      borderRadius: '0.375rem',
                      marginBottom: '0.5rem',
                    }}>
                      <FiAlertCircle size={12} />
                      {tierErrors}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {formData.flexibleThresholds.map((tier, i) => {
                      const isOpenTier = tier.limit === null;
                      const prevLimit = i > 0 ? formData.flexibleThresholds[i - 1].limit : 0;
                      const canRemove = !isOpenTier && formData.flexibleThresholds.length > 2;

                      if (!isEditing) {
                        // view mode - read only display of each tier
                        return (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              padding: '0.375rem 0',
                              borderBottom: i < formData.flexibleThresholds.length - 1
                                ? '1px solid #f1f5f9'
                                : 'none',
                            }}
                          >
                            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                              {getTierLabel(tier, i, formData.flexibleThresholds)}
                            </p>
                            <p style={{ fontSize: '0.8rem', fontWeight: '600', color: '#0f172a' }}>
                              {tier.rate}%
                            </p>
                          </div>
                        );
                      }

                      // edit mode - inputs for each tier
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.375rem 0',
                          }}
                        >
                          {/* tier range label / limit input */}
                          <div style={{ flex: 1, fontSize: '0.75rem', color: '#64748b' }}>
                            {isOpenTier ? (
                              <span>Over £{prevLimit?.toLocaleString() || '0'}</span>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span style={{ whiteSpace: 'nowrap' }}>Up to £</span>
                                <input
                                  type="number"
                                  value={tier.limit}
                                  min="1"
                                  onChange={(e) => updateTier(i, 'limit', Number(e.target.value))}
                                  style={{
                                    width: '70px',
                                    padding: '0.2rem 0.375rem',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.75rem',
                                    outline: 'none',
                                  }}
                                />
                              </div>
                            )}
                          </div>

                          {/* discount rate input */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}>
                            <input
                              type="number"
                              value={tier.rate}
                              min="0"
                              max="100"
                              onChange={(e) => updateTier(i, 'rate', Number(e.target.value))}
                              style={{
                                width: '50px',
                                padding: '0.2rem 0.375rem',
                                border: '1px solid #e2e8f0',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                textAlign: 'right',
                                outline: 'none',
                              }}
                            />
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>%</span>
                          </div>

                          {/* remove button - not shown for the last open tier */}
                          {canRemove ? (
                            <button
                              onClick={() => removeTier(i)}
                              title="Remove tier"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#ef4444',
                                padding: '0.2rem',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <FiTrash2 size={12} />
                            </button>
                          ) : (
                            // placeholder to keep layout consistent
                            <div style={{ width: '20px' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* add tier button in edit mode */}
                  {isEditing && (
                    <button
                      onClick={addTier}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        marginTop: '0.5rem',
                        background: 'none',
                        border: '1px dashed #c7d2fe',
                        borderRadius: '0.375rem',
                        color: '#6366f1',
                        fontSize: '0.75rem',
                        padding: '0.375rem 0.75rem',
                        cursor: 'pointer',
                        width: '100%',
                        justifyContent: 'center',
                      }}
                    >
                      <FiPlus size={12} />
                      Add Tier
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>}
        </div>
      </div>

      {/* account metadata footer */}
      <div style={{
        background: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        padding: '1.25rem',
        display: 'flex',
        gap: '2rem',
      }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Account Created</p>
          <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#0f172a' }}>
            {merchant.createdAt || '—'}
          </p>
        </div>

        <div>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Last Order</p>
          <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#0f172a' }}>
            {merchant.lastOrderDate || 'No orders yet'}
          </p>
        </div>

        {merchant.reinstatedAt && (
          <div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Last Reinstated</p>
            <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#0f172a' }}>
              {new Date(merchant.reinstatedAt).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      {/* director reinstatement modal */}
      {showReinstateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '1rem',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' }}>
              Reinstate Account
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              You are reinstating <strong>{merchant.companyName}</strong> from "In Default"
              to "Normal" status. A reason is required for the audit trail.
            </p>

            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem',
            }}>
              Reason for Reinstatement *
            </label>

            <textarea
              value={reinstateReason}
              onChange={(e) => setReinstateReason(e.target.value)}
              placeholder="Enter the reason for reinstating this account..."
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '1.5rem',
              }}
            />

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowReinstateModal(false);
                  setReinstateReason('');
                }}
                style={{
                  background: 'white',
                  color: '#64748b',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.625rem',
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReinstate}
                disabled={!reinstateReason.trim()}
                style={{
                  background: reinstateReason.trim()
                    ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                    : '#e2e8f0',
                  color: reinstateReason.trim() ? 'white' : '#94a3b8',
                  border: 'none',
                  borderRadius: '0.625rem',
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: reinstateReason.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Confirm Reinstatement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* password change section - only shown to the merchant on their own account page */}
      {isMerchantSelfView && (
        <div style={{
          background: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <FiCreditCard size={16} style={{ color: '#6366f1' }} />
            <h3 style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>Change Password</h3>
          </div>

          {pwMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: pwMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
              border: `1px solid ${pwMessage.type === 'success' ? '#86efac' : '#fecaca'}`,
              color: pwMessage.type === 'success' ? '#16a34a' : '#dc2626',
              padding: '0.625rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              marginBottom: '1rem',
            }}>
              {pwMessage.type === 'success' ? <FiCheckCircle size={14} /> : <FiAlertCircle size={14} />}
              {pwMessage.text}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', maxWidth: '360px' }}>
            {['Current Password', 'New Password', 'Confirm New Password'].map((label, i) => {
              const keys = ['current', 'next', 'confirm'];
              return (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.3rem' }}>
                    {label}
                  </label>
                  <input
                    type="password"
                    value={pwForm[keys[i]]}
                    onChange={(e) => setPwForm({ ...pwForm, [keys[i]]: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              );
            })}

            <button
              onClick={async () => {
                if (!pwForm.current || !pwForm.next) {
                  setPwMessage({ type: 'error', text: 'Please fill in all password fields' });
                  return;
                }
                if (pwForm.next !== pwForm.confirm) {
                  setPwMessage({ type: 'error', text: 'New passwords do not match' });
                  return;
                }
                setPwLoading(true);
                setPwMessage(null);
                const result = await changePassword(pwForm.current, pwForm.next);
                setPwLoading(false);
                if (result.success) {
                  setPwForm({ current: '', next: '', confirm: '' });
                  // update the stored test credential so LoginPage reflects the new password
                  // only relevant during dev/testing - won't affect production
                  if (user?.username) {
                    localStorage.setItem(`ipos_test_pass_${user.username}`, pwForm.next);
                  }
                  setPwMessage({ type: 'success', text: 'Password updated successfully' });
                  setTimeout(() => setPwMessage(null), 4000);
                } else {
                  setPwMessage({ type: 'error', text: result.error || 'Failed to update password' });
                }
              }}
              disabled={pwLoading}
              style={{
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: pwLoading
                  ? '#cbd5e1'
                  : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.5rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: pwLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {pwLoading ? (
                <>
                  <div style={{
                    width: '12px', height: '12px',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Saving...
                </>
              ) : (
                <>
                  <FiSave size={14} />
                  Update Password
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// reusable field that switches between a text input (edit mode) and plain text (view mode)
function DetailField({ icon: Icon, label, value, isEditing, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Icon size={14} style={{ color: '#94a3b8' }} />
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{label}</p>
      </div>

      {isEditing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '200px',
            padding: '0.25rem 0.5rem',
            border: '1px solid #e2e8f0',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            outline: 'none',
          }}
        />
      ) : (
        <p style={{
          fontSize: '0.875rem',
          fontWeight: '500',
          color: '#0f172a',
          textAlign: 'right',
          maxWidth: '220px',
        }}>
          {value || '—'}
        </p>
      )}
    </div>
  );
}

export default AccountDetailPage;
