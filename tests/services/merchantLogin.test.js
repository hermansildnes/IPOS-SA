// subsystem interface tests for merchantLogin
// test cases 21-26 from the test case document

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../frontend/src/services/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
}));

import { apiClient, setAuthToken, clearAuthToken } from '../../frontend/src/services/apiClient';
import { merchantLogin } from '../../frontend/src/services/authService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ISALoginAPI.merchantLogin', () => {

  // test case 21 - valid credentials
  it('TC-21: returns true for username="merchant1" and correct password', async () => {
    apiClient.post.mockResolvedValueOnce({ access_token: 'valid-jwt-token' });
    apiClient.get.mockResolvedValueOnce({ id: 'M001', username: 'merchant1', role: 'merchant' });

    const result = await merchantLogin('merchant1', 'correctPass');

    expect(result.success).toBe(true);
    expect(result.user.username).toBe('merchant1');
    expect(setAuthToken).toHaveBeenCalledWith('valid-jwt-token');
  });

  // test case 22 - wrong password
  it('TC-22: returns false for username="merchant1" with wrong password', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Invalid username or password'));

    const result = await merchantLogin('merchant1', 'wrongPass');

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  // test case 23 - merchant does not exist
  it('TC-23: returns false when username="unknown" does not exist', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Invalid username or password'));

    const result = await merchantLogin('unknown', 'pass');

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  // test case 24 - empty username
  it('TC-24: returns false when username is empty', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Invalid username or password'));

    const result = await merchantLogin('', 'pass');

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  // test case 25 - empty password
  it('TC-25: returns false when password is empty', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Invalid username or password'));

    const result = await merchantLogin('merchant1', '');

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  // test case 26 - both empty
  it('TC-26: returns false when both username and password are empty', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Invalid username or password'));

    const result = await merchantLogin('', '');

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});