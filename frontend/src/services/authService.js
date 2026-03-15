// Authentication Service
// Handles login, logout, and getting current user info
// wraps the backend /api/auth endpoints

import { apiClient, setAuthToken, clearAuthToken } from './apiClient';

// Login function - authenticates a user with username and password
// Calls POST /api/auth/login
// Returns the user data if successful, throws error if failed
export async function login(username, password) {
  try {

    // Call the backend login endpoint
    // Backend expects: { username: string, password: string }
    // Backend returns: { access_token: string, token_type: "bearer" }
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
// Calls POST /api/auth/logout (currently a stub in backend)
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
// Returns user object with id, username, email, role
// will fall back to mock user until backend is fully implemented

export async function getCurrentUser() {
  try {
    // Try to call backend /me endpoint
    const user = await apiClient.get('/auth/me');
    return user;
  } catch (error) {
    // Backend auth not fully implemented yet AT time of writing
    // Return a mock user based on the stored token for development
  
    console.warn('Backend /auth/me not implemented, using mock user for development');
    
    // For now, return a mock admin user

    return {
      id: '00000000-0000-0000-0000-000000000001',
      username: 'admin',
      email: 'admin@infopharma.com',
      role: 'admin',
      is_active: true,
    };
  }
}

// check if user is authenticated
// checks if a token exists in localStorage

export function isAuthenticated() {
  return !!localStorage.getItem('access_token');
}