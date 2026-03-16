// API Client - handles all HTTP requests to the backend
// All service files use this client instead of calling fetch directly

const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Helper function to get the auth token from localStorage
// The token is stored when the user logs in

function getAuthToken() {
  return localStorage.getItem('access_token');
}

// Helper function to save the auth token after login
function setAuthToken(token) {
  localStorage.setItem('access_token', token);
}

// Helper function to remove the auth token on logout
function clearAuthToken() {
  localStorage.removeItem('access_token');
}

// Main API client class
// Provides methods for GET, POST, PATCH, PUT, DELETE requests
class ApiClient {
  
  // Generic request method - all other methods use this internally
  // Handles auth headers, JSON conversion and error responses
  async request(endpoint, options = {}) {
    // Build the full URL by combining base URL with endpoint
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Get the auth token if it exists
    const token = getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // If we have a token, add it to the auth header
    if (token) {
      headers['Authorisation'] = `Bearer ${token}`;
    }
    
    // Make the actual HTTP request
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    // If response is not ok (status 400-599), throw an error
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }
    
    // If response is No Content, return null
    if (response.status === 204) {
      return null;
    }
    
    // Parse and return the JSON response
    return response.json();
  }
  
  // GET request wrapper
  // Used for fetching data from the server
  // Example: apiClient.get('/merchants/123')
  async get(endpoint) {
    return this.request(endpoint, {
      method: 'GET',
    });
  }
  
  // POST request wrapper
  // Used for creating new resources

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  
  // PATCH request wrapper
  // Used for partially updating existing resources

  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
  
  // PUT request wrapper
  // Used for fully replacing existing resources

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  
  // DELETE request wrapper
  // Used for deleting resources

  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }
}

// Create a single instance of the API client
// Export this instance so all service files use the same client
const apiClient = new ApiClient();

// Export the client and auth helper functions
export { apiClient, setAuthToken, clearAuthToken, getAuthToken };