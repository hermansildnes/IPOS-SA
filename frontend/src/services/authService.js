// Authentication Service
// Implements ISALoginAPI interface from architecture diagram
// Handles login, logout, and user session management

import { apiClient, setAuthToken, clearAuthToken } from './apiClient';

/**
 * Merchant login (ISALoginAPI.merchantLogin)
 * Endpoint: POST /api/auth/login
  */
export async function merchantLogin(username, password) {
  try {
    // Clear any old token first
    clearAuthToken();
    
    const response = await apiClient.post('/auth/login', {
      username,
      password,
    });
    
    if (!response || !response.access_token) {
      return { success: false, error: 'Invalid response from server' };
    }
    
    setAuthToken(response.access_token);
    
    const user = await getCurrentUser();
    
    return { success: true, user };
  } catch (error) {
    // Make sure token is cleared on error
    clearAuthToken();
    return { success: false, error: error.message || 'Login failed' };
  }
}

/**
 * Merchant disconnect/logout (ISALoginAPI.merchantDisconnect)
 * Endpoint: POST /api/auth/logout
 */
export async function merchantDisconnect(merchantID = null) {
  try {
    // Call backend logout endpoint
    await apiClient.post('/auth/logout');
    
    // Clear the token from localStorage
    clearAuthToken();
    
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    // Even if backend call fails, clear token locally
    clearAuthToken();
    return false;
  }
}

/**
 * Get current logged-in user details
 * Endpoint: GET /api/auth/me
 */
export async function getCurrentUser() {
  const user = await apiClient.get('/auth/me');
  return user;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!localStorage.getItem('access_token');
}

// Aliases for backward compatibility
export const login = merchantLogin;
export const logout = merchantDisconnect;

export default {
  merchantLogin,
  merchantDisconnect,
  getCurrentUser,
  isAuthenticated,
  // Aliases
  login,
  logout,
};