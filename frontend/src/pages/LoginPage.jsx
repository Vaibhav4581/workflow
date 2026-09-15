import { ROLES, isRole } from '../utils/roles';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import './LoginPage.css';

function detectRole(email) {
  const studentRegex = /^sng\d{2}[a-zA-Z]{2,4}\d{3}/i;
  if (studentRegex.test(email.split('@')[0])) return 'student';
  return 'staff';
}

function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLoginSuccess = () => {
    const role = localStorage.getItem('userRole');
    if (isRole(role, ROLES.PRINCIPAL)) {
      navigate('/principal');
    } else if (isRole(role, ROLES.ADMIN)) {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.email || !formData.password) {
      setError('Please enter email and password');
      return;
    }

    try {
      const response = await axios.post('/login', {
        email: formData.email,
        password: formData.password
      });

      const data = response.data;
      localStorage.setItem('token', data.token);
      localStorage.setItem('userName', `${data.fName} ${data.lName}`);
      localStorage.setItem('userRole', data.role);
      localStorage.setItem('userEmail', data.email);
      // Mark that user went through the login form this session
      sessionStorage.setItem('sessionActive', 'true');
      window.dispatchEvent(new Event('authChanged'));
      
      // Go directly to dashboard
      handleLoginSuccess();
      
    } catch (err) {
      setError(err.response?.data || 'Login failed');
    }
  };

  return (
    <>

      <div className="login-page">
        <div className="login-container">
          <div className="login-header">
            <img src="/sngce.jpg" alt="SNGCE Logo" className="login-logo" />
            <h1>WORKFLOW</h1>
            <p>Sign in to continue to your dashboard</p>
          </div>
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button type="submit" className="login-btn">Login</button>
          </form>
        </div>
      </div>
    </>
  );
}

export default LoginPage;
