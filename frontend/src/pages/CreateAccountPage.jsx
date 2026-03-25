import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMerchant } from '../services/merchantService';
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
} from 'react-icons/fi';

function CreateAccountPage() {
  const navigate = useNavigate();

  // form state for both the merchant login details
  // and the merchant account/business details
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
  });

  // validation errors for each field
  const [errors, setErrors] = useState({});

  // success or error message after submitting
  const [message, setMessage] = useState(null);

  // loading state while creating the account
  const [isCreating, setIsCreating] = useState(false);

  // updates form data when user types in any field
  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });

    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // login details are now required because account creation
    // also creates the linked merchant user login
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Check each required merchant/account field is filled in
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }
    if (!formData.contactName.trim()) {
      newErrors.contactName = 'Contact name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      // Basic email format validation
      newErrors.email = 'Email format is invalid';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }
    if (!formData.creditLimit || Number(formData.creditLimit) <= 0) {
      newErrors.creditLimit = 'Credit limit must be greater than 0';
    }

    // Discount rate only required for fixed plans
    if (
      formData.discountType === DISCOUNT_TYPES.FIXED &&
      (formData.discountRate === '' || Number(formData.discountRate) < 0)
    ) {
      newErrors.discountRate = 'Discount rate is required and must be 0 or greater';
    }

    setErrors(newErrors);
    // Return true if no errors found
    return Object.keys(newErrors).length === 0;
  };

  // Runs when user clicks Create Account button
  const handleSubmit = async (e) => {
    e.preventDefault();

    // First validate the form
    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Please fix the errors above' });
      return;
    }

    setIsCreating(true);
    setMessage(null);

    // Prepare the data to send to the service
    // backend now expects login fields as well as merchant details
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
    };

    // create the merchant via the service layer
    const result = await createMerchant(merchantData);

    if (result.success) {
      setMessage({
        type: 'success',
        text: 'Account created successfully! Redirecting to account details...'
      });

      setTimeout(() => {
        navigate(`/accounts/${result.merchant.id}`);
      }, 1500);
    } else {
      // failed - show the error from the service layer
      setMessage({ type: 'error', text: result.error || 'Failed to create account' });
      setIsCreating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>

      {/* Page header with back button */}
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
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#0f172a',
          }}>
            Create New Merchant Account
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Create the merchant login and account in one step
          </p>
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
          {message.type === 'success' ? <FiCheckCircle size={16} /> : <FiAlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* Main form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Login details section - these credentials are used by the new merchant to sign in */}
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
              Login Details
            </h3>
          </div>

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
              placeholder="Enter a temporary password"
              type="password"
            />
          </div>
        </div>

        {/* Contact details section */}
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

        {/* Credit and discount section */}
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
              Credit & Discount Configuration
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Credit limit field */}
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

            {/* Discount type dropdown */}
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
                onChange={(e) => handleChange('discountType', e.target.value)}
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
                <option value={DISCOUNT_TYPES.FIXED}>Fixed - Same rate on all orders</option>
                <option value={DISCOUNT_TYPES.FLEXIBLE}>Flexible - Tiered by monthly order value</option>
              </select>
            </div>

            {/* Discount rate field - only shown for fixed plans */}
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
          </div>
        </div>

        {/* Submit button */}
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
            {isCreating ? 'Creating...' : (
              <>
                <FiSave size={16} />
                Create Account
              </>
            )}
          </button>
        </div>
      </form>
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

// reusable form field component
// shows label, input, icon and error message if validation fails
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