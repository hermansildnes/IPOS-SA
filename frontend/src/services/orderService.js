// Order Service
// Implements ISAOrderAPI interface from architecture diagram
// Each function corresponds to a specific backend API endpoint

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

// Helper to convert frontend camelCase to backend snake case
function convertOrderItemToBackend(item) {
  return {
    product_id: item.productId || item.productID || item.product_id,
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
    const response = await apiClient.post('/orders', { items });
    
    return { 
      success: true, 
      orderId: response.order_id,
      message: response.message,
      total: response.total,
      discount: response.discount,
      amountDue: response.amount_due
    };
  } catch (error) {
    console.error('Place order error:', error);  // Log for debugging
    return { 
      success: false, 
      error: error.message || 'Failed to place order. Please try again.'
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
    
    // Return status as string per interface spec
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
    throw error;  // Changed: throw instead of return null so component can handle error
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
    
    // Return full balance object with camelCase
    return {
      creditLimit: parseFloat(balance.credit_limit),
      currentDebt: parseFloat(balance.current_debt),
      availableCredit: parseFloat(balance.available_credit),
    };
  } catch (error) {
    console.error('Failed to query balance:', error);
    throw error;  // Throw so caller can handle
  }
}

/**
 * View previous orders for a merchant (ISAOrderAPI.viewPreviousOrders)
 * Endpoint: GET /api/merchants/{merchant_id}/orders
 * Auth: Required
 */
export async function viewPreviousOrders(merchantID, status = null) {
  try {
    const params = status ? `?status=${status}` : '';
    const orders = await apiClient.get(`/merchants/${merchantID}/orders${params}`);
    
    // Convert backend snake case to frontend camelCase
    return orders.map(order => ({
      id: order.id,
      status: order.status,
      orderDate: order.order_date,
      total: parseFloat(order.total),
      discountAmount: parseFloat(order.discount_amount),
      amountDue: parseFloat(order.amount_due),
    }));
  } catch (error) {
    console.error('Failed to get orders:', error);
    throw error;  // Throw so caller can handle
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
      minStockLevel: product.min_stock_level,  
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