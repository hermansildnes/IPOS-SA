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
  login,
  logout,
};
