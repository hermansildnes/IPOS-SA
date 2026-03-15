import { createContext, useContext, useState, useEffect } from 'react';
import * as authService from '../services/authService';

// Create the context for auth state
const AuthContext = createContext(null);

// Provider component that wraps the app
// Manages login state and provides auth functions to all child components
export function AuthProvider({ children }) {
  // user = the currently logged in user object (or null if not logged in)
  const [user, setUser] = useState(null);
  
  // error = any error message from login attempts
  const [error, setError] = useState('');
  
  // loading = true while we're checking if user is already logged in on app start
  const [loading, setLoading] = useState(true);

  // On app startup, check if there's a saved token and restore the user session
  // This runs once when the app loads
  useEffect(() => {
    async function checkAuth() {
      // Check if user has a token saved in localStorage
      if (authService.isAuthenticated()) {
        try {
          // Try to get the current user from the backend using the saved token
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } catch (error) {
          // If the token is invalid or expired, clear it
          console.error('Session expired or invalid token');
          authService.logout();
        }
      }
      // Finished checking - app can now render
      setLoading(false);
    }

    checkAuth();
  }, []);

  // Login function - calls the real backend auth service
  // Returns true if login succeeded, false if it failed
  const login = async (username, password) => {
    setError('');
    
    // Call the real auth service (which calls the backend API)
    const result = await authService.login(username, password);
    
    if (result.success) {
      // Login succeeded - save the user to state
      setUser(result.user);
      return true;
    } else {
      // Login failed - set the error message
      setError(result.error || 'Login failed');
      return false;
    }
  };

  // Logout function - clears the user and calls backend logout
  const logout = async () => {
    await authService.logout();
    setUser(null);
    setError('');
  };

  // Show a loading screen while we check if user is logged in
  // This prevents a flash of the login page before redirecting to dashboad
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem',
          }} />
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
// Other components use this to access user, login, logout etc.
export function useAuth() {
  return useContext(AuthContext);
}