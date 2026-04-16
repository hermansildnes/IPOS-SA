// tests for authService - login, logout, staff management etc
// mocking apiClient so we dont need the backend running for these
// test cases 21-30 from the test case doc are covered here
// sequential suite numbers 28-56 track position in the full 1-82 suite

import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock has to be called before imports apparently, took me a while to figure that out
vi.mock('../../frontend/src/services/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
  getAuthToken: vi.fn(),
}));

import { apiClient, setAuthToken, clearAuthToken } from '../../frontend/src/services/apiClient';
import {
  merchantLogin,
  merchantDisconnect,
  getCurrentUser,
  changePassword,
  getStaffUsers,
  createStaffUser,
  changeUserRole,
  deleteStaffUser,
} from '../../frontend/src/services/authService';


// merchantLogin - test cases 21-26 (suite: 28-36)

describe('merchantLogin', () => {

  // test 21 / SA-01 (suite: 28)
  it('28: valid login works', async () => {
    // login returns a token, then we fetch the user with /me
    apiClient.post.mockResolvedValueOnce({ access_token: 'fake-jwt-token' });
    apiClient.get.mockResolvedValueOnce({ id: '1', username: 'merchant1', role: 'merchant' });

    const result = await merchantLogin('merchant1', 'correctPassword');

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user.username).toBe('merchant1');
    expect(setAuthToken).toHaveBeenCalledWith('fake-jwt-token');
  });

  // test 22 (suite: 29)
  it('29: wrong password fails', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Invalid username or password'));

    const result = await merchantLogin('merchant1', 'wrongPassword');

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  // test 23 (suite: 30)
  it('30: merchant doesnt exist', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Invalid username or password'));

    const result = await merchantLogin('unknown', 'pass');

    expect(result.success).toBe(false);
  });

  // tests 24, 25, 26 (suite: 31-33) - empty field combinations
  it('31: empty username fails', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Invalid username or password'));
    const result = await merchantLogin('', 'pass');
    expect(result.success).toBe(false);
  });

  it('32: empty password fails', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Invalid username or password'));
    const result = await merchantLogin('merchant1', '');
    expect(result.success).toBe(false);
  });

  it('33: both empty fails', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Invalid username or password'));
    const result = await merchantLogin('', '');
    expect(result.success).toBe(false);
  });

  // suite: 34 - not in the original test doc but wanted to cover this edge case -
  // just in case the response doesnt include a token for whatever reason
  it('34: fails if response has no token', async () => {
    apiClient.post.mockResolvedValueOnce({ message: 'ok' });

    const result = await merchantLogin('merchant1', 'correctPassword');

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  // suite: 35
  it('35: clears old token before login attempt', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('fail'));
    await merchantLogin('merchant1', 'pass');
    expect(clearAuthToken).toHaveBeenCalled();
  });

  // suite: 36 - making sure the right data shape goes to the backend
  it('36: sends username and password to the login endpoint', async () => {
    apiClient.post.mockResolvedValueOnce({ access_token: 'token' });
    apiClient.get.mockResolvedValueOnce({ id: '1', username: 'merchant1', role: 'merchant' });

    await merchantLogin('merchant1', 'pass123');

    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
      username: 'merchant1',
      password: 'pass123',
    });
  });
});


// merchantDisconnect - test cases 27-30 (suite: 37-39)

describe('merchantDisconnect', () => {

  // test 27 (suite: 37)
  it('37: successful logout clears the token', async () => {
    apiClient.post.mockResolvedValueOnce({});

    const result = await merchantDisconnect();

    expect(result).toBe(true);
    expect(clearAuthToken).toHaveBeenCalled();
  });

  // tests 28/29/30 (suite: 38) grouped - all have same expected behaviour
  // even if the backend errors we still want to clear the token locally
  // otherwise the user would be stuck logged in on the frontend
  it('38: clears token even when backend errors', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Session not found'));

    const result = await merchantDisconnect();

    expect(result).toBe(false);
    expect(clearAuthToken).toHaveBeenCalled();
  });

  // suite: 39
  it('39: hits the logout endpoint', async () => {
    apiClient.post.mockResolvedValueOnce({});
    await merchantDisconnect();
    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
  });
});


// getCurrentUser is basically just a pass-through to /auth/me so not much to test here
// suite: 40-41

describe('getCurrentUser', () => {

  it('40: returns whatever the backend sends back', async () => {
    const fakeUser = { id: 'abc', username: 'admin1', role: 'admin', email: 'admin@test.com' };
    apiClient.get.mockResolvedValueOnce(fakeUser);

    const user = await getCurrentUser();

    expect(user).toEqual(fakeUser);
    expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
  });

  it('41: throws if unauthorized', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('Unauthorized'));
    await expect(getCurrentUser()).rejects.toThrow('Unauthorized');
  });
});


