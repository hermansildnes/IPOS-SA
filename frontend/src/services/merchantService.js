// Merchant Service
// Implements ISAMemberAPI interface and merchant management functions
// Each function corresponds to a specific backend API endpoint

import { apiClient } from './apiClient';

// Helper to convert backend snake_case to frontend camelCase
function convertMerchantFromBackend(merchant) {
  return {
    id: merchant.id,
    userId: merchant.user_id,
    accountNumber: merchant.account_number,
    companyName: merchant.company_name,
    contactName: merchant.contact_name,
    contactEmail: merchant.contact_email,
    contactPhone: merchant.contact_phone,
    address: merchant.address,
    creditLimit: parseFloat(merchant.credit_limit),
    discountPlanType: merchant.discount_plan_type,
    fixedDiscountRate: merchant.fixed_discount_rate ? parseFloat(merchant.fixed_discount_rate) : null,
    accountStatus: merchant.account_status,
    status1stReminder: merchant.status_1st_reminder,
    status2ndReminder: merchant.status_2nd_reminder,
    date1stReminder: merchant.date_1st_reminder,
    date2ndReminder: merchant.date_2nd_reminder,
    reinstatedBy: merchant.reinstated_by,
    reinstatedAt: merchant.reinstated_at,
    reinstatementReason: merchant.reinstatement_reason,
    defaultReason: merchant.default_reason,
    createdAt: merchant.created_at,
    updatedAt: merchant.updated_at,
  };
}

// Helper to convert frontend camelCase to backend snake_case
function convertMerchantToBackend(data) {
  return {
    user_id: data.userId,
    account_number: data.accountNumber,
    company_name: data.companyName,
    contact_name: data.contactName,
    contact_email: data.contactEmail,
    contact_phone: data.contactPhone || null,
    address: data.address,
    credit_limit: data.creditLimit,
    discount_plan_type: data.discountPlanType,
    fixed_discount_rate: data.fixedDiscountRate || null,
  };
}

/**
 * Send commercial application (ISAMemberAPI.sendCommercialApplication)
 * Endpoint: POST /api/commercial-applications
 * Auth: Not required (public endpoint for IPOS-PU integration)
 */
export async function sendCommercialApplication(regNumber, type, address, email, details) {
  try {
    await apiClient.post('/commercial-applications', {
      reg_number: regNumber,
      type,
      address,
      email,
      details,
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send commercial application:', error);
    return false;
  }
}

/**
 * Check commercial application status (ISAMemberAPI.checkCommercialApplication)
 * Endpoint: GET /api/commercial-applications/check?reg_number={regNumber}
 * Auth: Not required (public endpoint)
 */
export async function checkCommercialApplication(regNumber) {
  try {
    const result = await apiClient.get(`/commercial-applications/check?reg_number=${regNumber}`);
    
    // Return true if found and approved
    return result.found && result.status === 'approved';
  } catch (error) {
    console.error('Failed to check commercial application:', error);
    return false;
  }
}

/**
 * Get all merchants
 * Endpoint: GET /api/merchants
 * Auth: Required (admin/manager/director only)
 */
export async function getAllMerchants() {
  try {
    const merchants = await apiClient.get('/merchants');
    return merchants.map(convertMerchantFromBackend);
  } catch (error) {
    console.error('Failed to get merchants:', error);
    return [];
  }
}

/**
 * Get a single merchant by ID
 * Endpoint: GET /api/merchants/{merchant_id}
 * Auth: Required
 */
export async function getMerchantById(merchantId) {
  try {
    const merchant = await apiClient.get(`/merchants/${merchantId}`);
    return convertMerchantFromBackend(merchant);
  } catch (error) {
    console.error('Failed to get merchant:', error);
    return null;
  }
}

/**
 * Get merchants filtered by account status
 * Endpoint: GET /api/merchants?status={status}
 * Auth: Required
 */
export async function getMerchantsByStatus(status) {
  try {
    const endpoint = status ? `/merchants?status=${status}` : '/merchants';
    const merchants = await apiClient.get(endpoint);
    return merchants.map(convertMerchantFromBackend);
  } catch (error) {
    console.error('Failed to get merchants by status:', error);
    return [];
  }
}

/**
 * Create a new merchant account
 * Endpoint: POST /api/merchants
 * Auth: Required (admin only)
 */
export async function createMerchant(merchantData) {
  try {
    const required = ['companyName', 'contactName', 'contactEmail', 'address', 'creditLimit', 'discountPlanType'];
    for (const field of required) {
      if (!merchantData[field]) {
        return {
          success: false,
          error: `${field} is required`
        };
      }
    }
    
    const backendData = convertMerchantToBackend(merchantData);
    const merchant = await apiClient.post('/merchants', backendData);
    
    return {
      success: true,
      merchant: convertMerchantFromBackend(merchant)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update an existing merchant
 * Endpoint: PATCH /api/merchants/{merchant_id}
 * Auth: Required (admin/manager)
 */
export async function updateMerchant(merchantId, updates) {
  try {
    const backendUpdates = {};
    
    if (updates.companyName) backendUpdates.company_name = updates.companyName;
    if (updates.contactName) backendUpdates.contact_name = updates.contactName;
    if (updates.contactEmail) backendUpdates.contact_email = updates.contactEmail;
    if (updates.contactPhone !== undefined) backendUpdates.contact_phone = updates.contactPhone;
    if (updates.address) backendUpdates.address = updates.address;
    if (updates.creditLimit !== undefined) backendUpdates.credit_limit = updates.creditLimit;
    if (updates.discountPlanType) backendUpdates.discount_plan_type = updates.discountPlanType;
    if (updates.fixedDiscountRate !== undefined) backendUpdates.fixed_discount_rate = updates.fixedDiscountRate;
    
    const merchant = await apiClient.patch(`/merchants/${merchantId}`, backendUpdates);
    
    return {
      success: true,
      merchant: convertMerchantFromBackend(merchant)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get merchant's current balance/debt
 * Endpoint: GET /api/merchants/{merchant_id}/balance
 * Auth: Required
 */
export async function getMerchantBalance(merchantId) {
  try {
    const balance = await apiClient.get(`/merchants/${merchantId}/balance`);
    return {
      creditLimit: parseFloat(balance.credit_limit),
      currentDebt: parseFloat(balance.outstanding_balance),
      availableCredit: parseFloat(balance.available_credit),
    };
  } catch (error) {
    console.error('Failed to get merchant balance:', error);
    return {
      creditLimit: 0,
      currentDebt: 0,
      availableCredit: 0,
    };
  }
}

/**
 * Reinstate a merchant account from 'in_default' status
 * Endpoint: POST /api/merchants/{merchant_id}/reinstate
 * Auth: Required (director only)
 */
export async function reinstateAccount(merchantId, reason, directorId) {
  try {
    if (!reason || !reason.trim()) {
      return {
        success: false,
        error: 'Reinstatement reason is required'
      };
    }
    
    await apiClient.post(`/merchants/${merchantId}/reinstate`, {
      reason,
      director_id: directorId
    });
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  sendCommercialApplication,
  checkCommercialApplication,
  getAllMerchants,
  getMerchantById,
  getMerchantsByStatus,
  createMerchant,
  updateMerchant,
  getMerchantBalance,
  reinstateAccount,
};