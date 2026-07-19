import { ROLES, isRole } from '../utils/roles';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import NotificationBell from './NotificationBell';
import './Navbar.css';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole'));
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail'));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);



  useEffect(() => {
    // Listen for changes to localStorage (e.g., login/logout in other tabs) and custom authChanged event
    const handleStorage = () => {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);

      // Get role from localStorage first, then fallback to JWT token
      let role = localStorage.getItem('userRole');
      if (!role && token) {
        try {
          const decoded = jwtDecode(token);
          role = decoded.role;
          // Store it in localStorage for future use
          localStorage.setItem('userRole', role);
          if (decoded.email) {
            localStorage.setItem('userEmail', decoded.email);
          }
        } catch (error) {
          console.error('Error decoding token:', error);
        }
      }

      console.log('Navbar: Current user role:', role); // Debug log
      setUserRole(role);
      setUserEmail(localStorage.getItem('userEmail'));
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('authChanged', handleStorage);
    // Also check on mount
    handleStorage();
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('authChanged', handleStorage);
    };
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };



  // Hide Navbar on these routes (Must be below all hooks!)
  if (['/login', '/register', '/welcome', '/'].includes(location.pathname)) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/dashboard" className="brand-link">
          <img
            src="/sngce.jpg"
            alt="Workflow Logo"
            className="nav-logo"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <span className="brand-text">Workflow</span>
        </Link>
      </div>

      <button
        className={`mobile-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={toggleMobileMenu}
        aria-label="Toggle mobile menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>


      <div className={`nav-links ${isMobileMenuOpen ? 'active' : ''}`}>
        {isLoggedIn ? (
          <>
            {/* Show respective Dashboard based on role */}
            {isRole(userRole, ROLES.PRINCIPAL) ? (
              <Link to="/principal" onClick={closeMobileMenu}>Dashboard</Link>
            ) : (
              <Link to="/dashboard" onClick={closeMobileMenu}>Dashboard</Link>
            )}
            <Link to="/settings" onClick={closeMobileMenu}>Settings</Link>
            {/* Hide New Submission for Principal users since they only review forms */}
            {!(isRole(userRole, ROLES.PRINCIPAL)) && (
              <Link to="/submission/new" onClick={closeMobileMenu}>New Submission</Link>
            )}
            <NotificationBell />
            <Link to="/ProfilePage" onClick={closeMobileMenu}>Profile</Link>
          </>
        ) : null}
      </div>
    </nav>
  );
}

export default Navbar; 
