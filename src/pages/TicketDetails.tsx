import React from 'react';
import { MessageSquare, Clock, User } from 'lucide-react';

const TicketDetails: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ticket Details</h1>
        <p className="text-gray-600 mt-1">
          View ticket information and communication thread.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Ticket Details Coming Soon
          </h3>
          <p className="text-gray-600">
            This page will show detailed ticket information, comments, and SLA tracking.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TicketDetails;