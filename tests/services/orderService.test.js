// tests for orderService - covers OrderAPIImpl from the test case doc
// test cases 1-20 and SA-02, SA-03, SA-04 are all in here
// sequential suite numbers 1-27 track position in the full 1-82 suite

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../frontend/src/services/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from '../../frontend/src/services/apiClient';
import {
  placeOrder,
  trackOrderProgress,
  getOrderDetails,
  queryBalance,
  viewPreviousOrders,
  getCatalogue,
} from '../../frontend/src/services/orderService';


// placeOrder - test cases 1-6 (suite: 1-7)

describe('placeOrder', () => {

  // test case 1 / SA-02 (suite: 1) - normal valid order
  it('1: places an order and returns success with order id', async () => {
    apiClient.post.mockResolvedValueOnce({
      order_id: 'abc-123',
      message: 'Order placed',
      total: 150.00,
      discount: 7.50,
      amount_due: 142.50,
    });

    const result = await placeOrder([{ productId: 101, quantity: 10 }]);

    expect(result.success).toBe(true);
    expect(result.orderId).toBe('abc-123');
    expect(result.amountDue).toBe(142.50);
  });

  // test case 2 (suite: 2) - product doesnt exist in system
  it('2: fails when product doesnt exist', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Product not found'));

    const result = await placeOrder([{ productId: 200, quantity: 1 }]);

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  // test cases 3 and 4 (suite: 3-4) - zero and negative quantity
  it('3: fails with zero quantity', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Quantity must be at least 1'));
    const result = await placeOrder([{ productId: 100, quantity: 0 }]);
    expect(result.success).toBe(false);
  });

  it('4: fails with negative quantity', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Quantity must be at least 1'));
    const result = await placeOrder([{ productId: 100, quantity: -1 }]);
    expect(result.success).toBe(false);
  });

  // test case 5 (suite: 5) - invalid product id
  it('5: fails with invalid product id', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Product not found'));
    const result = await placeOrder([{ productId: -1, quantity: 1 }]);
    expect(result.success).toBe(false);
  });

  // test case 6 (suite: 6) - massive quantity, depends on stock
  // we cant know whether it passes or fails without knowing stock levels
  // so just checking that the function handles both outcomes correctly
  it('6: handles very large quantity - outcome depends on stock', async () => {
    apiClient.post.mockResolvedValueOnce({
      order_id: 'xyz',
      total: 99999,
      discount: 0,
      amount_due: 99999,
    });

    const result = await placeOrder([{ productId: 100, quantity: 1000000 }]);
    expect(result.success).toBe(true);
  });

  // suite: 7 - verifies the correct payload shape reaches the endpoint
  it('7: sends items array to the orders endpoint', async () => {
    apiClient.post.mockResolvedValueOnce({ order_id: '1', total: 10, discount: 0, amount_due: 10 });

    const items = [{ productId: 101, quantity: 2 }];
    await placeOrder(items);

    expect(apiClient.post).toHaveBeenCalledWith('/orders', { items });
  });
});


// trackOrderProgress - test cases 7-10 (suite: 8-11)
// this one internally calls getOrderDetails then just returns the status field

describe('trackOrderProgress', () => {

  // test case 7 / SA-03 (suite: 8) - valid existing order
  it('8: returns the order status string', async () => {
    apiClient.get.mockResolvedValueOnce({
      id: 'order-1',
      status: 'accepted',
      merchant_id: 'm1',
      order_date: '2026-01-01',
      total: '100',
      discount_amount: '0',
      amount_due: '100',
    });

    const status = await trackOrderProgress('order-1');

    expect(status).toBe('accepted');
  });

  // test cases 8, 9, 10 (suite: 9-11) - invalid/nonexistent order ids
  // trackOrderProgress returns 'unknown' rather than throwing, which is fine for the UI
  it('9: returns unknown for a nonexistent order', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('Order not found'));
    const status = await trackOrderProgress('99999');
    expect(status).toBe('unknown');
  });

  it('10: returns unknown for invalid id', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('Invalid order ID'));
    const status = await trackOrderProgress('-1');
    expect(status).toBe('unknown');
  });

  it('11: returns unknown for boundary value zero', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('Invalid order ID'));
    const status = await trackOrderProgress('0');
    expect(status).toBe('unknown');
  });
});


