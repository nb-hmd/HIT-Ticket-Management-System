import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Factory,
  FileText,
  UserCheck,
  Settings,
  BarChart3
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface AdminStats {
  tickets: {
    byStatus: Array<{ status: string; count: number }>;
    pendingReview: number;
    overdue: number;
    recentWeek: number;
  };
  users: {
    byRole: Array<{ role: string; count: number }>;
  };
  factories: Array<{
    id: string;
    name: string;
    ticket_count: number;
  }>;
}

interface PendingTicket {
  id: string;
  ticket_number: string;
  title: string;
  priority: string;
  created_at: string;
  requester: {
    full_name: string;
    department: string;
  };
  factory: {
    name: string;
  };
}

const AdminDashboard: React.FC = () => {
  const { token } = useAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingTickets, setPendingTickets] = useState<PendingTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // Fetch admin dashboard stats
      const statsResponse = await fetch('http://localhost:3002/api/admin/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      // Fetch pending review tickets
      const pendingResponse = await fetch('http://localhost:3002/api/admin/tickets/pending-review?limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();
        setPendingTickets(pendingData.data.tickets);
      }

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'admin_review': return 'text-blue-600 bg-blue-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'in_progress': return 'text-indigo-600 bg-indigo-100';
      case 'completed': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">System overview and management tools</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.tickets.pendingReview || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overdue Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.tickets.overdue || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.tickets.recentWeek || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.users.byRole.reduce((sum, role) => sum + role.count, 0) || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Pending Approvals */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
            <Link 
              to="/admin/approvals" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {pendingTickets.length > 0 ? (
              pendingTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">#{ticket.ticket_number}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 truncate">{ticket.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {ticket.requester.full_name} • {ticket.factory.name}
                    </p>
                  </div>
                  <Link
                    to={`/admin/approve/${ticket.id}`}
                    className="ml-4 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full hover:bg-blue-200"
                  >
                    Review
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No pending approvals</p>
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
          <div className="space-y-4">
            {stats?.tickets.byStatus.map((statusItem) => (
              <div key={statusItem.status} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(statusItem.status)}`}>
                    {statusItem.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <span className="font-medium text-gray-900">{statusItem.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/admin/approvals"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <UserCheck className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Review Tickets</p>
              <p className="text-sm text-gray-600">Approve or reject requests</p>
            </div>
          </Link>

          <Link
            to="/admin/assignments"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <Users className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Manage Assignments</p>
              <p className="text-sm text-gray-600">Assign tickets to teams</p>
            </div>
          </Link>

          <Link
            to="/users"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <Settings className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">User Management</p>
              <p className="text-sm text-gray-600">Manage user accounts</p>
            </div>
          </Link>

          <Link
            to="/admin/analytics"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <BarChart3 className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">System Analytics</p>
              <p className="text-sm text-gray-600">View detailed reports</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Factory Overview */}
      {stats?.factories && stats.factories.length > 0 && (
        <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Factory Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.factories.map((factory) => (
              <div key={factory.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Factory className="w-5 h-5 text-gray-600" />
                  <h4 className="font-medium text-gray-900">{factory.name}</h4>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {factory.ticket_count} active tickets
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;