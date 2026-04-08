
// implements ISAMemberAPI and merchant management functions
// each function maps to a specific backend api endpoint

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

    // keep legacy aliases too because some pages still read these names
    email: merchant.contact_email,
    phone: merchant.contact_phone,

    address: merchant.address,
    creditLimit: parseFloat(merchant.credit_limit || 0),

    // current debt can come back under different backend field names
    // depending on which endpoint returned the merchant object
    currentDebt: parseFloat(
      merchant.current_debt ??
      merchant.outstanding_balance ??
      0
    ),

    discountPlanType: merchant.discount_plan_type,
    discountType: merchant.discount_plan_type,

    fixedDiscountRate: merchant.fixed_discount_rate != null
      ? parseFloat(merchant.fixed_discount_rate)
      : null,

    // keep a plain discountRate alias for older page code
    discountRate: merchant.fixed_discount_rate != null
      ? parseFloat(merchant.fixed_discount_rate)
      : 0,

    accountStatus: merchant.account_status,
    status: merchant.account_status,

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

    // extra metadata used by account detail / flexible discount views
    lastOrderDate: merchant.last_order_date || null,
    flexibleThresholds: merchant.flexible_thresholds || null,

    // Keep these too because AccountsPage currently uses snake_case keys
    company_name: merchant.company_name,
    account_number: merchant.account_number,
    contact_name: merchant.contact_name,
    account_status: merchant.account_status,
    credit_limit: parseFloat(merchant.credit_limit || 0),
    current_debt: parseFloat(
      merchant.current_debt ??
      merchant.outstanding_balance ??
      0
    ),
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
    fixed_discount_rate: data.fixedDiscountRate ?? null,
  };
}

// sendCommercialApplication (ISAMemberAPI.sendCommercialApplication)
// public endpoint - no auth needed, used by IPOS-PU to submit membership applications
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
    console.error('failed to send commercial application:', error);
    return false;
  }
}

// checkCommercialApplication (ISAMemberAPI.checkCommercialApplication)
// lets applicants check whether their application has been approved yet
export async function checkCommercialApplication(regNumber) {
  try {
    const result = await apiClient.get(`/commercial-applications/check?reg_number=${regNumber}`);

    // Return true if found and approved
    return result.found && result.status === 'approved';
  } catch (error) {
    console.error('failed to check commercial application:', error);
    return false;
  }
}

// get all merchants - admin/manager only
export async function getAllMerchants() {
  try {
    const merchants = await apiClient.get('/merchants');
    return merchants.map(convertMerchantFromBackend);
  } catch (error) {
    console.error('failed to get merchants:', error);
    return [];
  }
}

// get a single merchant by id - used by AccountDetailPage
export async function getMerchantById(merchantId) {
  try {
    const merchant = await apiClient.get(`/merchants/${merchantId}`);
    return convertMerchantFromBackend(merchant);
  } catch (error) {
    console.error('failed to get merchant:', error);
    return null;
  }
}

// get the merchant account for whoever is currently logged in
// used by /my-account and MerchantDashboard
export async function getCurrentMerchant() {
  try {
    const merchant = await apiClient.get('/merchants/me');
    return convertMerchantFromBackend(merchant);
  } catch (error) {
    console.error('failed to get current merchant:', error);
    return null;
  }
}

// filter merchants by account status (normal/suspended/in_default)
export async function getMerchantsByStatus(status) {
  try {
    const endpoint = status ? `/merchants?status=${status}` : '/merchants';
    const merchants = await apiClient.get(endpoint);
    return merchants.map(convertMerchantFromBackend);
  } catch (error) {
    console.error('failed to get merchants by status:', error);
    return [];
  }
}

