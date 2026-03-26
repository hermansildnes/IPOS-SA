// Account status constants
export const ACCOUNT_STATUS = {
  NORMAL: 'normal',
  SUSPENDED: 'suspended',
  IN_DEFAULT: 'in_default',
};

// Discount types
export const DISCOUNT_TYPES = {
  FIXED: 'fixed',
  FLEXIBLE: 'flexible',
};

// User roles
export const ROLES = {
  ADMIN: 'admin',
  DIRECTOR: 'director',
  MANAGER: 'manager',
  MERCHANT: 'merchant',
};

// Status badge styles - label added so badge text renders correctly
export const STATUS_STYLES = {
  normal: { bg: '#dcfce7', color: '#166534', label: 'Normal' },
  suspended: { bg: '#fef3c7', color: '#92400e', label: 'Suspended' },
  in_default: { bg: '#fee2e2', color: '#dc2626', label: 'In Default' },
};

// Role badge colors
export const ROLE_COLORS = {
  admin: '#ef4444',
  director: '#f59e0b',
  manager: '#10b981',
  merchant: '#6366f1',
};

// Order status constants
export const ORDER_STATUS = {
  ACCEPTED: 'accepted',
  PROCESSING: 'processing',
  DISPATCHED: 'dispatched',
  DELIVERED: 'delivered',
};

// Order status styles
export const ORDER_STATUS_STYLES = {
  accepted: {
    bg: '#dbeafe',
    color: '#1e40af',
    label: 'Accepted'
  },
  processing: {
    bg: '#fef3c7',
    color: '#92400e',
    label: 'Processing'
  },
  dispatched: {
    bg: '#e0e7ff',
    color: '#4338ca',
    label: 'Dispatched'
  },
  delivered: {
    bg: '#dcfce7',
    color: '#166534',
    label: 'Delivered'
  },
};