// suite: 42-45

describe('changePassword', () => {

  it('42: works with correct current password', async () => {
    apiClient.post.mockResolvedValueOnce({ success: true });
    const result = await changePassword('oldPass123', 'newPass456');
    expect(result.success).toBe(true);
  });

  it('43: fails if current password is wrong', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Current password is incorrect'));

    const result = await changePassword('wrongOldPass', 'newPass456');

    expect(result.success).toBe(false);
    expect(result.error).toContain('incorrect');
  });

  it('44: fails if new password too short', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('New password must be at least 6 characters'));
    const result = await changePassword('oldPass123', '123');
    expect(result.success).toBe(false);
  });

  // suite: 45 - had a bug before where camelCase was being sent instead of snake_case
  // backend was rejecting it silently so adding this to catch regressions
  it('45: sends snake_case field names to the backend', async () => {
    apiClient.post.mockResolvedValueOnce({ success: true });

    await changePassword('oldPass', 'newPass');

    expect(apiClient.post).toHaveBeenCalledWith('/auth/change-password', {
      current_password: 'oldPass',
      new_password: 'newPass',
    });
  });
});


// suite: 46-47

describe('getStaffUsers', () => {

  it('46: returns mapped list with camelCase fields', async () => {
    apiClient.get.mockResolvedValueOnce([
      { id: '1', username: 'admin1', email: 'admin@test.com', role: 'admin', is_active: true },
      { id: '2', username: 'manager1', email: 'mgr@test.com', role: 'manager', is_active: true },
    ]);

    const users = await getStaffUsers();

    expect(users).toHaveLength(2);
    // is_active from backend should become isActive
    expect(users[0].isActive).toBe(true);
    expect(users[0].username).toBe('admin1');
  });

  it('47: throws on error', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('Forbidden'));
    await expect(getStaffUsers()).rejects.toThrow('Forbidden');
  });
});


// suite: 48-49

describe('createStaffUser', () => {

  it('48: creates user and returns success', async () => {
    const newUser = { id: '3', username: 'manager2', role: 'manager' };
    apiClient.post.mockResolvedValueOnce(newUser);

    const result = await createStaffUser('manager2', 'mgr2@test.com', 'pass123', 'manager');

    expect(result.success).toBe(true);
    expect(result.user.username).toBe('manager2');
  });

  it('49: fails if username already taken', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Username or email already exists'));

    const result = await createStaffUser('admin1', 'taken@test.com', 'pass', 'admin');

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});


// suite: 50-52

describe('changeUserRole', () => {

  it('50: role change succeeds and returns updated user', async () => {
    const updatedUser = { id: '2', username: 'manager1', role: 'director' };
    apiClient.patch.mockResolvedValueOnce(updatedUser);

    const result = await changeUserRole('2', 'director');

    expect(result.success).toBe(true);
    expect(result.user.role).toBe('director');
  });

  // suite: 51 - backend prevents self-demotion so testing that the error comes back correctly
  it('51: fails when trying to change your own role', async () => {
    apiClient.patch.mockRejectedValueOnce(new Error('You cannot demote yourself'));
    const result = await changeUserRole('self-id', 'manager');
    expect(result.success).toBe(false);
  });

  it('52: hits the right endpoint with role in body', async () => {
    apiClient.patch.mockResolvedValueOnce({ id: '5', role: 'admin' });

    await changeUserRole('5', 'admin');

    expect(apiClient.patch).toHaveBeenCalledWith('/auth/users/5/role', { role: 'admin' });
  });
});


// suite: 53-56

describe('deleteStaffUser', () => {

  it('53: delete succeeds', async () => {
    apiClient.delete.mockResolvedValueOnce(null); // 204 comes back as null
    const result = await deleteStaffUser('user-id-123');
    expect(result.success).toBe(true);
  });

  it('54: fails if user not found', async () => {
    apiClient.delete.mockRejectedValueOnce(new Error('User not found'));

    const result = await deleteStaffUser('nonexistent-id');

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  // suite: 55 - merchants have their own delete endpoint so this one should reject them
  it('55: fails for merchant accounts', async () => {
    apiClient.delete.mockRejectedValueOnce(new Error('Use the merchants endpoint to delete merchant accounts'));
    const result = await deleteStaffUser('merchant-user-id');
    expect(result.success).toBe(false);
  });

  it('56: calls correct url', async () => {
    apiClient.delete.mockResolvedValueOnce(null);
    await deleteStaffUser('abc-123');
    expect(apiClient.delete).toHaveBeenCalledWith('/auth/users/abc-123');
  });
});
