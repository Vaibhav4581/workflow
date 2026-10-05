import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import API_BASE_URL from './config';
import App from './App.jsx';
import './index.css';
import GlobalToast, { showToast } from './components/GlobalToast.jsx';

// Override native alert globally
window.alert = (message) => {
  if (typeof message !== 'string') message = String(message);
  const lowerMsg = message.toLowerCase();
  const isError = lowerMsg.includes('failed') || lowerMsg.includes('error') || lowerMsg.includes('invalid') || lowerMsg.includes('must be') || lowerMsg.includes('do not match');
  showToast(message, isError ? 'error' : 'success');
};

// Set global axios base URL
axios.defaults.baseURL = API_BASE_URL;

// Request Interceptor: Attach JWT Token & sanitize URL
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.url && config.url.startsWith('/') && API_BASE_URL.endsWith('/')) {
    config.url = config.url.substring(1);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response Interceptor: Handle Token Expiration or Authorization Failures
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      const currentToken = localStorage.getItem('token');
      // Only clear and redirect if user was logged in and not already on the login page
      if (currentToken && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        sessionStorage.removeItem('sessionActive');
        window.dispatchEvent(new Event('authChanged'));
        showToast('Your session has expired. Please log in again.', 'error');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GlobalToast />
    <App />
  </React.StrictMode>
); 
