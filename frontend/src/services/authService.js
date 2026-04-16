// auth service - login, logout, staff management

import { apiClient, setAuthToken, clearAuthToken } from './apiClient';

// login - stores the jwt and fetches the user
export async function merchantLogin(username, password) {
  try {
    // clear old token first
    clearAuthToken();

    const response = await apiClient.post('/auth/login', {
      username,
      password,
    });

    if (!response || !response.access_token) {
      return { success: false, error: 'Invalid response from server' };
    }

    setAuthToken(response.access_token);

    // get the full user so we have their role
    const user = await getCurrentUser();

    return { success: true, user };
  } catch (error) {
    clearAuthToken();
    return { success: false, error: error.message || 'Login failed' };
  }
}

// logout - clears the token locally too
export async function merchantDisconnect(merchantID = null) {
  try {
    await apiClient.post('/auth/logout');
    clearAuthToken();
    return true;
  } catch (error) {
    console.error('logout error:', error);
    // still clear token if backend errors, otherwise user is stuck logged in
    clearAuthToken();
    return false;
  }
}

// get current user, called on login and on app load
export async function getCurrentUser() {
  const user = await apiClient.get('/auth/me');
  return user;
}

// change password, needs current password to verify
export async function changePassword(currentPassword, newPassword) {
  try {
    await apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// get all staff users
export async function getStaffUsers() {
  try {
    const users = await apiClient.get('/auth/users');
    return users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      isActive: u.is_active,
    }));
  } catch (error) {
    console.error('failed to get staff users:', error);
    throw error;
  }
}

// create a staff user
export async function createStaffUser(username, email, password, role) {
  try {
    const user = await apiClient.post('/auth/users', { username, email, password, role });
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// change a user's role
export async function changeUserRole(userId, role) {
  try {
    const user = await apiClient.patch(`/auth/users/${userId}/role`, { role });
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// delete a staff account, not for merchant accounts
export async function deleteStaffUser(userId) {
  try {
    await apiClient.delete(`/auth/users/${userId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// check if we have a token
export function isAuthenticated() {
  return !!localStorage.getItem('access_token');
}

// aliases used by AuthContext
export const login = merchantLogin;
export const logout = merchantDisconnect;

export default {
  merchantLogin,
  merchantDisconnect,
  getCurrentUser,
  isAuthenticated,
  changePassword,
  getStaffUsers,
  createStaffUser,
  changeUserRole,
  deleteStaffUser,
  login,
  logout,
};
