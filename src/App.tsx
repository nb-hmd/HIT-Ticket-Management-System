import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TicketCreate from './pages/TicketCreate';
import TicketList from './pages/TicketList';
import TicketDetails from './pages/TicketDetails';
import UserManagement from './pages/UserManagement';


import AdminApprovals from './pages/AdminApprovals';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={
              <ErrorBoundary>
                <Dashboard />
              </ErrorBoundary>
            } />
            <Route path="tickets/create" element={
              <ErrorBoundary>
                <TicketCreate />
              </ErrorBoundary>
            } />
            <Route path="tickets" element={
              <ErrorBoundary>
                <TicketList />
              </ErrorBoundary>
            } />
            <Route path="tickets/:id" element={
              <ErrorBoundary>
                <TicketDetails />
              </ErrorBoundary>
            } />


            <Route path="users" element={
              <ProtectedRoute requiredRoles={['admin']}>
                <ErrorBoundary>
                  <UserManagement />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/admin/approvals" element={
               <ProtectedRoute requiredRoles={['admin']}>
                 <AdminApprovals />
               </ProtectedRoute>
             } />
          </Route>
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
