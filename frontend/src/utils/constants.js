// Account status values used throughout the app

// Keeping these as constants prevents typos when comparing status strings

export const ACCOUNT_STATUS = {
  NORMAL: 'normal',
  SUSPENDED: 'suspended',
  IN_DEFAULT: 'in_default',
};

// discount plan types as per the IPOS-SA-ACC requirements

export const DISCOUNT_TYPES = {
  FIXED: 'fixed',
  FLEXIBLE: 'flexible',
};

// user roles - matches the mock users in AuthContext

export const ROLES = {
  ADMIN: 'admin',
  DIRECTOR: 'director',
  MANAGER: 'manager',
  MERCHANT: 'merchant',
};

// visual styles for each account status badge
// centralised here so all components use the same colours
export const STATUS_STYLES = {
  normal: {
    label: 'Normal',
    color: '#16a34a',
    bg: '#dcfce7',
  },
  suspended: {
    label: 'Suspended',
    color: '#d97706',
    bg: '#fef3c7',
  },
  in_default: {
    label: 'In Default',
    color: '#dc2626',
    bg: '#fee2e2',
  },
};