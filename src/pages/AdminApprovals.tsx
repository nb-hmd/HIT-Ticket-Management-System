import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Factory,
  Calendar,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  UserPlus,
  X
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface PendingTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  priority: string;
  created_at: string;
  category?: string;
  business_impact?: string;
  status: string;
  factory_id: string;
  requester: {
    full_name: string;
    email: string;
    department: string;
  };
  factory: {
    name: string;
    description: string;
  };
  history: Array<{
    action: string;
    created_at: string;
    historyUser: {
      full_name: string;
    };
  }>;
}

interface SupportStaff {
  id: string;
  user_id: string;
  full_name: string;
  department: string;
  factory_id: string;
  factory: {
    id: string;
    name: string;
  };
}

const AdminApprovals: React.FC = () => {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<PendingTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [factoryFilter, setFactoryFilter] = useState('');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [supportStaff, setSupportStaff] = useState<SupportStaff[]>([]);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingTicketId, setForwardingTicketId] = useState<string | null>(null);
  const [selectedSupportStaff, setSelectedSupportStaff] = useState('');
  const [forwardNotes, setForwardNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchPendingTickets();
    fetchSupportStaff();
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  const fetchPendingTickets = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3002/api/admin/tickets/pending-review?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.data.tickets);
      }
    } catch (error) {
      console.error('Error fetching pending tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportStaff = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/users/support-staff', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSupportStaff(data.data);
      }
    } catch (error) {
      console.error('Error fetching support staff:', error);
    }
  };

  const handleApproval = async (ticketId: string, decision: 'approved' | 'rejected', reason?: string) => {
    try {
      setProcessing(ticketId);
      
      const response = await fetch(`http://localhost:3002/api/tickets/${ticketId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ decision, reason })
      });

      if (response.ok) {
        // Remove the ticket from the list if rejected, or show success message if approved
        if (decision === 'rejected') {
          setTickets(prev => prev.filter(t => t.id !== ticketId));
          setSelectedTickets(prev => prev.filter(id => id !== ticketId));
          setSuccessMessage('Ticket rejected successfully');
        } else {
          setSuccessMessage('Ticket approved successfully. You can now forward it to support staff.');
        }
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.message || `Failed to ${decision} ticket`);
      }
    } catch (error) {
      console.error(`Error ${decision} ticket:`, error);
      setErrorMessage(`Failed to ${decision} ticket`);
    } finally {
      setProcessing(null);
    }
  };

  const handleForwardToSupport = async () => {
    if (!forwardingTicketId || !selectedSupportStaff) {
      setErrorMessage('Please select a support staff member');
      return;
    }

    try {
      setProcessing(forwardingTicketId);
      
      const response = await fetch(`http://localhost:3002/api/tickets/${forwardingTicketId}/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          assigned_to: selectedSupportStaff,
          notes: forwardNotes 
        })
      });

      if (response.ok) {
        // Remove the ticket from the list as it's now assigned
        setTickets(prev => prev.filter(t => t.id !== forwardingTicketId));
        setSelectedTickets(prev => prev.filter(id => id !== forwardingTicketId));
        setSuccessMessage('Ticket forwarded to support staff successfully');
        
        // Close modal and reset state
        setShowForwardModal(false);
        setForwardingTicketId(null);
        setSelectedSupportStaff('');
        setForwardNotes('');
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.message || 'Failed to forward ticket');
      }
    } catch (error) {
      console.error('Error forwarding ticket:', error);
      setErrorMessage('Failed to forward ticket');
    } finally {
      setProcessing(null);
    }
  };

  const openForwardModal = (ticketId: string) => {
    setForwardingTicketId(ticketId);
    setShowForwardModal(true);
    setSelectedSupportStaff('');
    setForwardNotes('');
  };

  const handleBulkApproval = async (decision: 'approved' | 'rejected') => {
    if (selectedTickets.length === 0) return;

    const reason = prompt(`Enter reason for bulk ${decision}:`);
    if (reason === null) return; // User cancelled

    try {
      setProcessing('bulk');
      
      const response = await fetch('http://localhost:3002/api/admin/tickets/bulk-approve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticket_ids: selectedTickets,
          decision,
          reason
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Remove processed tickets from the list
        setTickets(prev => prev.filter(t => !selectedTickets.includes(t.id)));
        setSelectedTickets([]);
        setShowBulkActions(false);
        setSuccessMessage(`Successfully ${decision} ${data.data.processed.length} tickets`);
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.message || `Failed to bulk ${decision} tickets`);
      }
    } catch (error) {
      console.error(`Error bulk ${decision}:`, error);
      setErrorMessage(`Failed to bulk ${decision} tickets`);
    } finally {
      setProcessing(null);
    }
  };

  const toggleTicketSelection = (ticketId: string) => {
    setSelectedTickets(prev => {
      const newSelection = prev.includes(ticketId)
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId];
      
      setShowBulkActions(newSelection.length > 0);
      return newSelection;
    });
  };

  const selectAllTickets = () => {
    const allIds = filteredTickets.map(t => t.id);
    setSelectedTickets(allIds);
    setShowBulkActions(allIds.length > 0);
  };

  const clearSelection = () => {
    setSelectedTickets([]);
    setShowBulkActions(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter tickets based on search and filters
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = !searchTerm || 
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.requester.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = !priorityFilter || ticket.priority === priorityFilter;
    const matchesFactory = !factoryFilter || ticket.factory.name === factoryFilter;
    
    return matchesSearch && matchesPriority && matchesFactory;
  });

  // Get unique factories for filter
  const factories = Array.from(new Set(tickets.map(t => t.factory.name)));

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
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
        <h1 className="text-3xl font-bold text-gray-900">Ticket Approvals</h1>
        <p className="text-gray-600 mt-2">Review and approve pending ticket requests</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <select
              value={factoryFilter}
              onChange={(e) => setFactoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Factories</option>
              {factories.map(factory => (
                <option key={factory} value={factory}>{factory}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {filteredTickets.length} tickets pending review
            </span>
            {filteredTickets.length > 0 && (
              <button
                onClick={selectAllTickets}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Select All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-800">{successMessage}</span>
          </div>
        </div>
      )}
      
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {showBulkActions && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedTickets.length} tickets selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkApproval('approved')}
                disabled={processing === 'bulk'}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Bulk Approve
              </button>
              <button
                onClick={() => handleBulkApproval('rejected')}
                disabled={processing === 'bulk'}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Bulk Reject
              </button>
              <button
                onClick={clearSelection}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.length > 0 ? (
          filteredTickets.map((ticket) => (
            <div key={ticket.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-start space-x-4">
                <input
                  type="checkbox"
                  checked={selectedTickets.includes(ticket.id)}
                  onChange={() => toggleTicketSelection(ticket.id)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">#{ticket.ticket_number}</h3>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="text-xl font-medium text-gray-900 mb-2">{ticket.title}</h4>
                      <p className="text-gray-600 mb-4">{ticket.description}</p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {ticket.status === 'approved' ? (
                        <button
                          onClick={() => openForwardModal(ticket.id)}
                          disabled={processing === ticket.id}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Forward to Support
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              const reason = prompt('Enter approval reason (optional):');
                              if (reason !== null) {
                                handleApproval(ticket.id, 'approved', reason);
                              }
                            }}
                            disabled={processing === ticket.id}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                          >
                            {processing === ticket.id ? (
                              <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            ) : (
                              <CheckCircle className="w-4 h-4 mr-2" />
                            )}
                            Approve
                          </button>
                          
                          <button
                            onClick={() => {
                              const reason = prompt('Enter rejection reason:');
                              if (reason) {
                                handleApproval(ticket.id, 'rejected', reason);
                              }
                            }}
                            disabled={processing === ticket.id}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      <div>
                        <p className="font-medium">{ticket.requester.full_name}</p>
                        <p className="text-xs">{ticket.requester.department}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Factory className="w-4 h-4 mr-2" />
                      <div>
                        <p className="font-medium">{ticket.factory.name}</p>
                        <p className="text-xs">{ticket.factory.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      <div>
                        <p className="font-medium">Created</p>
                        <p className="text-xs">{formatDate(ticket.created_at)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {ticket.category && (
                    <div className="mt-3">
                      <span className="text-sm text-gray-600">Category: </span>
                      <span className="text-sm font-medium text-gray-900">{ticket.category}</span>
                    </div>
                  )}
                  
                  {ticket.business_impact && (
                    <div className="mt-2">
                      <span className="text-sm text-gray-600">Business Impact: </span>
                      <span className="text-sm font-medium text-gray-900">{ticket.business_impact}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-600">No tickets pending approval at the moment.</p>
          </div>
        )}
      </div>

      {/* Forward to Support Modal */}
      {showForwardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Forward to Support Staff</h3>
              <button
                onClick={() => {
                  setShowForwardModal(false);
                  setForwardingTicketId(null);
                  setSelectedSupportStaff('');
                  setForwardNotes('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Support Staff
                </label>
                <select
                  value={selectedSupportStaff}
                  onChange={(e) => setSelectedSupportStaff(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Choose support staff...</option>
                  {supportStaff.map(staff => (
                    <option key={staff.user_id} value={staff.user_id}>
                      {staff.full_name} - {staff.department}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={forwardNotes}
                  onChange={(e) => setForwardNotes(e.target.value)}
                  placeholder="Add any notes for the support staff..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowForwardModal(false);
                  setForwardingTicketId(null);
                  setSelectedSupportStaff('');
                  setForwardNotes('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleForwardToSupport}
                disabled={!selectedSupportStaff || processing === 'forward'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {processing === 'forward' ? (
                  <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                Forward Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApprovals;