import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * PrivateRoute – redirects to /login if no token is found in localStorage.
 * Optionally accepts an `allowedRoles` array to restrict by role.
 *
 * Usage:
 *   <PrivateRoute>              — any logged-in user
 *   <PrivateRoute allowedRoles={['Admin']}>  — Admin only
 */
function PrivateRoute({ children, allowedRoles }) {
  const token         = localStorage.getItem('token');
  const role          = localStorage.getItem('userRole');
  const sessionActive = sessionStorage.getItem('sessionActive');

  // Must have gone through the login form this browser session
  if (!token || !sessionActive) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but wrong role → back to login
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default PrivateRoute;
