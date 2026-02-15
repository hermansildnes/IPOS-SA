import { MOCK_MERCHANTS } from './mockData';
import { ACCOUNT_STATUS } from '../utils/constants';

// we store merchants in a local variable so updates persist
// within the same session (until page refresh)
// TODO: Replace all these functions with real API calls when backend is ready
let merchants = [...MOCK_MERCHANTS];

// get every merchant - used on the accounts list page
export const getAllMerchants = () => {
  return merchants;
};

// get one merchant by their ID - used on the account detail page
export const getMerchantById = (id) => {
  return merchants.find((m) => m.id === id) || null;
};

// create a brand new merchant account

// validts required fields before creating (matches brief requirement)
export const createMerchant = (merchantData) => {

  // check all required fields are present before creating
  const requiredFields = [
    'companyName',
    'contactName',
    'email',
    'phone',
    'address',
    'creditLimit',
    'discountType',
  ];

  const missingFields = requiredFields.filter((field) => !merchantData[field]);

  if (missingFields.length > 0) {
    // return an error if any required fields are missing
    // the brief says the account must NOT be created if details are missing
    return {
      success: false,
      error: `Missing required fields: ${missingFields.join(', ')}`,
    };
  }

  // Auto generate a new account number and ID
  const newMerchant = {
    ...merchantData,
    id: merchants.length + 1,
    accountNumber: String(merchants.length + 1).padStart(7, '0'),
    status: ACCOUNT_STATUS.NORMAL,
    currentDebt: 0,
    createdAt: new Date().toISOString().split('T')[0],
    lastOrderDate: null,
    status1stReminder: 'no_need',
    status2ndReminder: 'no_need',
  };

  merchants = [...merchants, newMerchant];
  return { success: true, merchant: newMerchant };
};

// update an existing merchants details
export const updateMerchant = (id, updates) => {
  const index = merchants.findIndex((m) => m.id === id);

  if (index === -1) {
    return { success: false, error: 'Merchant not found' };
  }

  merchants[index] = { ...merchants[index], ...updates };
  return { success: true, merchant: merchants[index] };
};

// reinstate a defaulted account - only the director can do this (SA-DIR-01)
// requires a reason to be logged for the audit trail
export const reinstateAccount = (id, reason, directorId) => {
  if (!reason || reason.trim().length === 0) {
    return { success: false, error: 'A reason for reinstatement is required' };
  }

  const index = merchants.findIndex((m) => m.id === id);

  if (index === -1) {
    return { success: false, error: 'Merchant not found' };
  }

  if (merchants[index].status !== ACCOUNT_STATUS.IN_DEFAULT) {
    return { success: false, error: 'Account is not in default' };
  }

  // Log the reinstatement details for the audit trail
  merchants[index] = {
    ...merchants[index],
    status: ACCOUNT_STATUS.NORMAL,
    reinstatedBy: directorId,
    reinstatedAt: new Date().toISOString(),
    reinstatedReason: reason,
  };

  return { success: true, merchant: merchants[index] };
};

// filter merchants by their account status
// used on the accounts list page to filter by normal/suspended/in_default
export const getMerchantsByStatus = (status) => {
  return merchants.filter((m) => m.status === status);
};
