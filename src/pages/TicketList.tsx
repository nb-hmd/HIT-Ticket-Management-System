import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Ticket, 
  Search, 
  Filter, 
  Eye, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  User,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../utils/api';
import Loading from '../components/Loading';

interface TicketData {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  requester: {
    full_name: string;
    user_id: string;
  };
  assignedTo?: {
    full_name: string;
    user_id: string;
  };
  factory: {
    name: string;
  };
}

const TicketList: React.FC = () => {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  
  const itemsPerPage = 10;

  const fetchTickets = async () => {
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
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      
      const response = await api.get(`/tickets?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setTickets(data.data.tickets || []);
        setTotalTickets(data.data.pagination?.total || 0);
        setTotalPages(data.data.pagination?.pages || 1);
      } else {
        setError(data.message || 'Failed to load tickets');
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setError(error.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [currentPage, statusFilter, priorityFilter]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '') {
        setCurrentPage(1);
        fetchTickets();
      } else if (searchTerm === '') {
        fetchTickets();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'admin_review': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'admin_review': return <AlertTriangle className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'closed': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
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

  const getPageTitle = () => {
    switch (user?.role) {
      case 'admin': return 'All Tickets';
      case 'support_staff': return 'Assigned Tickets';
      case 'manager': return 'Department Tickets';
      default: return 'My Tickets';
    }
  };

  const getPageDescription = () => {
    switch (user?.role) {
      case 'admin': return 'View and manage all tickets in the system.';
      case 'support_staff': return 'View tickets assigned to you and available for assignment.';
      case 'manager': return 'View and manage tickets in your department.';
      default: return 'View and track your submitted tickets.';
    }
  };

  if (loading && tickets.length === 0) {
    return <Loading text="Loading tickets..." />;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
        <p className="text-gray-600 mt-1">{getPageDescription()}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          {/* Status Filter */}
          <div className="md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="admin_review">Admin Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          
          {/* Priority Filter */}
          <div className="md:w-48">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-700">{error}</span>
            <button
              onClick={fetchTickets}
              className="ml-auto text-red-600 hover:text-red-700 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Tickets List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {tickets.length === 0 ? (
          <div className="p-8 text-center">
            <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tickets found
            </h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'No tickets have been created yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="col-span-3">Ticket</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Priority</div>
                <div className="col-span-2">Requester</div>
                <div className="col-span-2">Factory</div>
                <div className="col-span-1">Created</div>
                <div className="col-span-1">Actions</div>
              </div>
            </div>
            
            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Ticket Info */}
                    <div className="col-span-3">
                      <div className="font-medium text-gray-900">
                        #{ticket.ticket_number}
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {ticket.title}
                      </div>
                    </div>
                    
                    {/* Status */}
                    <div className="col-span-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {getStatusIcon(ticket.status)}
                        <span className="ml-1 capitalize">{ticket.status.replace('_', ' ')}</span>
                      </span>
                    </div>
                    
                    {/* Priority */}
                    <div className="col-span-1">
                      <span className={`text-sm font-medium capitalize ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    
                    {/* Requester */}
                    <div className="col-span-2">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-1" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {ticket.requester.full_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {ticket.requester.user_id}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Factory */}
                    <div className="col-span-2">
                      <div className="text-sm text-gray-900">
                        {ticket.factory.name}
                      </div>
                    </div>
                    
                    {/* Created Date */}
                    <div className="col-span-1">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>{formatDate(ticket.created_at)}</span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="col-span-1">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Link>
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
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalTickets)} of {totalTickets} tickets
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
    </div>
  );
};

export default TicketList