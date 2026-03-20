export function getErrorMessage(error) {
  // Handle specific error codes
  if (error.message?.includes('401')) {
    return 'Your session has expired. Please login again.';
  }
  
  if (error.message?.includes('403')) {
    return 'You do not have permission to access this resource.';
  }
  
  if (error.message?.includes('404')) {
    return 'The requested resource was not found.';
  }
  
  if (error.message?.includes('500')) {
    return 'Server error. Please try again later.';
  }
  
  if (error.message?.includes('Network')) {
    return 'Network error. Please check your connection.';
  }
  
  // Default
  return error.message || 'Something went wrong. Please try again.';
}