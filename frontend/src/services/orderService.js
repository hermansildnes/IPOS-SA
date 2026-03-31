// implements ISAOrderAPI - wrapper methods for all order-related backend calls
// placeOrder, trackOrderProgress, queryBalance, viewPreviousOrders, getCatalogue

import { apiClient } from './apiClient';

// convert backend snake_case order fields to camelCase for the frontend
// needed because python uses snake_case but JS convention is camelCase
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
    // items only present in detail responses, not list responses
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

// placeOrder (ISAOrderAPI.placeOrder)
// submits a new order to the backend with the current cart items
// returns success + orderId + discount info on success
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
    console.error('place order error:', error);
    return {
      success: false,
      error: error.message || 'Failed to place order. Please try again.',
    };
  }
}

// trackOrderProgress (ISAOrderAPI.trackOrderProgress)
// returns the current status string for a given order id
// this is what the interface diagram specifies - status only
export async function trackOrderProgress(orderID) {
  try {
    const order = await getOrderDetails(orderID);
    return order.status;
  } catch (error) {
    console.error('failed to track order:', error);
    return 'unknown';
  }
}

// getOrderDetails - internal helper used by OrderDetailPage
// returns the full order object (not just status) so we can show all fields
// same endpoint as trackOrderProgress but we need the whole thing here
export async function getOrderDetails(orderID) {
  try {
    const order = await apiClient.get(`/orders/${orderID}`);
    return convertOrderFromBackend(order);
  } catch (error) {
    console.error('failed to get order details:', error);
    throw error;
  }
}

// queryBalance (ISAOrderAPI.queryBalance)
// fetches the merchant's current credit limit, outstanding debt and available credit
export async function queryBalance(merchantID) {
  try {
    const balance = await apiClient.get(`/merchants/${merchantID}/balance`);
    return {
      creditLimit: parseFloat(balance.credit_limit),
      currentDebt: parseFloat(balance.current_debt ?? balance.outstanding_balance ?? 0),
      availableCredit: parseFloat(balance.available_credit),
    };
  } catch (error) {
    console.error('failed to query balance:', error);
    throw error;
  }
}

// viewPreviousOrders (ISAOrderAPI.viewPreviousOrders)
// gets the order history for a specific merchant, optionally filtered by status
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
    console.error('failed to get merchant orders:', error);
    throw error;
  }
}

// viewAllOrders - admin/manager only, not part of ISAOrderAPI
// used by the admin orders page to see all orders across all merchants
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
    console.error('failed to get all orders:', error);
    throw error;
  }
}

// getCatalogue (ISAOrderAPI.getCatalogue)
// fetches all products available in the catalogue
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
    console.error('failed to get catalogue:', error);
    return [];
  }
}

// addProductStock - admin/manager only, adds new stock to an existing catalogue item
// called when InfoPharma receives a delivery and needs to update availability
export async function addProductStock(productId, quantity) {
  try {
    const result = await apiClient.post(`/catalogue/${productId}/stock`, { quantity });
    return { success: true, product: result };
  } catch (error) {
    console.error('failed to add stock:', error);
    return { success: false, error: error.message };
  }
}

// getOrderInvoice - fetches the invoice for a specific order
// available to the merchant who placed the order, and to admin/manager/director
export async function getOrderInvoice(orderID) {
  try {
    const invoice = await apiClient.get(`/orders/${orderID}/invoice`);
    return {
      id: invoice.id,
      orderId: invoice.order_id,
      merchantId: invoice.merchant_id,
      invoiceDate: invoice.invoice_date,
      totalAmount: parseFloat(invoice.total_amount),
      discountAmount: parseFloat(invoice.discount_amount),
      amountDue: parseFloat(invoice.amount_due),
      createdAt: invoice.created_at,
    };
  } catch (error) {
    console.error('failed to get order invoice:', error);
    throw error;
  }
}

// createProduct - admin/manager only, adds a new product to the catalogue
export async function createProduct(productData) {
  try {
    const result = await apiClient.post('/catalogue', {
      product_code: productData.productCode,
      name: productData.name,
      description: productData.description,
      package_type: productData.packageType,
      unit: productData.unit,
      units_per_pack: productData.unitsPerPack,
      package_cost: productData.packageCost,
      min_stock_level: productData.minStockLevel ?? 0,
      restock_percentage: productData.restockPercentage ?? 10.00,
    });
    return { success: true, product: result };
  } catch (error) {
    console.error('failed to create product:', error);
    return { success: false, error: error.message };
  }
}

// updateProduct - admin/manager only, updates an existing catalogue item
export async function updateProduct(productId, productData) {
  try {
    const result = await apiClient.put(`/catalogue/${productId}`, {
      product_code: productData.productCode,
      name: productData.name,
      description: productData.description,
      package_type: productData.packageType,
      unit: productData.unit,
      units_per_pack: productData.unitsPerPack,
      package_cost: productData.packageCost,
      min_stock_level: productData.minStockLevel ?? 0,
      restock_percentage: productData.restockPercentage ?? 10.00,
    });
    return { success: true, product: result };
  } catch (error) {
    console.error('failed to update product:', error);
    return { success: false, error: error.message };
  }
}

// deleteOrder - admin/manager only, permanently removes an order and its invoice/items
export async function deleteOrder(orderID) {
  try {
    await apiClient.delete(`/orders/${orderID}`);
    return { success: true };
  } catch (error) {
    console.error('failed to delete order:', error);
    return { success: false, error: error.message };
  }
}

// deleteProduct - admin/manager only, removes a product from the catalogue
export async function deleteProduct(productId) {
  try {
    await apiClient.delete(`/catalogue/${productId}`);
    return { success: true };
  } catch (error) {
    console.error('failed to delete product:', error);
    return { success: false, error: error.message };
  }
}

// updateOrderStatus - used by admin/manager to move an order through its lifecycle
// dispatch step requires courier details which get stored on the order
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
  addProductStock,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteOrder,
  getOrderInvoice,
  updateOrderStatus,
};
