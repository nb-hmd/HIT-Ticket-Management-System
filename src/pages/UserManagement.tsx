import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Settings, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Save, 
  X, 
  AlertTriangle,
  CheckCircle,
  Shield,
  Building,
  Mail,
  Phone,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../utils/api';
import Loading from '../components/Loading';

interface UserData {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'employee' | 'support_staff' | 'admin' | 'manager';
  department: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  factory?: {
    id: string;
    name: string;
  };
}

interface Factory {
  id: string;
  name: string;
  description: string;
}

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserData[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    user_id: '',
    full_name: '',
    email: '',
    password: '',
    role: 'employee' as UserData['role'],
    department: '',
    phone: '',
    factory_id: '',
    is_active: true
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sort_by: 'created_at',
        sort_order: 'DESC'
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('is_active', statusFilter === 'active' ? 'true' : 'false');
      
      const response = await api.get(`/users?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data.users || []);
        setTotalUsers(data.data.pagination?.total || 0);
        setTotalPages(data.data.pagination?.pages || 1);
      } else {
        setError(data.message || 'Failed to load users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchFactories = async () => {
    try {
      const response = await api.get('/users/factories/list');
      const data = await response.json();
      
      if (data.success) {
        setFactories(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching factories:', error);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchUsers();
      fetchFactories();
    }
  }, [currentUser, currentPage, roleFilter, statusFilter]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '') {
        setCurrentPage(1);
        fetchUsers();
      } else if (searchTerm === '') {
        fetchUsers();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError('');
      setSuccess('');
      
      const response = await api.post('/users', formData);
      const data = await response.json();
      
      if (data.success) {
        setSuccess('User created successfully!');
        setShowCreateModal(false);
        resetForm();
        fetchUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to create user');
      }
    } catch (error) {
      setError(error.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;
    
    try {
      setError('');
      setSuccess('');
      
      const updateData = { ...formData };
      if (!updateData.password) {
        delete updateData.password; // Don't update password if not provided
      }
      
      const response = await api.put(`/users/${selectedUser.id}`, updateData);
      const data = await response.json();
      
      if (data.success) {
        setSuccess('User updated successfully!');
        setShowEditModal(false);
        setSelectedUser(null);
        resetForm();
        fetchUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to update user');
      }
    } catch (error) {
      setError(error.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      setError('');
      setSuccess('');
      
      const response = await api.delete(`/users/${userToDelete.id}`);
      const data = await response.json();
      
      if (data.success) {
        setSuccess('User deleted successfully!');
        setShowDeleteConfirm(false);
        setUserToDelete(null);
        fetchUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to delete user');
      }
    } catch (error) {
      setError(error.message || 'Failed to delete user');
    }
  };

  const handleToggleUserStatus = async (user: UserData) => {
    try {
      setError('');
      setSuccess('');
      
      const response = await api.put(`/users/${user.id}`, {
        is_active: !user.is_active
      });
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`User ${!user.is_active ? 'activated' : 'deactivated'} successfully!`);
        fetchUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to update user status');
      }
    } catch (error) {
      setError(error.message || 'Failed to update user status');
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      full_name: '',
      email: '',
      password: '',
      role: 'employee',
      department: '',
      phone: '',
      factory_id: '',
      is_active: true
    });
  };

  const openEditModal = (user: UserData) => {
    setSelectedUser(user);
    setFormData({
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      password: '', // Don't pre-fill password
      role: user.role,
      department: user.department,
      phone: user.phone || '',
      factory_id: user.factory?.id || '',
      is_active: user.is_active
    });
    setShowEditModal(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-purple-100 text-purple-800';
      case 'support_staff': return 'bg-blue-100 text-blue-800';
      case 'employee': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Only allow admins to access this page
  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-700">Access denied. Admin privileges required.</span>
          </div>
        </div>
      </div>
    );
  }

  if (loading && users.length === 0) {
    return <Loading text="Loading users..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">
              Manage users, roles, and permissions.
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-700">{success}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          {/* Role Filter */}
          <div className="md:w-48">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="support_staff">Support Staff</option>
              <option value="employee">Employee</option>
            </select>
          </div>
          
          {/* Status Filter */}
          <div className="md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {users.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No users found
            </h3>
            <p className="text-gray-600">
              {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'No users have been created yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="col-span-2">User</div>
                <div className="col-span-2">Contact</div>
                <div className="col-span-1">Role</div>
                <div className="col-span-2">Department</div>
                <div className="col-span-2">Factory</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1">Created</div>
                <div className="col-span-1">Actions</div>
              </div>
            </div>
            
            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {users.map((user) => (
                <div key={user.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* User Info */}
                    <div className="col-span-2">
                      <div className="font-medium text-gray-900">
                        {user.full_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.user_id}
                      </div>
                    </div>
                    
                    {/* Contact */}
                    <div className="col-span-2">
                      <div className="flex items-center text-sm text-gray-900">
                        <Mail className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Phone className="w-4 h-4 text-gray-400 mr-1" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Role */}
                    <div className="col-span-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        <Shield className="w-3 h-3 mr-1" />
                        {user.role.replace('_', ' ')}
                      </span>
                    </div>
                    
                    {/* Department */}
                    <div className="col-span-2">
                      <div className="text-sm text-gray-900">
                        {user.department}
                      </div>
                    </div>
                    
                    {/* Factory */}
                    <div className="col-span-2">
                      <div className="flex items-center text-sm text-gray-900">
                        <Building className="w-4 h-4 text-gray-400 mr-1" />
                        <span>{user.factory?.name || 'N/A'}</span>
                      </div>
                    </div>
                    
                    {/* Status */}
                    <div className="col-span-1">
                      <button
                        onClick={() => handleToggleUserStatus(user)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {user.is_active ? (
                          <><Eye className="w-3 h-3 mr-1" />Active</>
                        ) : (
                          <><EyeOff className="w-3 h-3 mr-1" />Inactive</>
                        )}
                      </button>
                    </div>
                    
                    {/* Created Date */}
                    <div className="col-span-1">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>{formatDate(user.created_at)}</span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="col-span-1">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-600 hover:text-blue-700"
                          title="Edit user"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setUserToDelete(user);
                            setShowDeleteConfirm(true);
                          }}
                          className="text-red-600 hover:text-red-700"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers} users
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </button>
                    <span className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New User</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User ID *
                </label>
                <input
                  type="text"
                  value={formData.user_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, user_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserData['role'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="employee">Employee</option>
                  <option value="support_staff">Support Staff</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department *
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Factory
                </label>
                <select
                  value={formData.factory_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, factory_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Factory</option>
                  {factories.map((factory) => (
                    <option key={factory.id} value={factory.id}>
                      {factory.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Active User
                </label>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2 inline" />
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit User</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User ID *
                </label>
                <input
                  type="text"
                  value={formData.user_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, user_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new password or leave blank"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserData['role'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="employee">Employee</option>
                  <option value="support_staff">Support Staff</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department *
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Factory
                </label>
                <select
                  value={formData.factory_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, factory_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Factory</option>
                  {factories.map((factory) => (
                    <option key={factory.id} value={factory.id}>
                      {factory.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="edit_is_active" className="ml-2 block text-sm text-gray-900">
                  Active User
                </label>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2 inline" />
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Confirm Delete</h3>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setUserToDelete(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete the user <strong>{userToDelete.full_name}</strong>? 
                This action cannot be undone.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2 inline" />
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;