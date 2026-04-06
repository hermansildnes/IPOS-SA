// subsystem interface tests for placeOrder
// test cases 1-6 from the test case document

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../frontend/src/services/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
}));

import { apiClient } from '../../frontend/src/services/apiClient';
import { placeOrder } from '../../frontend/src/services/orderService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ISAOrderAPI.placeOrder', () => {

  // test case 1 - valid product, valid quantity
  it('TC-01: returns true for valid productID=1001 and quantity=5', async () => {
    apiClient.post.mockResolvedValueOnce({
      order_id: 'ORD-001',
      total: 50.00,
      discount: 0,
      amount_due: 50.00,
    });

    const result = await placeOrder([{ productId: 1001, quantity: 5 }]);

    expect(result.success).toBe(true);
  });

  // test case 2 - product does not exist
  it('TC-02: returns false when productID=9999 does not exist', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Product not found'));

    const result = await placeOrder([{ productId: 9999, quantity: 5 }]);

    expect(result.success).toBe(false);
  });

  // test case 3 - boundary value, zero quantity
  it('TC-03: returns false when quantity=0 (boundary value)', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Quantity must be at least 1'));

    const result = await placeOrder([{ productId: 1001, quantity: 0 }]);

    expect(result.success).toBe(false);
  });

  // test case 4 - negative quantity
  it('TC-04: returns false when quantity=-1 (negative)', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Quantity must be at least 1'));

    const result = await placeOrder([{ productId: 1001, quantity: -1 }]);

    expect(result.success).toBe(false);
  });

  // test case 5 - invalid product ID
  it('TC-05: returns false when productID=-1 (invalid)', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Product not found'));

    const result = await placeOrder([{ productId: -1, quantity: 5 }]);

    expect(result.success).toBe(false);
  });

  // test case 6 - extremely large quantity, outcome depends on stock
  it('TC-06: handles quantity=1000000, success or failure depending on stock', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Insufficient stock'));

    const result = await placeOrder([{ productId: 1001, quantity: 1000000 }]);

    expect(typeof result.success).toBe('boolean');
  });

  // HTTP wrapper tests

  // verifies the correct HTTP method and endpoint are used
  it('HTTP-01: sends a POST request to /orders', async () => {
    apiClient.post.mockResolvedValueOnce({
      order_id: 'ORD-001',
      total: 50,
      discount: 0,
      amount_due: 50,
    });

    await placeOrder([{ productId: 1001, quantity: 5 }]);

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.post.mock.calls[0][0]).toBe('/orders');
  });

  // verifies the request body contains the items array
  it('HTTP-02: sends items array in the request body', async () => {
    apiClient.post.mockResolvedValueOnce({
      order_id: 'ORD-001',
      total: 50,
      discount: 0,
      amount_due: 50,
    });

    const items = [{ productId: 1001, quantity: 5 }];
    await placeOrder(items);

    expect(apiClient.post).toHaveBeenCalledWith('/orders', { items });
  });

  // verifies the response fields are correctly mapped from snake_case to camelCase
  it('HTTP-03: correctly maps amount_due from response to amountDue', async () => {
    apiClient.post.mockResolvedValueOnce({
      order_id: 'ORD-001',
      total: 100,
      discount: 10,
      amount_due: 90,
    });

    const result = await placeOrder([{ productId: 1001, quantity: 5 }]);

    expect(result.amountDue).toBe(90);
    expect(result.orderId).toBe('ORD-001');
  });

  // verifies a network/server error returns a failure object and never throws
  it('HTTP-04: returns failure object instead of throwing on network error', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Network error'));

    const result = await placeOrder([{ productId: 1001, quantity: 1 }]);

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});