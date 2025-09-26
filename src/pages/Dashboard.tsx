import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Ticket, 
  Plus, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  TrendingUp,
  Factory
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import AdminDashboard from '../components/AdminDashboard';
import SupportDashboard from '../components/SupportDashboard';

interface DashboardStats {
  totalTickets: number;
  slaCompliance: number;
  avgResolutionHours: number;
  slaBreached: number;
}

interface TicketsByStatus {
  status: string;
  count: number;
}

interface RecentTicket {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  requester: {
    full_name: string;
  };
  factory: {
    name: string;
  };
}

const Dashboard: React.FC = () => {
  const { user, token } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ticketsByStatus, setTicketsByStatus] = useState<TicketsByStatus[]>([]);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [loading, setLoading] = useState(true);

  // Show role-specific dashboards
  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }
  
  if (user?.role === 'support_staff') {
    return <SupportDashboard />;
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/reports/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data.summary);
        setTicketsByStatus(data.data.charts.ticketsByStatus);
        setRecentTickets(data.data.recentTickets);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'open': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'on_hold': return 'bg-gray-100 text-gray-800';
      case 'escalated': return 'bg-red-100 text-red-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.full_name}
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your tickets today.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/tickets/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Ticket
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Ticket className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalTickets || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">SLA Compliance</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.slaCompliance || 0}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.avgResolutionHours || 0}h</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">SLA Breached</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.slaBreached || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets by Status */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tickets by Status</h3>
          <div className="space-y-3">
            {ticketsByStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Tickets</h3>
            <Link 
              to="/tickets" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentTickets.slice(0, 5).map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className="block p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-blue-600">
                        {ticket.ticket_number}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 truncate mt-1">
                      {ticket.title}
                    </p>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                      <span>{ticket.requester.full_name}</span>
                      <span>•</span>
                      <span>{ticket.factory.name}</span>
                      <span>•</span>
                      <span className={getPriorityColor(ticket.priority)}>
                        {ticket.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {recentTickets.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Ticket className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No tickets found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/tickets/create"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <Plus className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Create Ticket</p>
              <p className="text-sm text-gray-600">Report a new issue</p>
            </div>
          </Link>

          <Link
            to="/tickets"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <Ticket className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">View Tickets</p>
              <p className="text-sm text-gray-600">Manage your tickets</p>
            </div>
          </Link>

          {(['support_staff', 'admin', 'manager'] as const).includes(user?.role as any) && (
            <Link
              to="/reports"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <TrendingUp className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Reports</p>
                <p className="text-sm text-gray-600">View analytics</p>
              </div>
            </Link>
          )}

          {(user?.role as any) === 'admin' && (
            <Link
              to="/users"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">User Management</p>
                <p className="text-sm text-gray-600">Manage users</p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;