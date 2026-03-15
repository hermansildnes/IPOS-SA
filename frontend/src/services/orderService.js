// Orders Service
// Wrapper methods that call backend /api/orders endpoints
// Each function corresponds to a specific API endpoint

import { apiClient } from './apiClient';

// Helper function to convert backend snake_case to frontend camelCase
// Backend returns: { order_id, merchant_id, order_date, ... }
// Frontend expects: { orderId, merchantId, orderDate, ... }

function convertOrderFromBackend(order) {
  return {
    id: order.id,
    merchantId: order.merchant_id,
    orderDate: order.order_date,
    status: order.status,
    total: parseFloat(order.total),
    discountAmount: parseFloat(order.discount_amount),
    amountDue: parseFloat(order.amount_due),
    dispatchedBy: order.dispatched_by,
    dispatchedDate: order.dispatched_date,
    courier: order.courier,
    courierRef: order.courier_ref,
    expectedDelivery: order.expected_delivery,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}

// Helper function to convert frontend camelCase to backend snake_case
// Frontend sends: { productId, ... }
// Backend expects: { product_id, ... }
function convertOrderItemToBackend(item) {
  return {
    product_id: item.productId,
    quantity: item.quantity,
  };
}

/**
 * Create a new order for the logged in merchant
 * Endpoint: POST /api/orders
 * Auth: Required (merchant role only)
 */
export async function createOrder(items) {
  try {
    // Convert items from camelCase to snake_case for backend
    const backendItems = items.map(convertOrderItemToBackend);
    
    // Call backend API
    // POST /api/orders with body: { items: [...] }
    const response = await apiClient.post('/orders', {
      items: backendItems
    });
    
    return {
      success: true,
      orderId: response.order_id,
      message: response.message,
      total: response.total,
      discount: response.discount,
      amountDue: response.amount_due,
    };
  } catch (error) {
    // Backend returned an error (validation failed, insufficient stock, etc.)
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get a single order by ID
 * Endpoint: GET /api/orders/{order_id}
 * Auth: Required
 */
export async function getOrderById(orderId) {
  try {
    // Call backend API
    // GET /api/orders/{order_id}
    const order = await apiClient.get(`/orders/${orderId}`);
    
    // Convert from snake_case to camelCase
    return convertOrderFromBackend(order);
  } catch (error) {
    console.error('Failed to get order:', error);
    return null;
  }
}

/**
 * Get all orders for a specific merchant

 * Endpoint: GET /api/merchants/{merchant_id}/orders
 * Auth: Required
 );
 */
export async function getOrdersByMerchant(merchantId, status = null) {
  try {
    // Build the endpoint URL
    let endpoint = `/merchants/${merchantId}/orders`;
    
    // Add status filter if provided
    if (status) {
      endpoint += `?status=${status}`;
    }
    
    // Call backend API
    const orders = await apiClient.get(endpoint);
    
    // Convert each order from snake_case to camelCase
    return orders.map(convertOrderFromBackend);
  } catch (error) {
    console.error('Failed to get merchant orders:', error);
    return [];
  }
}

/**
 * Update order status (Admin/Manager only) 
 * Endpoint: PATCH /api/orders/{order_id}/status
 * Auth: Required (admin or manager role only)
 * @param {string} orderId - UUID of the order
 * @param {string} status - New status (accepted, processing, dispatched, delivered)
 * @param {object} dispatchDetails - Required when status = dispatched
 *   - dispatchedBy
 *   - courier
 *   - courierRef
 *   - expectedDelivery
 */
export async function updateOrderStatus(orderId, status, dispatchDetails = {}) {
  try {
    // Build request body
    const body = {
      status,
      // Convert camelCase to snake_case for backend
      dispatched_by: dispatchDetails.dispatchedBy || null,
      courier: dispatchDetails.courier || null,
      courier_ref: dispatchDetails.courierRef || null,
      expected_delivery: dispatchDetails.expectedDelivery || null,
    };
    
    // Call backend API
    // PATCH /api/orders/{order_id}/status
    const response = await apiClient.patch(`/orders/${orderId}/status`, body);
    
    return {
      success: true,
      message: response.message,
      orderId: response.order_id,
      newStatus: response.new_status,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Export all functions as named exports
export default {
  createOrder,
  getOrderById,
  getOrdersByMerchant,
  updateOrderStatus,
};