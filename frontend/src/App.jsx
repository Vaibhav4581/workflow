import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import DynamicDashboard from './components/DynamicDashboard';
import NewSubmission from './pages/NewSubmission';
import AdminPanel from './AdminPanel';
import ReceivedForms from './pages/ReceivedForms';
import ReceivedFormView from './pages/ReceivedFormView';
import SubmissionView from './pages/SubmissionView';
import PrincipalPage from './pages/PrincipalPage';
import ProfilePage from './pages/ProfilePage';
import MySubmission from './pages/MySubmission';
import WelcomeAnimation from './pages/WelcomeAnimation';
import SettingsPage from './pages/SettingsPage';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes cache to prevent redundant fetches
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
        <Toaster position="bottom-right" />
        <Navbar />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/welcome" element={<WelcomeAnimation />} />

          {/* Protected routes – require login */}
          <Route path="/dashboard" element={<PrivateRoute><DynamicDashboard><Dashboard /></DynamicDashboard></PrivateRoute>} />
          <Route path="/submission/new" element={<PrivateRoute><NewSubmission /></PrivateRoute>} />
          <Route path="/submission/:id" element={<PrivateRoute><SubmissionView /></PrivateRoute>} />
          <Route path="/received-forms" element={<PrivateRoute><ReceivedForms /></PrivateRoute>} />
          <Route path="/received-forms/:id" element={<PrivateRoute><ReceivedFormView /></PrivateRoute>} />
          <Route path="/principal" element={<PrivateRoute allowedRoles={['Principal', 'principal']}><PrincipalPage /></PrivateRoute>} />
          <Route path="/ProfilePage" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/my-submission" element={<PrivateRoute><MySubmission /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />

          {/* Admin-only route */}
          <Route path="/admin" element={<PrivateRoute allowedRoles={['Admin', 'admin']}><AdminPanel /></PrivateRoute>} />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
    </QueryClientProvider>
  );
}

export default App; 

