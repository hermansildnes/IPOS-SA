import { apiClient } from './apiClient';

// Helper to convert backend snake_case to frontend camelCase
function convertOrderFromBackend(order) {
  return {
    id: order.id,
    merchantId: order.merchant_id,
    merchantName: order.merchant_name,
    orderDate: order.order_date,
    status: order.status,
    total: parseFloat(order.total),
    discountAmount: parseFloat(order.discount_amount),
    amountDue: parseFloat(order.amount_due),
    dispatchedDate: order.dispatched_date,
    expectedDelivery: order.expected_delivery,
    courier: order.courier,
    courierRef: order.courier_ref,
    items: order.items?.map(item => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unit_price),
      cost: parseFloat(item.cost),
    })) || [],
    dispatchDetails: order.dispatch_details || null,
  };
}

/**
 * Place a new order
 */
export async function placeOrder(items) {
  try {
    const response = await apiClient.post('/orders', { items });

    return {
      success: true,
      orderId: response.order_id,
      message: response.message,
      total: response.total,
      discount: response.discount,
      amountDue: response.amount_due,
    };
  } catch (error) {
    console.error('Place order error:', error);
    return {
      success: false,
      error: error.message || 'Failed to place order. Please try again.',
    };
  }
}

/**
 * Track order progress
 */
export async function trackOrderProgress(orderID) {
  try {
    const order = await apiClient.get(`/orders/${orderID}`);
    const converted = convertOrderFromBackend(order);
    return converted.status;
  } catch (error) {
    console.error('Failed to track order:', error);
    return 'unknown';
  }
}

/**
 * Get full order details by ID
 */
export async function getOrderDetails(orderID) {
  try {
    const order = await apiClient.get(`/orders/${orderID}`);
    return convertOrderFromBackend(order);
  } catch (error) {
    console.error('Failed to get order details:', error);
    throw error;
  }
}

/**
 * Query merchant balance
 */
export async function queryBalance(merchantID) {
  try {
    const balance = await apiClient.get(`/merchants/${merchantID}/balance`);
    return {
      creditLimit: parseFloat(balance.credit_limit),
      currentDebt: parseFloat(balance.current_debt ?? balance.outstanding_balance ?? 0),
      availableCredit: parseFloat(balance.available_credit),
    };
  } catch (error) {
    console.error('Failed to query balance:', error);
    throw error;
  }
}

/**
 * View previous orders for a specific merchant
 */
export async function viewPreviousOrders(merchantID, status = null) {
  try {
    const params = status ? `?status=${status}` : '';
    const orders = await apiClient.get(`/merchants/${merchantID}/orders${params}`);

    return orders.map(order => ({
      id: order.id,
      status: order.status,
      orderDate: order.order_date,
      total: parseFloat(order.total),
      discountAmount: parseFloat(order.discount_amount),
      amountDue: parseFloat(order.amount_due),
      merchantId: order.merchant_id,
      merchantName: order.merchant_name,
    }));
  } catch (error) {
    console.error('Failed to get merchant orders:', error);
    throw error;
  }
}

/**
 * Get all orders for admin/manager
 */
export async function viewAllOrders(status = null) {
  try {
    const params = status ? `?status=${status}` : '';
    const orders = await apiClient.get(`/orders${params}`);

    return orders.map(order => ({
      id: order.id,
      status: order.status,
      orderDate: order.order_date,
      total: parseFloat(order.total),
      discountAmount: parseFloat(order.discount_amount),
      amountDue: parseFloat(order.amount_due),
      merchantId: order.merchant_id,
      merchantName: order.merchant_name,
    }));
  } catch (error) {
    console.error('Failed to get all orders:', error);
    throw error;
  }
}

/**
 * Get catalogue of all products
 */
export async function getCatalogue() {
  try {
    const products = await apiClient.get('/catalogue');
    return products.map(product => ({
      id: product.id,
      productCode: product.product_code,
      name: product.name,
      description: product.description,
      packageType: product.package_type,
      unit: product.unit,
      unitsPerPack: product.units_per_pack,
      packageCost: parseFloat(product.package_cost),
      stockQuantity: product.stock_quantity,
      minStockLevel: product.min_stock_level,
    }));
  } catch (error) {
    console.error('Failed to get catalogue:', error);
    return [];
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(orderID, status, dispatchDetails = null) {
  try {
    const body = { status };

    if (dispatchDetails) {
      body.dispatched_by = dispatchDetails.dispatchedBy || null;
      body.courier = dispatchDetails.courierName || null;
      body.courier_ref = dispatchDetails.trackingNumber || null;
      body.expected_delivery = dispatchDetails.expectedDeliveryDate || null;
    }

    await apiClient.patch(`/orders/${orderID}/status`, body);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  placeOrder,
  trackOrderProgress,
  getOrderDetails,
  queryBalance,
  viewPreviousOrders,
  viewAllOrders,
  getCatalogue,
  updateOrderStatus,
};