// create a new merchant account - admin only
// backend creates both the login user and the merchant record in one call
export async function createMerchant(merchantData) {
  try {
    // now required because backend creates both:
    // 1) the merchant login user
    // 2) the linked merchant account
    const required = [
      'username',
      'password',
      'email',
      'companyName',
      'contactName',
      'contactEmail',
      'address',
      'creditLimit',
      'discountPlanType',
    ];

    for (const field of required) {
      if (
        merchantData[field] === undefined ||
        merchantData[field] === null ||
        merchantData[field] === ''
      ) {
        return {
          success: false,
          error: `${field} is required`,
        };
      }
    }

    // build the exact backend payload expected by MerchantCreate
    const backendData = {
      username: merchantData.username,
      password: merchantData.password,
      email: merchantData.email,
      company_name: merchantData.companyName,
      contact_name: merchantData.contactName,
      contact_email: merchantData.contactEmail,
      contact_phone: merchantData.contactPhone || null,
      address: merchantData.address,
      credit_limit: merchantData.creditLimit,
      discount_plan_type: merchantData.discountPlanType,
      fixed_discount_rate: merchantData.fixedDiscountRate ?? null,
    };

    // include flexible tiers if provided
    if (merchantData.flexibleThresholds && merchantData.flexibleThresholds.length > 0) {
      backendData.flexible_thresholds = merchantData.flexibleThresholds.map((tier, i) => {
        if (tier.limit !== null) return { up_to: tier.limit, rate: tier.rate };
        const prevLimit = i > 0 ? merchantData.flexibleThresholds[i - 1].limit : 0;
        return { above: prevLimit, rate: tier.rate };
      });
    }

    const merchant = await apiClient.post('/merchants', backendData);

    return {
      success: true,
      merchant: convertMerchantFromBackend(merchant),
    };
  } catch (error) {
    // FastAPI validation errors can come back in a few different shapes
    let errorMessage = 'failed to create merchant';

    if (Array.isArray(error?.details)) {
      errorMessage = error.details
        .map((item) => item.msg || JSON.stringify(item))
        .join(', ');
    } else if (Array.isArray(error?.detail)) {
      errorMessage = error.detail
        .map((item) => item.msg || JSON.stringify(item))
        .join(', ');
    } else if (typeof error?.detail === 'string') {
      errorMessage = error.detail;
    } else if (typeof error?.message === 'string') {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// update an existing merchant - admin/manager only
// only sends fields that were actually changed, everything else stays the same
export async function updateMerchant(merchantId, updates) {
  try {
    const backendUpdates = {};

    // only send fields that were actually provided
    if (updates.companyName !== undefined) backendUpdates.company_name = updates.companyName;
    if (updates.contactName !== undefined) backendUpdates.contact_name = updates.contactName;
    if (updates.contactEmail !== undefined) backendUpdates.contact_email = updates.contactEmail;
    if (updates.contactPhone !== undefined) backendUpdates.contact_phone = updates.contactPhone;
    if (updates.address !== undefined) backendUpdates.address = updates.address;
    if (updates.creditLimit !== undefined) backendUpdates.credit_limit = updates.creditLimit;
    if (updates.discountPlanType !== undefined) backendUpdates.discount_plan_type = updates.discountPlanType;
    if (updates.fixedDiscountRate !== undefined) backendUpdates.fixed_discount_rate = updates.fixedDiscountRate;

    // managers and admins can change account status (normal/suspended/in_default)
    if (updates.accountStatus !== undefined) backendUpdates.account_status = updates.accountStatus;

    // convert tiered thresholds from frontend format to backend format
    // each tier is { limit: number|null, rate: number }
    // limit=null means it's the open-ended "above" tier at the end
    if (updates.flexibleThresholds !== undefined && updates.flexibleThresholds !== null) {
      backendUpdates.flexible_thresholds = updates.flexibleThresholds.map((tier, i) => {
        if (tier.limit !== null) {
          return { up_to: tier.limit, rate: tier.rate };
        }
        // last tier - use the previous tier's limit as the lower bound
        const prevLimit = i > 0 ? updates.flexibleThresholds[i - 1].limit : 0;
        return { above: prevLimit, rate: tier.rate };
      });
    }

    const merchant = await apiClient.patch(`/merchants/${merchantId}`, backendUpdates);

    return {
      success: true,
      merchant: convertMerchantFromBackend(merchant),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// get a merchant's current balance - credit limit, outstanding debt and available credit
export async function getMerchantBalance(merchantId) {
  try {
    const balance = await apiClient.get(`/merchants/${merchantId}/balance`);
    return {
      creditLimit: parseFloat(balance.credit_limit),
      currentDebt: parseFloat(balance.outstanding_balance),
      availableCredit: parseFloat(balance.available_credit),
    };
  } catch (error) {
    console.error('failed to get merchant balance:', error);
    return {
      creditLimit: 0,
      currentDebt: 0,
      availableCredit: 0,
    };
  }
}

// update my own contact details - merchant self-service only
// only email and phone can be changed here; credit/discount is admin's job
export async function updateMyContactDetails(updates) {
  try {
    const backendUpdates = {};
    if (updates.contactEmail !== undefined) backendUpdates.contact_email = updates.contactEmail;
    if (updates.contactPhone !== undefined) backendUpdates.contact_phone = updates.contactPhone;

    const merchant = await apiClient.patch('/merchants/me', backendUpdates);
    return {
      success: true,
      merchant: convertMerchantFromBackend(merchant),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// reinstate a defaulted merchant account - director only
// requires a reason which gets stored in the audit trail on the merchant record
export async function reinstateAccount(merchantId, reason, directorId) {
  try {
    if (!reason || !reason.trim()) {
      return {
        success: false,
        error: 'Reinstatement reason is required',
      };
    }

    // if backend returns the updated merchant, convert and return it
    const merchant = await apiClient.post(`/merchants/${merchantId}/reinstate`, {
      reason,
      director_id: directorId,
    });

    return {
      success: true,
      merchant: merchant ? convertMerchantFromBackend(merchant) : null,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// convertStaffToMerchant - admin only, turns an existing staff user into a merchant
// creates a merchant record for them and switches their role over to merchant
export async function convertStaffToMerchant(userId, data) {
  try {
    const body = {
      company_name: data.companyName,
      contact_name: data.contactName,
      contact_email: data.contactEmail,
      contact_phone: data.contactPhone || null,
      address: data.address,
      credit_limit: data.creditLimit,
      discount_plan_type: data.discountPlanType,
      fixed_discount_rate: data.fixedDiscountRate ?? null,
    };

    // convert tiered thresholds to backend format if flexible plan
    if (data.discountPlanType === 'flexible' && data.flexibleThresholds) {
      body.flexible_thresholds = data.flexibleThresholds.map((tier, i) => {
        if (tier.limit !== null) {
          return { up_to: tier.limit, rate: tier.rate };
        }
        const prevLimit = i > 0 ? data.flexibleThresholds[i - 1].limit : 0;
        return { above: prevLimit, rate: tier.rate };
      });
    }

    const merchant = await apiClient.post(`/merchants/convert/${userId}`, body);
    return { success: true, merchant: convertMerchantFromBackend(merchant) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// deleteMerchant - admin only, removes the merchant and all their associated data
// this is irreversible so the ui should confirm before calling this
export async function deleteMerchant(merchantId) {
  try {
    await apiClient.delete(`/merchants/${merchantId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// deleteDiscountPlan - admin/manager only
// wipes the merchants discount plan - clears any flexible tiers, resets to fixed 0%
// used when a plan is no longer applicable and needs to be removed entirely
export async function deleteDiscountPlan(merchantId) {
  try {
    const merchant = await apiClient.delete(`/merchants/${merchantId}/discount-plan`);
    return { success: true, merchant: convertMerchantFromBackend(merchant) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// adjustMerchantBalance - admin/manager only
// positive amount = credit to the merchant (reduces their outstanding debt)
// negative amount = debit (adds to their debt, e.g. a correction charge)
// creates a payment record behind the scenes so the balance calculation stays accurate
export async function adjustMerchantBalance(merchantId, amount, reason) {
  try {
    if (!reason || !reason.trim()) {
      return { success: false, error: 'A reason is required for balance adjustments' };
    }
    if (amount === 0) {
      return { success: false, error: 'Adjustment amount cannot be zero' };
    }

    const balance = await apiClient.post(`/merchants/${merchantId}/balance/adjust`, {
      amount,
      reason: reason.trim(),
    });

    return {
      success: true,
      creditLimit: parseFloat(balance.credit_limit),
      currentDebt: parseFloat(balance.outstanding_balance),
      availableCredit: parseFloat(balance.available_credit),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export default {
  sendCommercialApplication,
  checkCommercialApplication,
  getAllMerchants,
  getMerchantById,
  getCurrentMerchant,
  getMerchantsByStatus,
  createMerchant,
  convertStaffToMerchant,
  updateMerchant,
  updateMyContactDetails,
  getMerchantBalance,
  reinstateAccount,
  deleteMerchant,
  deleteDiscountPlan,
  adjustMerchantBalance,
};