// getOrderDetails - not in the original doc but its used everywhere so worth testing
// suite: 12-14

describe('getOrderDetails', () => {

  it('12: converts snake_case fields to camelCase', async () => {
    apiClient.get.mockResolvedValueOnce({
      id: 'order-abc',
      merchant_id: 'merch-1',
      merchant_name: 'PharmaCo',
      order_date: '2026-01-15',
      status: 'dispatched',
      total: '200.00',
      discount_amount: '10.00',
      amount_due: '190.00',
      dispatched_date: '2026-01-16',
      expected_delivery: '2026-01-18',
      courier: 'DHL',
      courier_ref: 'DHL12345',
      items: [],
    });

    const order = await getOrderDetails('order-abc');

    // spot checking the mapping - if these fail it means the converter broke
    expect(order.merchantId).toBe('merch-1');
    expect(order.orderDate).toBe('2026-01-15');
    expect(order.discountAmount).toBe(10.00);
    expect(order.amountDue).toBe(190.00);
    expect(order.courierRef).toBe('DHL12345');
  });

  it('13: maps order items correctly', async () => {
    apiClient.get.mockResolvedValueOnce({
      id: 'order-1',
      merchant_id: 'm1',
      order_date: '2026-01-01',
      status: 'accepted',
      total: '50',
      discount_amount: '0',
      amount_due: '50',
      items: [
        { id: 'item-1', product_id: 'p1', product_name: 'Aspirin', quantity: 5, unit_price: '8.00', cost: '40.00' },
      ],
    });

    const order = await getOrderDetails('order-1');

    expect(order.items).toHaveLength(1);
    expect(order.items[0].productName).toBe('Aspirin');
    expect(order.items[0].unitPrice).toBe(8.00);
  });

  it('14: throws if order not found', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('Order not found'));
    await expect(getOrderDetails('bad-id')).rejects.toThrow('Order not found');
  });
});


// queryBalance - test cases 11-14 / SA-04 (suite: 15-19)

describe('queryBalance', () => {

  // test case 11 / SA-04 (suite: 15) - valid merchant, should return balance info
  it('15: returns credit limit and debt for a valid merchant', async () => {
    apiClient.get.mockResolvedValueOnce({
      credit_limit: '5000.00',
      outstanding_balance: '1200.00',
      available_credit: '3800.00',
    });

    const balance = await queryBalance('merch-202');

    expect(balance.creditLimit).toBe(5000.00);
    expect(balance.currentDebt).toBe(1200.00);
    expect(balance.availableCredit).toBe(3800.00);
  });

  // SA-04 specifically says merchantID=202 with 0 balance so testing that too (suite: 16)
  it('16: returns zero debt for a merchant with no orders', async () => {
    apiClient.get.mockResolvedValueOnce({
      credit_limit: '5000.00',
      outstanding_balance: '0.00',
      available_credit: '5000.00',
    });

    const balance = await queryBalance('merch-202');

    expect(balance.currentDebt).toBe(0);
  });

  // test cases 12, 13, 14 (suite: 17-19) - nonexistent/invalid merchant ids
  it('17: throws when merchant doesnt exist', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('Merchant not found'));
    await expect(queryBalance('9999')).rejects.toThrow();
  });

  it('18: throws for invalid merchant id', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('Merchant not found'));
    await expect(queryBalance('-1')).rejects.toThrow();
  });

  it('19: throws for boundary value zero', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('Merchant not found'));
    await expect(queryBalance('0')).rejects.toThrow();
  });
});


