// Order Service
// Implements ISAOrderAPI interface from architecture diagram
// Each function corresponds to a specific backend API endpoint

import { apiClient } from './apiClient';

// Helper to convert backend snake_case to frontend camelCase
function convertOrderFromBackend(order) {
  return {
    id: order.id,
    merchantId: order.merchant_id,
    orderDate: order.order_date,
    status: order.status,
    total: parseFloat(order.total),
    discountAmount: parseFloat(order.discount_amount),
    amountDue: parseFloat(order.amount_due),
    items: order.items || [],
    dispatchDetails: order.dispatch_details || null,
  };
}

// Helper to convert frontend camelCase to backend snake_case
function convertOrderItemToBackend(item) {
  return {
    product_id: item.productId || item.productID,
    quantity: item.quantity,
  };
}

/**
 * Place a new order (ISAOrderAPI.placeOrder)
 * Endpoint: POST /api/orders
 * Auth: Required (merchant only)
*/
export async function placeOrder(items) {
  try {
    // Validate items
    if (!items || items.length === 0) {
      return {
        success: false,
        error: 'Order must contain at least one item'
      };
    }
    
    // Convert to backend format
    const backendItems = items.map(convertOrderItemToBackend);
    
    // Call backend API
    const order = await apiClient.post('/orders', { items: backendItems });
    
    return {
      success: true,
      orderId: order.id,
      order: convertOrderFromBackend(order)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Track order progress (ISAOrderAPI.trackOrderProgress)
 * Endpoint: GET /api/orders/{order_id}
 * Auth: Required
 */
export async function trackOrderProgress(orderID) {
  try {
    const order = await apiClient.get(`/orders/${orderID}`);
    const converted = convertOrderFromBackend(order);
    
    // Return status as string per interface specification
    return converted.status;
  } catch (error) {
    console.error('Failed to track order:', error);
    return 'unknown';
  }
}

/**
 * Get full order details by ID (extended functionality)
 */
export async function getOrderDetails(orderID) {
  try {
    const order = await apiClient.get(`/orders/${orderID}`);
    return convertOrderFromBackend(order);
  } catch (error) {
    console.error('Failed to get order details:', error);
    return null;
  }
}

/**
 * Query merchant balance (ISAOrderAPI.queryBalance)

 * Endpoint: GET /api/merchants/{merchant_id}/balance
 * Auth: Required
 */
export async function queryBalance(merchantID) {
  try {
    const balance = await apiClient.get(`/merchants/${merchantID}/balance`);
    // Return available credit as integer per interface specification
    return Math.floor(parseFloat(balance.available_credit));
  } catch (error) {
    console.error('Failed to query balance:', error);
    return 0;
  }
}

/**
 * View previous orders for a merchant (ISAOrderAPI.viewPreviousOrders)
 * Endpoint: GET /api/merchants/{merchant_id}/orders
 * Auth: Required
 */
export async function viewPreviousOrders(merchantID, status = null) {
  try {
    const endpoint = status 
      ? `/merchants/${merchantID}/orders?status=${status}`
      : `/merchants/${merchantID}/orders`;
    
    const orders = await apiClient.get(endpoint);
    return orders.map(convertOrderFromBackend);
  } catch (error) {
    console.error('Failed to view previous orders:', error);
    return [];
  }
}

/**
 * Get catalogue of all products (ISAOrderAPI.getCatalogue)
 * Endpoint: GET /api/catalogue
 * Auth: Not required
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
    }));
  } catch (error) {
    console.error('Failed to get catalogue:', error);
    return [];
  }
}

/**
 * Update order status (admin/manager only)

 * Endpoint: PATCH /api/orders/{order_id}/status
 * Auth: Required (admin/manager only)
 */
export async function updateOrderStatus(orderID, status, dispatchDetails = null) {
  try {
    const body = { status };
    
    if (dispatchDetails) {
      body.dispatch_details = {
        courier_name: dispatchDetails.courierName,
        tracking_number: dispatchDetails.trackingNumber,
        expected_delivery_date: dispatchDetails.expectedDeliveryDate,
      };
    }
    
    await apiClient.patch(`/orders/${orderID}/status`, body);
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  placeOrder,
  trackOrderProgress,
  getOrderDetails,
  queryBalance,
  viewPreviousOrders,
  getCatalogue,
  updateOrderStatus,
};