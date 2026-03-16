// Authentication Service
// Handles login, logout, and getting current user info
// wraps the backend /api/auth endpoints

import { apiClient, setAuthToken, clearAuthToken } from './apiClient';

// Login function - authenticates a user with username and password
// Calls POST /api/auth/login
export async function login(username, password) {
  try {

    // Call the backend login endpoint
 
    const response = await apiClient.post('/auth/login', {
      username,
      password,
    });
    
    // Save the token to localStorage so it persists across page refreshes
    setAuthToken(response.access_token);
    
    // Get the full user details using the token we just received
    const user = await getCurrentUser();
    
    return { success: true, user };
  } catch (error) {
    // If login fails, return error message
    return { success: false, error: error.message };
  }
}

// Logout function - clears the auth token and logs out the user

export async function logout() {
  try {
    // Call backend logout endpoint 
    await apiClient.post('/auth/logout');
  } catch (error) {
    // Even if backend call fails, we still clear the token locally
    console.error('Logout error:', error);
  } finally {
    // Always clear the token from localStorage
    clearAuthToken();
  }
}
// Get current user function - fetches the logged-in user's details
// Calls GET /api/auth/me


export async function getCurrentUser() {
  // Call backend /me endpoint to get current user

  // This endpoint requires authentication (uses the token from localStorage)
 
  const user = await apiClient.get('/auth/me');
  return user;
}

export function isAuthenticated() {
  return !!localStorage.getItem('access_token');
}

