import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMerchantById, updateMerchant, reinstateAccount } from '../services/merchantService';
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
} from 'react-icons/fi';

function AccountDetailPage() {
  // useParams grabs the merchant ID from the URL e.g. /accounts/2
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Track whether we're in edit mode or view mode
  const [isEditing, setIsEditing] = useState(false);

  // Track whether the reinstate modal is open
  const [showReinstateModal, setShowReinstateModal] = useState(false);

  // The reason the director gives when reinstating a defaulted account
  // Required field as per SA-DIR-01 acceptance criteria
  const [reinstateReason, setReinstateReason] = useState('');

  // Any error or success messages to show the user
  const [message, setMessage] = useState(null);

  // Get the merchant data from our service layer
  const [merchant, setMerchant] = useState(getMerchantById(Number(id)));

  // formData holds the values being edited
  // Initialised with the merchant's current values
  const [formData, setFormData] = useState({
    companyName: merchant?.companyName || '',
    contactName: merchant?.contactName || '',
    email: merchant?.email || '',
    phone: merchant?.phone || '',
    address: merchant?.address || '',
    creditLimit: merchant?.creditLimit || 0,
    discountType: merchant?.discountType || DISCOUNT_TYPES.FIXED,
    discountRate: merchant?.discountRate || 0,
  });

  // If no merchant found with this ID, show a not found message
  if (!merchant) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
        <FiAlertCircle size={32} style={{ marginBottom: '1rem' }} />
        <p style={{ fontWeight: '500' }}>Merchant not found</p>
        <button
          onClick={() => navigate('/accounts')}
          style={{
            marginTop: '1rem',
            background: 'none',
            border: 'none',
            color: '#6366f1',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          ← Back to accounts
        </button>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[merchant.status];
  const availableCredit = merchant.creditLimit - merchant.currentDebt;

  // Saves the edited form data back to the service layer
  const handleSave = () => {
    const result = updateMerchant(Number(id), formData);
    if (result.success) {
      // Update local state so the page reflects the changes immediately
      setMerchant(result.merchant);
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Account updated successfully' });
      // Clear the success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: result.error });
    }
  };

  // Cancels editing and resets the form back to original values
  const handleCancel = () => {
    setFormData({
      companyName: merchant.companyName,
      contactName: merchant.contactName,
      email: merchant.email,
      phone: merchant.phone,
      address: merchant.address,
      creditLimit: merchant.creditLimit,
      discountType: merchant.discountType,
      discountRate: merchant.discountRate,
    });
    setIsEditing(false);
  };

  // Handles the director reinstating a defaulted account (SA-DIR-01)
  const handleReinstate = () => {
    const result = reinstateAccount(
      Number(id),
      reinstateReason,
      user?.id
    );

    if (result.success) {
      setMerchant(result.merchant);
      setShowReinstateModal(false);
      setReinstateReason('');
      setMessage({ type: 'success', text: 'Account successfully reinstated' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: result.error });
    }
  };

  // Checks if the current user can edit this merchant's details
  const canEdit = user?.role === ROLES.ADMIN || user?.role === ROLES.MANAGER;

  // Only the director can reinstate defaulted accounts (SA-DIR-01)
  const canReinstate = user?.role === ROLES.DIRECTOR &&
    merchant.status === ACCOUNT_STATUS.IN_DEFAULT;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '900px' }}>

      {/* Back button and page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => navigate('/accounts')}
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
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#0f172a',
            }}>
              {merchant.companyName}
            </h1>
            {/* Account status badge */}
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

        {/* Action buttons - shown based on role and account status */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {/* Reinstate button - only for director on defaulted accounts */}
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

          {/* Edit/Save/Cancel buttons for admins and managers */}
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

          {/* Save and cancel shown when in edit mode */}
          {isEditing && (
            <>
              <button
                onClick={handleCancel}
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
                  cursor: 'pointer',
                }}
              >
                <FiX size={16} />
                Cancel
              </button>
              <button
                onClick={handleSave}
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
                <FiSave size={16} />
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Success or error message banner */}
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

      {/* Two column layout - contact details left, credit info right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

        {/* Contact details card */}
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
            {/* Each field switches between a text input (edit mode)
                and plain text (view mode) */}
            <DetailField
              icon={FiUser}
              label="Company Name"
              value={formData.companyName}
              isEditing={isEditing}
              onChange={(v) => setFormData({ ...formData, companyName: v })}
            />
            <DetailField
              icon={FiUser}
              label="Contact Name"
              value={formData.contactName}
              isEditing={isEditing}
              onChange={(v) => setFormData({ ...formData, contactName: v })}
            />
            <DetailField
              icon={FiMail}
              label="Email"
              value={formData.email}
              isEditing={isEditing}
              onChange={(v) => setFormData({ ...formData, email: v })}
            />
            <DetailField
              icon={FiPhone}
              label="Phone"
              value={formData.phone}
              isEditing={isEditing}
              onChange={(v) => setFormData({ ...formData, phone: v })}
            />
            <DetailField
              icon={FiMapPin}
              label="Address"
              value={formData.address}
              isEditing={isEditing}
              onChange={(v) => setFormData({ ...formData, address: v })}
            />
          </div>
        </div>

        {/* Credit and discount card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Credit info */}
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
                {/* Credit limit is editable by admin/manager */}
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({
                      ...formData,
                      creditLimit: Number(e.target.value)
                    })}
                    style={{
                      width: '120px',
                      padding: '0.25rem 0.5rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      textAlign: 'right',
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

          {/* Discount plan card */}
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
              <FiPercent size={16} style={{ color: '#6366f1' }} />
              <h3 style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>
                Discount Plan
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Plan Type</p>
                {isEditing ? (
                  // Dropdown to switch between fixed and flexible discount
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({
                      ...formData,
                      discountType: e.target.value
                    })}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
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
                    {merchant.discountType}
                  </span>
                )}
              </div>

              {/* Fixed discount rate field - only shown for fixed plan */}
              {formData.discountType === DISCOUNT_TYPES.FIXED && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Discount Rate</p>
                  {isEditing ? (
                    <input
                      type="number"
                      value={formData.discountRate}
                      onChange={(e) => setFormData({
                        ...formData,
                        discountRate: Number(e.target.value)
                      })}
                      style={{
                        width: '80px',
                        padding: '0.25rem 0.5rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        textAlign: 'right',
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>
                      {merchant.discountRate}%
                    </p>
                  )}
                </div>
              )}

              {/* Flexible discount thresholds - shown for flexible plan */}
              {formData.discountType === DISCOUNT_TYPES.FLEXIBLE && merchant.flexibleThresholds && (
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                    Monthly order thresholds:
                  </p>
                  {merchant.flexibleThresholds.map((threshold, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.375rem 0',
                        borderBottom: i < merchant.flexibleThresholds.length - 1
                          ? '1px solid #f1f5f9'
                          : 'none',
                      }}
                    >
                      <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {threshold.upTo
                          ? `Up to £${threshold.upTo}`
                          : `Over £${threshold.above}`
                        }
                      </p>
                      <p style={{ fontSize: '0.8rem', fontWeight: '600', color: '#0f172a' }}>
                        {threshold.rate}%
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Account metadata - created date, last order etc */}
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
            {merchant.createdAt}
          </p>
        </div>
        <div>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Last Order</p>
          <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#0f172a' }}>
            {merchant.lastOrderDate || 'No orders yet'}
          </p>
        </div>
        {/* Show reinstatement details if the account was previously defaulted */}
        {merchant.reinstatedAt && (
          <div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Last Reinstated</p>
            <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#0f172a' }}>
              {new Date(merchant.reinstatedAt).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      {/* Reinstate modal - only shown when director clicks Reinstate Account */}
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
              You are reinstating <strong>{merchant.companyName}</strong> from
              "In Default" to "Normal" status. A reason is required for the
              audit trail as per company policy.
            </p>

            {/* Required reason field - matches SA-DIR-01 acceptance criteria */}
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

            {/* Modal action buttons */}
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
                // Disabled until the director types a reason
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
    </div>
  );
}

// Reusable field component that switches between view and edit mode
// Keeps the code clean instead of repeating the if/else for every field
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
          {value}
        </p>
      )}
    </div>
  );
}

export default AccountDetailPage;