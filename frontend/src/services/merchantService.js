
// merchant service - wraps the backend merchant endpoints

import { apiClient } from './apiClient';

// backend returns snake_case, convert to camelCase for the frontend
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

    // current debt can come back under different field names depending on the endpoint
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

    // plain alias for older page code
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

    lastOrderDate: merchant.last_order_date || null,
    flexibleThresholds: merchant.flexible_thresholds || null,

    // AccountsPage currently reads these in snake_case so keep them too
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

// flip camelCase back to snake_case when sending to backend
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

// ipos-pu uses this to submit commercial membership applications
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

// lets applicants check if their application got approved
export async function checkCommercialApplication(regNumber) {
  try {
    const result = await apiClient.get(`/commercial-applications/check?reg_number=${regNumber}`);
    return result.found && result.status === 'approved';
  } catch (error) {
    console.error('failed to check commercial application:', error);
    return false;
  }
}

// get all merchants
export async function getAllMerchants() {
  try {
    const merchants = await apiClient.get('/merchants');
    return merchants.map(convertMerchantFromBackend);
  } catch (error) {
    console.error('failed to get merchants:', error);
    return [];
  }
}

// get one merchant by id
export async function getMerchantById(merchantId) {
  try {
    const merchant = await apiClient.get(`/merchants/${merchantId}`);
    return convertMerchantFromBackend(merchant);
  } catch (error) {
    console.error('failed to get merchant:', error);
    return null;
  }
}

// gets the current logged in merchant's account
export async function getCurrentMerchant() {
  try {
    const merchant = await apiClient.get('/merchants/me');
    return convertMerchantFromBackend(merchant);
  } catch (error) {
    console.error('failed to get current merchant:', error);
    return null;
  }
}

// filter by account status if provided
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

// creates merchant + user account in one go
export async function createMerchant(merchantData) {
  try {
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
    // fastapi validation errors can come back in a few different formats
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

// only sends fields that were actually changed
export async function updateMerchant(merchantId, updates) {
  try {
    const backendUpdates = {};

    if (updates.companyName !== undefined) backendUpdates.company_name = updates.companyName;
    if (updates.contactName !== undefined) backendUpdates.contact_name = updates.contactName;
    if (updates.contactEmail !== undefined) backendUpdates.contact_email = updates.contactEmail;
    if (updates.contactPhone !== undefined) backendUpdates.contact_phone = updates.contactPhone;
    if (updates.address !== undefined) backendUpdates.address = updates.address;
    if (updates.creditLimit !== undefined) backendUpdates.credit_limit = updates.creditLimit;
    if (updates.discountPlanType !== undefined) backendUpdates.discount_plan_type = updates.discountPlanType;
    if (updates.fixedDiscountRate !== undefined) backendUpdates.fixed_discount_rate = updates.fixedDiscountRate;
    if (updates.accountStatus !== undefined) backendUpdates.account_status = updates.accountStatus;

    // convert tiers to backend format, last tier is open-ended (no limit)
    if (updates.flexibleThresholds !== undefined && updates.flexibleThresholds !== null) {
      backendUpdates.flexible_thresholds = updates.flexibleThresholds.map((tier, i) => {
        if (tier.limit !== null) {
          return { up_to: tier.limit, rate: tier.rate };
        }
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

// credit limit, outstanding debt and available credit
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

// merchants can update their own contact details
export async function updateMyContactDetails(updates) {
  try {
    const backendUpdates = {};
    if (updates.contactEmail !== undefined) backendUpdates.contact_email = updates.contactEmail;
    if (updates.contactPhone !== undefined) backendUpdates.contact_phone = updates.contactPhone;
    if (updates.address !== undefined) backendUpdates.address = updates.address;

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

// director only - reinstate a defaulted account, reason is required
export async function reinstateAccount(merchantId, reason, directorId) {
  try {
    if (!reason || !reason.trim()) {
      return {
        success: false,
        error: 'Reinstatement reason is required',
      };
    }

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

// converts an existing staff user to a merchant
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

// delete merchant and all their data
export async function deleteMerchant(merchantId) {
  try {
    await apiClient.delete(`/merchants/${merchantId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// resets discount plan back to fixed 0%
export async function deleteDiscountPlan(merchantId) {
  try {
    const merchant = await apiClient.delete(`/merchants/${merchantId}/discount-plan`);
    return { success: true, merchant: convertMerchantFromBackend(merchant) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// positive = credit, negative = debit, creates a payment record either way
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

// get all payments for a merchant
export async function getMerchantPayments(merchantId) {
  try {
    const payments = await apiClient.get(`/merchants/${merchantId}/payments`);
    return payments.map(p => ({
      id: p.id,
      amount: parseFloat(p.amount),
      paymentDate: p.payment_date,
      paymentMethod: p.payment_method,
      referenceNumber: p.reference_number,
      recordedBy: p.recorded_by,
      createdAt: p.created_at,
    }));
  } catch (error) {
    console.error('failed to get merchant payments:', error);
    return [];
  }
}

// merchant version - gets own payment history
export async function getMyPayments() {
  try {
    const payments = await apiClient.get('/merchants/me/payments');
    return payments.map(p => ({
      id: p.id,
      amount: parseFloat(p.amount),
      paymentDate: p.payment_date,
      paymentMethod: p.payment_method,
      referenceNumber: p.reference_number,
      recordedBy: p.recorded_by,
      createdAt: p.created_at,
    }));
  } catch (error) {
    console.error('failed to get own payment history:', error);
    return [];
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
  getMerchantPayments,
  getMyPayments,
};