// viewPreviousOrders - test cases 15-18 (suite: 20-24)

describe('viewPreviousOrders', () => {

  // test case 15 (suite: 20) - merchant with existing orders
  it('20: returns a list of orders for the merchant', async () => {
    apiClient.get.mockResolvedValueOnce([
      { id: 'o1', status: 'delivered', order_date: '2026-01-01', total: '100', discount_amount: '5', amount_due: '95', merchant_id: 'm1', merchant_name: 'PharmaCo' },
      { id: 'o2', status: 'processing', order_date: '2026-01-10', total: '200', discount_amount: '0', amount_due: '200', merchant_id: 'm1', merchant_name: 'PharmaCo' },
    ]);

    const orders = await viewPreviousOrders('m1');

    expect(orders).toHaveLength(2);
    expect(orders[0].id).toBe('o1');
  });

  // test case 16 (suite: 21) - merchant exists but has placed no orders yet
  it('21: returns empty list when merchant has no orders', async () => {
    apiClient.get.mockResolvedValueOnce([]);
    const orders = await viewPreviousOrders('m1');
    expect(orders).toHaveLength(0);
  });

  // test cases 17 and 18 (suite: 22-23) - nonexistent/invalid merchant
  it('22: throws when merchant doesnt exist', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('Merchant not found'));
    await expect(viewPreviousOrders('2000')).rejects.toThrow();
  });

  it('23: throws for invalid merchant id', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('Merchant not found'));
    await expect(viewPreviousOrders('-1')).rejects.toThrow();
  });

  // suite: 24 - checking the camelCase mapping on list responses too
  it('24: maps fields to camelCase', async () => {
    apiClient.get.mockResolvedValueOnce([
      { id: 'o1', status: 'accepted', order_date: '2026-02-01', total: '300', discount_amount: '15', amount_due: '285', merchant_id: 'm1', merchant_name: 'Test Co' },
    ]);

    const orders = await viewPreviousOrders('m1');

    expect(orders[0].orderDate).toBe('2026-02-01');
    expect(orders[0].discountAmount).toBe(15);
    expect(orders[0].amountDue).toBe(285);
  });
});


// getCatalogue - test cases 19-20 (suite: 25-27)

describe('getCatalogue', () => {

  // test case 19 (suite: 25) - catalogue has products
  it('25: returns a list of products', async () => {
    apiClient.get.mockResolvedValueOnce([
      { id: 'p1', product_code: 'ASP001', name: 'Aspirin', description: 'Pain relief', package_type: 'Box', unit: 'tablet', units_per_pack: 100, package_cost: '8.50', stock_quantity: 500, min_stock_level: 50 },
      { id: 'p2', product_code: 'IBU001', name: 'Ibuprofen', description: 'Anti-inflammatory', package_type: 'Bottle', unit: 'capsule', units_per_pack: 60, package_cost: '12.00', stock_quantity: 200, min_stock_level: 30 },
    ]);

    const products = await getCatalogue();

    expect(products).toHaveLength(2);
    expect(products[0].name).toBe('Aspirin');
    // checking the mapping
    expect(products[0].productCode).toBe('ASP001');
    expect(products[0].packageCost).toBe(8.50);
    expect(products[0].minStockLevel).toBe(50);
  });

  // test case 20 (suite: 26) - empty catalogue
  it('26: returns empty list when catalogue is empty', async () => {
    apiClient.get.mockResolvedValueOnce([]);
    const products = await getCatalogue();
    expect(products).toHaveLength(0);
    expect(Array.isArray(products)).toBe(true);
  });

  // suite: 27 - getCatalogue returns [] on error rather than throwing - intentional design decision
  // so the page still renders even if the catalogue fetch fails
  it('27: returns empty array on error instead of throwing', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('Server error'));
    const products = await getCatalogue();
    expect(products).toEqual([]);
  });
});
