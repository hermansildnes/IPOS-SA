import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMerchant } from '../services/merchantService';
import { createStaffUser } from '../services/authService';
import { DISCOUNT_TYPES } from '../utils/constants';
import {
  FiArrowLeft,
  FiSave,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCreditCard,
  FiPercent,
  FiAlertCircle,
  FiCheckCircle,
  FiLock,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi';

// default flexible discount tiers to pre-fill when switching to flexible plan
const DEFAULT_TIERS = [
  { limit: 1000, rate: 5 },
  { limit: null, rate: 10 },
];

function CreateAccountPage() {
  const navigate = useNavigate();

  // which type of account to create - merchant gets the full form, staff gets a simpler one
  const [accountType, setAccountType] = useState('merchant');

  // staff user form state (admin/manager/director only needs username, email, password, role)
  const [staffForm, setStaffForm] = useState({ username: '', email: '', password: '', role: 'manager' });
  const [staffErrors, setStaffErrors] = useState({});
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);

  // formData holds all the field values for both merchant login and account details
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    creditLimit: '',
    discountType: DISCOUNT_TYPES.FIXED,
    discountRate: '',
    flexibleThresholds: DEFAULT_TIERS,
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [tierError, setTierError] = useState('');

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // clear the error for this field when the user starts correcting it
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  // --- flexible tier management ---

  const addTier = () => {
    const tiers = [...formData.flexibleThresholds];
    const bounded = tiers.filter((t) => t.limit !== null);
    const lastLimit = bounded.length > 0 ? bounded[bounded.length - 1].limit : 0;
    const openIndex = tiers.findIndex((t) => t.limit === null);
    const newTier = { limit: lastLimit + 1000, rate: 0 };
    if (openIndex >= 0) {
      tiers.splice(openIndex, 0, newTier);
    } else {
      tiers.push(newTier);
    }
    setFormData({ ...formData, flexibleThresholds: tiers });
    setTierError('');
  };

  const removeTier = (index) => {
    const tiers = [...formData.flexibleThresholds];
    tiers.splice(index, 1);
    setFormData({ ...formData, flexibleThresholds: tiers });
    setTierError('');
  };

  const updateTier = (index, field, value) => {
    const tiers = formData.flexibleThresholds.map((t, i) =>
      i === index ? { ...t, [field]: value } : t
    );
    setFormData({ ...formData, flexibleThresholds: tiers });
    setTierError('');
  };

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

  // validates all form fields and populates the errors state
  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    if (!formData.contactName.trim()) {
      newErrors.contactName = 'Contact name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d\s\+\-\(\)]{7,15}$/.test(formData.phone.trim())) {
      // basic check - at least 7 digits and only allowed characters
      newErrors.phone = 'Enter a valid phone number (digits, spaces, +, -, brackets)';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.creditLimit || Number(formData.creditLimit) <= 0) {
      newErrors.creditLimit = 'Credit limit must be greater than 0';
    } else if (Number(formData.creditLimit) > 1000000) {
      newErrors.creditLimit = 'Credit limit seems too high - please double check';
    }

    if (formData.discountType === DISCOUNT_TYPES.FIXED) {
      if (formData.discountRate === '' || Number(formData.discountRate) < 0) {
        newErrors.discountRate = 'Discount rate must be 0 or greater';
      } else if (Number(formData.discountRate) > 100) {
        newErrors.discountRate = 'Discount rate cannot exceed 100%';
      }
    }

    if (formData.discountType === DISCOUNT_TYPES.FLEXIBLE) {
      const tierErr = validateTiers(formData.flexibleThresholds);
      if (tierErr) setTierError(tierErr);
      else setTierError('');
      if (tierErr) {
        newErrors.flexibleTiers = tierErr;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!staffForm.username.trim()) newErrors.username = 'Username is required';
    else if (staffForm.username.length < 3) newErrors.username = 'Username must be at least 3 characters';
    if (!staffForm.email.trim()) newErrors.email = 'Email is required';
    if (!staffForm.password.trim()) newErrors.password = 'Password is required';
    else if (staffForm.password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    if (Object.keys(newErrors).length > 0) {
      setStaffErrors(newErrors);
      setMessage({ type: 'error', text: 'Please fix the errors above' });
      return;
    }

    setIsCreatingStaff(true);
    setMessage(null);
    const result = await createStaffUser(staffForm.username, staffForm.email, staffForm.password, staffForm.role);
    setIsCreatingStaff(false);

    if (result.success) {
      setMessage({ type: 'success', text: 'Staff account created successfully! Redirecting...' });
      setTimeout(() => navigate('/accounts'), 1500);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to create account' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Please fix the errors above before continuing' });
      return;
    }

    setIsCreating(true);
    setMessage(null);

    const merchantData = {
      username: formData.username,
      password: formData.password,
      email: formData.email,
      companyName: formData.companyName,
      contactName: formData.contactName,
      contactEmail: formData.email,
      contactPhone: formData.phone,
      address: formData.address,
      creditLimit: Number(formData.creditLimit),
      discountPlanType: formData.discountType,
      fixedDiscountRate:
        formData.discountType === DISCOUNT_TYPES.FIXED
          ? Number(formData.discountRate)
          : null,
      flexibleThresholds:
        formData.discountType === DISCOUNT_TYPES.FLEXIBLE
          ? formData.flexibleThresholds
          : null,
    };

    const result = await createMerchant(merchantData);

    if (result.success) {
      setMessage({
        type: 'success',
        text: 'Account created successfully! Redirecting...',
      });
      setTimeout(() => {
        navigate(`/accounts/${result.merchant.id}`);
      }, 1500);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to create account' });
      setIsCreating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>

      {/* header */}
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
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a' }}>
            Create New Account
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Merchant accounts require full contact and billing details; staff accounts are simpler
          </p>
        </div>
      </div>

      {/* account type selector - determines which form to show below */}
      <div style={{
        background: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        padding: '1.25rem',
        display: 'flex',
        gap: '1rem',
      }}>
        {[
          { key: 'merchant', label: 'Merchant Account', desc: 'External company with credit limit and discount plan' },
          { key: 'staff', label: 'Staff Account', desc: 'Internal staff: admin, manager, or director' },
        ].map(({ key, label, desc }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setAccountType(key); setMessage(null); }}
            style={{
              flex: 1,
              padding: '0.875rem',
              background: accountType === key ? '#ede9fe' : 'white',
              border: accountType === key ? '2px solid #6366f1' : '1px solid #e2e8f0',
              borderRadius: '0.625rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <p style={{ fontWeight: '600', color: accountType === key ? '#6366f1' : '#0f172a', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
              {label}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{desc}</p>
          </button>
        ))}
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
          {message.type === 'success' ? <FiCheckCircle size={16} /> : <FiAlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* staff user creation form - only shown when accountType is staff */}
      {accountType === 'staff' && (
        <form onSubmit={handleStaffSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
            <SectionHeader icon={FiUser} title="Staff Account Details" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <FormField icon={FiUser} label="Username" value={staffForm.username} onChange={(v) => setStaffForm({ ...staffForm, username: v })} error={staffErrors.username} placeholder="e.g. jdoe_manager" />
              <FormField icon={FiMail} label="Email" type="email" value={staffForm.email} onChange={(v) => setStaffForm({ ...staffForm, email: v })} error={staffErrors.email} placeholder="e.g. j.doe@infopharma.com" />
              <FormField icon={FiLock} label="Password" type="password" value={staffForm.password} onChange={(v) => setStaffForm({ ...staffForm, password: v })} error={staffErrors.password} placeholder="Minimum 6 characters" />
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Role
                </label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}
                >
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="director">Director</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => navigate('/accounts')} disabled={isCreatingStaff} style={{ background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '0.625rem', padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: '600', cursor: isCreatingStaff ? 'not-allowed' : 'pointer', opacity: isCreatingStaff ? 0.5 : 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={isCreatingStaff} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: isCreatingStaff ? '#cbd5e1' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', border: 'none', borderRadius: '0.625rem', padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: '600', cursor: isCreatingStaff ? 'not-allowed' : 'pointer' }}>
              {isCreatingStaff ? 'Creating...' : <><FiSave size={16} /> Create Staff Account</>}
            </button>
          </div>
        </form>
      )}

      {/* merchant creation form - only shown when accountType is merchant */}
      {accountType === 'merchant' && (
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* login details - these become the new merchant's sign-in credentials */}
        <div style={{
          background: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
        }}>
          <SectionHeader icon={FiLock} title="Login Credentials" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormField
              icon={FiUser}
              label="Username"
              value={formData.username}
              onChange={(v) => handleChange('username', v)}
              error={errors.username}
              placeholder="e.g. merchant4"
            />
            <FormField
              icon={FiLock}
              label="Password"
              value={formData.password}
              onChange={(v) => handleChange('password', v)}
              error={errors.password}
              placeholder="Minimum 6 characters"
              type="password"
            />
          </div>
        </div>

        {/* contact details */}
        <div style={{
          background: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
        }}>
          <SectionHeader icon={FiUser} title="Contact Details" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormField
              icon={FiUser}
              label="Company Name"
              value={formData.companyName}
              onChange={(v) => handleChange('companyName', v)}
              error={errors.companyName}
              placeholder="e.g. Pharma Plus Ltd"
            />
            <FormField
              icon={FiUser}
              label="Contact Name"
              value={formData.contactName}
              onChange={(v) => handleChange('contactName', v)}
              error={errors.contactName}
              placeholder="e.g. John Smith"
            />
            <FormField
              icon={FiMail}
              label="Email"
              value={formData.email}
              onChange={(v) => handleChange('email', v)}
              error={errors.email}
              placeholder="e.g. john.smith@pharmaplus.co.uk"
              type="email"
            />
            <FormField
              icon={FiPhone}
              label="Phone"
              value={formData.phone}
              onChange={(v) => handleChange('phone', v)}
              error={errors.phone}
              placeholder="e.g. 0207 123 4567"
              type="tel"
            />
            <FormField
              icon={FiMapPin}
              label="Address"
              value={formData.address}
              onChange={(v) => handleChange('address', v)}
              error={errors.address}
              placeholder="e.g. 15 High Street, London, EC1A 1BB"
            />
          </div>
        </div>

        {/* credit and discount section */}
        <div style={{
          background: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
        }}>
          <SectionHeader icon={FiCreditCard} title="Credit & Discount Configuration" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* credit limit */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                color: '#374151',
                fontWeight: '500',
                marginBottom: '0.5rem',
              }}>
                <FiCreditCard size={14} style={{ color: '#94a3b8' }} />
                Credit Limit (£)
              </label>
              <input
                type="number"
                value={formData.creditLimit}
                onChange={(e) => handleChange('creditLimit', e.target.value)}
                placeholder="e.g. 10000"
                min="0"
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: errors.creditLimit ? '2px solid #ef4444' : '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {errors.creditLimit && <FieldError text={errors.creditLimit} />}
            </div>

            {/* discount plan type selector */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                color: '#374151',
                fontWeight: '500',
                marginBottom: '0.5rem',
              }}>
                <FiPercent size={14} style={{ color: '#94a3b8' }} />
                Discount Plan Type
              </label>
              <select
                value={formData.discountType}
                onChange={(e) => {
                  handleChange('discountType', e.target.value);
                  setTierError('');
                }}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}
              >
                <option value={DISCOUNT_TYPES.FIXED}>Fixed – same rate on all orders</option>
                <option value={DISCOUNT_TYPES.FLEXIBLE}>Flexible – tiered by monthly order value</option>
              </select>
            </div>

            {/* fixed discount rate */}
            {formData.discountType === DISCOUNT_TYPES.FIXED && (
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#374151',
                  fontWeight: '500',
                  marginBottom: '0.5rem',
                }}>
                  <FiPercent size={14} style={{ color: '#94a3b8' }} />
                  Fixed Discount Rate (%)
                </label>
                <input
                  type="number"
                  value={formData.discountRate}
                  onChange={(e) => handleChange('discountRate', e.target.value)}
                  placeholder="e.g. 5"
                  min="0"
                  max="100"
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    border: errors.discountRate ? '2px solid #ef4444' : '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.discountRate && <FieldError text={errors.discountRate} />}
              </div>
            )}

            {/* flexible tier editor */}
            {formData.discountType === DISCOUNT_TYPES.FLEXIBLE && (
              <div>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#374151',
                  fontWeight: '500',
                  marginBottom: '0.5rem',
                }}>
                  Discount Tiers (by monthly order value)
                </p>

                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                  Define thresholds in ascending order. The final tier applies to all orders above the last limit.
                </p>

                {tierError && <FieldError text={tierError} />}

                <div style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                  marginBottom: '0.5rem',
                }}>
                  {/* header row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 100px 40px',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#64748b',
                  }}>
                    <div>Order Value Threshold</div>
                    <div>Rate (%)</div>
                    <div></div>
                  </div>

                  {formData.flexibleThresholds.map((tier, i) => {
                    const isOpenTier = tier.limit === null;
                    const prevLimit = i > 0 ? formData.flexibleThresholds[i - 1].limit : 0;
                    const canRemove = !isOpenTier && formData.flexibleThresholds.length > 2;

                    return (
                      <div
                        key={i}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 100px 40px',
                          gap: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          alignItems: 'center',
                          borderBottom: i < formData.flexibleThresholds.length - 1
                            ? '1px solid #f1f5f9'
                            : 'none',
                        }}
                      >
                        {/* threshold column */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          {isOpenTier ? (
                            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                              Over £{prevLimit?.toLocaleString() || '0'}
                            </span>
                          ) : (
                            <>
                              <span style={{ fontSize: '0.875rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                Up to £
                              </span>
                              <input
                                type="number"
                                value={tier.limit}
                                min="1"
                                onChange={(e) => updateTier(i, 'limit', Number(e.target.value))}
                                style={{
                                  width: '90px',
                                  padding: '0.375rem 0.5rem',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.875rem',
                                  outline: 'none',
                                }}
                              />
                            </>
                          )}
                        </div>

                        {/* rate column */}
                        <input
                          type="number"
                          value={tier.rate}
                          min="0"
                          max="100"
                          onChange={(e) => updateTier(i, 'rate', Number(e.target.value))}
                          style={{
                            width: '100%',
                            padding: '0.375rem 0.5rem',
                            border: '1px solid #e2e8f0',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            outline: 'none',
                          }}
                        />

                        {/* remove button */}
                        {canRemove ? (
                          <button
                            type="button"
                            onClick={() => removeTier(i)}
                            title="Remove tier"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#ef4444',
                              padding: '0.25rem',
                            }}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        ) : <div />}
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={addTier}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    background: 'none',
                    border: '1px dashed #c7d2fe',
                    borderRadius: '0.375rem',
                    color: '#6366f1',
                    fontSize: '0.875rem',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  <FiPlus size={14} />
                  Add Tier
                </button>
              </div>
            )}
          </div>
        </div>

        {/* form action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => navigate('/accounts')}
            disabled={isCreating}
            style={{
              background: 'white',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              borderRadius: '0.625rem',
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: isCreating ? 'not-allowed' : 'pointer',
              opacity: isCreating ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: isCreating ? '#cbd5e1' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '0.625rem',
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: isCreating ? 'not-allowed' : 'pointer',
            }}
          >
            {isCreating ? (
              <>
                <div style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Creating...
              </>
            ) : (
              <>
                <FiSave size={16} />
                Create Account
              </>
            )}
          </button>
        </div>
      </form>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function FieldError({ text }) {
  return (
    <p style={{
      fontSize: '0.75rem',
      color: '#ef4444',
      marginTop: '0.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
    }}>
      <FiAlertCircle size={12} />
      {text}
    </p>
  );
}

// shared section card header
function SectionHeader({ icon: Icon, title }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '1.25rem',
    }}>
      <Icon size={16} style={{ color: '#6366f1' }} />
      <h3 style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>{title}</h3>
    </div>
  );
}

// reusable text input field with label, icon and inline error
function FormField({ icon: Icon, label, value, onChange, error, placeholder, type = 'text' }) {
  return (
    <div>
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.875rem',
        color: '#374151',
        fontWeight: '500',
        marginBottom: '0.5rem',
      }}>
        <Icon size={14} style={{ color: '#94a3b8' }} />
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '0.625rem',
          border: error ? '2px solid #ef4444' : '1px solid #e2e8f0',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {error && <FieldError text={error} />}
    </div>
  );
}

export default CreateAccountPage;
