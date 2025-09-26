import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  user_id: string;
  full_name: string;
  role: 'employee' | 'support_staff' | 'admin' | 'manager';
  factory?: {
    id: string;
    name: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userId: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => Promise<boolean>;
}

const API_BASE_URL = 'http://localhost:3002/api';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (userId: string, password: string) => {
        set({ isLoading: true });
        
        try {
          console.log('Attempting login for user:', userId);
          
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, password }),
            signal: AbortSignal.timeout(30000), // 30 second timeout
          });

          console.log('Login response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error('Login failed with status:', response.status, errorText);
            set({ isLoading: false });
            return { success: false, message: `Login failed: ${response.status} ${response.statusText}` };
          }

          const data = await response.json();
          console.log('Login response data:', { success: data.success, hasToken: !!data.token, hasUser: !!data.user });

          if (data.success && data.token && data.user) {
            console.log('Login successful, setting auth state');
            set({
              user: data.user,
              token: data.token,
              isAuthenticated: true,
              isLoading: false,
            });
            return { success: true };
          } else {
            console.warn('Login response missing required data:', data);
            set({ isLoading: false });
            return { success: false, message: data.message || 'Invalid login response' };
          }
        } catch (error) {
          console.error('Login error:', error);
          set({ isLoading: false });
          
          if (error.name === 'AbortError') {
            return { success: false, message: 'Login timeout. Please try again.' };
          }
          
          if (error instanceof TypeError && error.message.includes('fetch')) {
            return { success: false, message: 'Network error. Please check your connection and try again.' };
          }
          
          return { success: false, message: error.message || 'Login failed. Please try again.' };
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      checkAuth: async () => {
        const { token } = get();
        
        if (!token) {
          console.log('No token available for auth check');
          return false;
        }

        try {
          console.log('Checking authentication with token');
          
          const response = await fetch(`${API_BASE_URL}/auth/verify`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            signal: AbortSignal.timeout(10000), // 10 second timeout
          });

          console.log('Auth check response status:', response.status);

          if (!response.ok) {
            console.warn('Auth check failed with status:', response.status);
            set({
              user: null,
              token: null,
              isAuthenticated: false,
            });
            return false;
          }

          const data = await response.json();
          console.log('Auth check response:', { success: data.success });

          if (data.success) {
            console.log('Authentication verified successfully');
            set({ isAuthenticated: true });
            return true;
          } else {
            console.warn('Authentication verification failed');
            set({
              user: null,
              token: null,
              isAuthenticated: false,
            });
            return false;
          }
        } catch (error) {
          console.error('Auth check error:', error);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
          return false;
        }
      },
    }),
    {
      name: 'hit-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);