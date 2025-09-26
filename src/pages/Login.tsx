import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, User, Lock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const Login: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login, isLoading, isAuthenticated } = useAuthStore();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!userId || !password) {
      setError('Please enter both User ID and password');
      return;
    }

    const result = await login(userId, password);
    if (!result.success) {
      setError(result.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
            <img 
              src="/hit.png" 
              alt="HIT Logo" 
              className="w-20 h-20 object-contain"
              onError={(e) => {
                // Fallback to shield icon if logo not found
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <Shield className="w-12 h-12 text-blue-900 hidden" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Heavy Industries Taxila
          </h1>
          <p className="text-blue-200 text-lg">
            Ticket Management System
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              System Access
            </h2>
            <p className="text-gray-600">
              Enter your organization credentials
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User ID Field */}
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
                User ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="userId"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value.toUpperCase())}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="HIT000001"
                  required
                  disabled={isLoading}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Use your organization-assigned User ID
              </p>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Demo Credentials:</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <div><strong>Admin:</strong> HIT000001 / admin123</div>
              <div><strong>Support:</strong> HIT000002 / support123</div>
              <div><strong>Employee:</strong> HIT000003 / employee123</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-blue-200 text-sm">
            Heavy Industries Taxila - Military Industrial Complex
          </p>
          <p className="text-blue-300 text-xs mt-1">
            Authorized Personnel Only
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;