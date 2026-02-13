import { createContext, useContext, useState } from 'react';

// This is the "container" for our login state
// Any component in the app can access this to check who's logged in
const AuthContext = createContext(null);

// These are our test users for development
// When the backend is ready, we'll replace this with real API calls
// Each user has a role which controls what they can see in the app
const MOCK_USERS = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    name: 'System Admin',
  },
  {
    id: 2,
    username: 'director',
    password: 'director123',
    role: 'director',
    name: 'Director of Operations',
  },
  {
    id: 3,
    username: 'manager',
    password: 'manager123',
    role: 'manager',
    name: 'Operations Manager',
  },
  {
    id: 4,
    username: 'merchant',
    password: 'merchant123',
    role: 'merchant',
    // Using the example merchant name from the project brief
    name: 'Cosymed Ltd',
  },
];

// This wraps the entire app so every page has access to login state
//like a "global store" for authentication
export function AuthProvider({ children }) {
  // user = who is currently logged in (null if nobody is logged in)
  const [user, setUser] = useState(null);
  // error = any login error message to show to the user
  const [error, setError] = useState('');

  // This runs when someone clicks the login button
  // Returns true if login worked, false if it didn't


  // TODO: Replace mock check with real API call when backend is ready
  const login = (username, password) => {


    // Check if the username and password match any of our mock users
    const foundUser = MOCK_USERS.find(
      (u) => u.username === username && u.password === password
    );

    if (foundUser) {
        
      // Login worked - save the user to state and clear any old errors
      setUser(foundUser);
      setError('');
      return true;
    } else {
      // Login failed - show error message to the user
      setError('Invalid username or password');
      return false;
    }
  };

  // This runs when someone clicks the logout button
  // Clears everything so the app forgets who was logged in
  const logout = () => {
    setUser(null);
    setError('');
  };

  // Make the user, error, login, and logout available to every component
  return (
    <AuthContext.Provider value={{ user, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// A shortcut hook so components don't have to import AuthContext directly
// Usage: const { user, login, logout } = useAuth();
export function useAuth() {
  return useContext(AuthContext);
}