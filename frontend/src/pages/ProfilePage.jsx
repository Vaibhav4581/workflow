import { jwtDecode } from 'jwt-decode';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { isNoDeptRole } from '../utils/roles';
import './ProfilePage.css';

const ProfilePage = () => {
    const [role, setRole] = useState();
    const [email, setEmail] = useState();
    const [department, setDepartment] = useState()
    const navigate = useNavigate();
    useEffect(() => {
        const tokenStr = localStorage.getItem('token');
        if (!tokenStr) return;
        
        const decoded = jwtDecode(tokenStr);
        const userEmail = decoded.email;
        
        const fetchProfile = async () => {
            try {
                const res = await axios.get(`/api/user/profile/${userEmail}`);
                setRole(res.data.role);
                setEmail(res.data.email);
                setDepartment(res.data.department);
            } catch (err) {
                console.error("Failed to fetch profile", err);
                // Fallback to token if backend fails
                setRole(decoded.role);
                setEmail(decoded.email);
                setDepartment(decoded.department);
            }
        };

        fetchProfile();
    }, []);

    const handleLogout = () => {
        // Clear all auth/user info from localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        sessionStorage.removeItem('sessionActive');
        
        // Dispatch custom event to notify other components (like App.jsx) that auth state changed
        window.dispatchEvent(new Event('authChanged'));
        
        navigate('/login');
    };

 
  return (
    <div className="profile-container">
      <h2>Profile</h2>
      <div className="profile-card">
        <div className="profile-avatar">
          {email ? email.charAt(0).toUpperCase() : <span>👤</span>}
        </div>
        <div className="profile-details">
          <div className="profile-label">Email:</div>
          <div className="profile-value">{email}</div>
          <div className="profile-label">Role:</div>
          <div className="profile-value">{role}</div>

          {/* ✅ Conditionally render Department */}
          {!isNoDeptRole(role) && (
            <>
              <div className="profile-label">Department:</div>
              <div className="profile-value">{department}</div>
            </>
          )}
        </div>
        
        <div className="profile-actions" style={{ marginTop: '24px', borderTop: '1px solid var(--border-color, #e5e7eb)', paddingTop: '24px', textAlign: 'center' }}>
            <button 
                onClick={handleLogout} 
                style={{
                    background: 'var(--status-error, #ef4444)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '15px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
                Logout
            </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
