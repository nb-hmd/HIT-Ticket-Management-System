import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = 'http://localhost:3002/api';

// Bulletproof authenticated request function
export const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}): Promise<Response> => {
  try {
    const { token, logout } = useAuthStore.getState();
    
    if (!token) {
      console.warn('No authentication token available');
      logout();
      throw new Error('No authentication token');
    }

    // Ensure URL starts with /
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    const fullUrl = `${API_BASE_URL}${cleanUrl}`;
    
    console.log(`Making API request to: ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      // Add timeout and other fetch options for reliability
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });
    
    console.log(`API response status: ${response.status} for ${fullUrl}`);
    
    if (response.status === 401) {
      console.warn('Authentication failed, logging out');
      logout();
      throw new Error('Authentication failed');
    }
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`API error ${response.status}: ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. Please try again.');
    }
    
    throw error;
  }
};

// Simple API functions
export const get = async (url: string, options: RequestInit = {}): Promise<Response> => {
  return makeAuthenticatedRequest(url, { ...options, method: 'GET' });
};

export const post = async (url: string, data?: any, options: RequestInit = {}): Promise<Response> => {
  const body = data ? JSON.stringify(data) : undefined;
  return makeAuthenticatedRequest(url, { ...options, method: 'POST', body });
};

export const put = async (url: string, data?: any, options: RequestInit = {}): Promise<Response> => {
  const body = data ? JSON.stringify(data) : undefined;
  return makeAuthenticatedRequest(url, { ...options, method: 'PUT', body });
};

export const del = async (url: string, options: RequestInit = {}): Promise<Response> => {
  return makeAuthenticatedRequest(url, { ...options, method: 'DELETE' });
};

// Upload files with authentication
export const upload = async (url: string, formData: FormData, options: RequestInit = {}): Promise<Response> => {
  try {
    const { token, logout } = useAuthStore.getState();
    
    if (!token) {
      console.warn('No authentication token available for upload');
      logout();
      throw new Error('No authentication token');
    }

    // Ensure URL starts with /
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    const fullUrl = `${API_BASE_URL}${cleanUrl}`;
    
    console.log(`Making upload request to: ${fullUrl}`);

    const response = await fetch(fullUrl, {
      ...options,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      body: formData,
      signal: AbortSignal.timeout(60000), // 60 second timeout for uploads
    });
    
    console.log(`Upload response status: ${response.status} for ${fullUrl}`);
    
    if (response.status === 401) {
      console.warn('Authentication failed during upload');
      logout();
      throw new Error('Authentication failed');
    }
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`Upload error ${response.status}: ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error('Upload request failed:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    
    if (error.name === 'AbortError') {
      throw new Error('Upload timeout. Please try again.');
    }
    
    throw error;
  }
};

// Convenience API object
export const api = {
  get,
  post,
  put,
  delete: del,
  upload,
};

export default api;