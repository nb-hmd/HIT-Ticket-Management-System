import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Factory,
  Plus,
  ArrowRight,
  Calendar,
  Target
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface AssignedTicket {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  sla_deadline: string;
  requester: {
    full_name: string;
    department: string;
  };
  factory: {
    name: string;
  };
}

interface AvailableTicket {
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

interface WorkloadStats {
  active: number;
  high_priority: number;
  overdue: number;
}

interface AssignmentData {
  assignedTickets: AssignedTicket[];
  availableTickets: AvailableTicket[];
  workloadStats: WorkloadStats;
}

const SupportDashboard: React.FC = () => {
  const { token, user } = useAuthStore();
  const [assignmentData, setAssignmentData] = useState<AssignmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selfAssigning, setSelfAssigning] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignmentData();
  }, []);

  const fetchAssignmentData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('http://localhost:3002/api/assignments/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAssignmentData(data.data);
      }
    } catch (error) {
      console.error('Error fetching assignment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelfAssign = async (ticketId: string) => {
    try {
      setSelfAssigning(ticketId);
      
      const response = await fetch(`http://localhost:3002/api/assignments/self-assign/${ticketId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: 'Self-assigned from dashboard'
        })
      });

      if (response.ok) {
        // Refresh data after successful assignment
        await fetchAssignmentData();
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to assign ticket');
      }
    } catch (error) {
      console.error('Error self-assigning ticket:', error);
      alert('Failed to assign ticket');
    } finally {
      setSelfAssigning(null);
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
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const isOverdue = (slaDeadline: string) => {
    return new Date() > new Date(slaDeadline);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
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
        <h1 className="text-3xl font-bold text-gray-900">Support Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your assigned tickets and workload</p>
      </div>

      {/* Workload Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{assignmentData?.workloadStats.active || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">High Priority</p>
              <p className="text-2xl font-bold text-gray-900">{assignmentData?.workloadStats.high_priority || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Clock className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">{assignmentData?.workloadStats.overdue || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* My Assigned Tickets */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">My Assigned Tickets</h3>
            <Link 
              to="/tickets?assigned_to=me" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {assignmentData?.assignedTickets && assignmentData.assignedTickets.length > 0 ? (
              assignmentData.assignedTickets.map((ticket) => (
                <div key={ticket.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-gray-900">#{ticket.ticket_number}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                        {isOverdue(ticket.sla_deadline) && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full text-red-600 bg-red-100">
                            OVERDUE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 font-medium mb-1">{ticket.title}</p>
                      <div className="flex items-center text-xs text-gray-500 space-x-4">
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {ticket.requester.full_name}
                        </span>
                        <span className="flex items-center">
                          <Factory className="w-3 h-3 mr-1" />
                          {ticket.factory.name}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Due: {formatDate(ticket.sla_deadline)}
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="ml-4 p-2 text-gray-400 hover:text-gray-600"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-500">No assigned tickets</p>
                <p className="text-sm text-gray-400">Great job! You're all caught up.</p>
              </div>
            )}
          </div>
        </div>

        {/* Available Tickets */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Available Tickets</h3>
            <span className="text-sm text-gray-500">
              {assignmentData?.availableTickets.length || 0} available
            </span>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {assignmentData?.availableTickets && assignmentData.availableTickets.length > 0 ? (
              assignmentData.availableTickets.map((ticket) => (
                <div key={ticket.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-gray-900">#{ticket.ticket_number}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 font-medium mb-1">{ticket.title}</p>
                      <div className="flex items-center text-xs text-gray-500 space-x-4">
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {ticket.requester.full_name}
                        </span>
                        <span className="flex items-center">
                          <Factory className="w-3 h-3 mr-1" />
                          {ticket.factory.name}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(ticket.created_at)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelfAssign(ticket.id)}
                      disabled={selfAssigning === ticket.id}
                      className="ml-4 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {selfAssigning === ticket.id ? (
                        <>
                          <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                          Assigning...
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3 mr-1" />
                          Take
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-500">No available tickets</p>
                <p className="text-sm text-gray-400">All tickets are currently assigned.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/tickets?status=in_progress&assigned_to=me"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <Clock className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">In Progress</p>
              <p className="text-sm text-gray-600">View active tickets</p>
            </div>
          </Link>

          <Link
            to="/tickets?priority=high,critical&assigned_to=me"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <AlertTriangle className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">High Priority</p>
              <p className="text-sm text-gray-600">Urgent tickets</p>
            </div>
          </Link>

          <Link
            to="/reports"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">My Performance</p>
              <p className="text-sm text-gray-600">View statistics</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SupportDashboard;