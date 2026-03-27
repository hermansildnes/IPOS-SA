// base HTTP client used by all service files
// every request goes through here so auth headers are always included

const API_BASE_URL = 'http://127.0.0.1:8000/api';

// helper to get the auth token from localStorage
// the token is stored when the user logs in and cleared on logout
function getAuthToken() {
  return localStorage.getItem('access_token');
}

// stores the jwt token in localStorage after a successful login
function setAuthToken(token) {
  localStorage.setItem('access_token', token);
}

// removes the token - called on logout and when the backend returns 401
function clearAuthToken() {
  localStorage.removeItem('access_token');
}

class ApiClient {

  // builds and sends the request, handles auth headers and error responses
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getAuthToken();

    // always send json, merge in any extra headers from the caller
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // attach the bearer token if we have one - backend needs it for protected routes
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // 401 = token expired or invalid, clear it so user gets redirected to login
      if (response.status === 401) {
        clearAuthToken();
      }

      // try to pull the detail message out of the response body, fall back to status text
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    // 204 = success with no body, return null so callers don't try to parse it
    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  // shorthand methods so service files don't have to pass method/body manually

  // read data - no body needed
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // create a new resource
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // partial update - only sends the fields that changed
  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // full replace - sends the entire object
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // remove a resource
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// single shared instance used by all service files
const apiClient = new ApiClient();

// Export the client and auth helper functions
export { apiClient, setAuthToken, clearAuthToken, getAuthToken };
