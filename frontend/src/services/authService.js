// implements ISALoginAPI - handles merchant login and session management
// the two required interface methods are merchantLogin and merchantDisconnect

import { apiClient, setAuthToken, clearAuthToken } from './apiClient';

// merchantLogin (ISALoginAPI.merchantLogin)
// sends credentials to backend, stores the jwt token if successful
// returns the full user object so the app knows who's logged in and their role
export async function merchantLogin(username, password) {
  try {
    // clear any old token first to avoid stale sessions
    clearAuthToken();

    const response = await apiClient.post('/auth/login', {
      username,
      password,
    });

    if (!response || !response.access_token) {
      return { success: false, error: 'Invalid response from server' };
    }

    setAuthToken(response.access_token);

    // fetch the full user details after login so we have role + id
    const user = await getCurrentUser();

    return { success: true, user };
  } catch (error) {
    clearAuthToken();
    return { success: false, error: error.message || 'Login failed' };
  }
}

// merchantDisconnect (ISALoginAPI.merchantDisconnect)
// tells the backend to invalidate the session, then clears the local token
export async function merchantDisconnect(merchantID = null) {
  try {
    await apiClient.post('/auth/logout');
    clearAuthToken();
    return true;
  } catch (error) {
    console.error('logout error:', error);
    // clear local token even if backend call fails - user is still logged out locally
    clearAuthToken();
    return false;
  }
}

// getCurrentUser - gets the logged-in user's details from the backend
// called after login and on app startup to restore the session
export async function getCurrentUser() {
  const user = await apiClient.get('/auth/me');
  return user;
}

// changePassword - lets any logged in user update their own password
// requires the current password to be correct before accepting the new one
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

// getStaffUsers - admin only, returns all non-merchant user accounts
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

// createStaffUser - admin only, creates a non-merchant user (admin, manager, director)
export async function createStaffUser(username, email, password, role) {
  try {
    const user = await apiClient.post('/auth/users', { username, email, password, role });
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// changeUserRole - admin only, updates the role of any non-merchant user
export async function changeUserRole(userId, role) {
  try {
    const user = await apiClient.patch(`/auth/users/${userId}/role`, { role });
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// deleteStaffUser - admin only, permanently removes a staff account
// can't be used on merchant accounts - those go through the merchants endpoint
export async function deleteStaffUser(userId) {
  try {
    await apiClient.delete(`/auth/users/${userId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// isAuthenticated - quick check whether we have a token saved
export function isAuthenticated() {
  return !!localStorage.getItem('access_token');
}

// aliases so AuthContext can call login/logout without knowing the full method names
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
