import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './RegisterPage.css';

function RegisterPage() {
  const [formData, setFormData] = useState({
    fName: '',
    lName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Student'
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    
    try {
      await axios.post('/createAccount', {
        fName: formData.fName,
        lName: formData.lName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        department: '' // default to empty, user will set on first login
      });
      alert('Registration successful! Please login.');
      navigate('/login');
    } catch (err) {
      console.error(err);
      alert(err.response?.data || 'Registration failed');
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <h2>Register</h2>
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              name="fName"
              placeholder="First Name"
              value={formData.fName}
              onChange={handleChange}
              required
              style={{ flex: 1 }}
            />
            <input
              type="text"
              name="lName"
              placeholder="Last Name"
              value={formData.lName}
              onChange={handleChange}
              required
              style={{ flex: 1 }}
            />
          </div>
          <div className="form-group">
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="Student">Student</option>
              <option value="Faculty">Faculty</option>
              <option value="HOD">Head of Department</option>
              <option value="Principal">Principal</option>
              <option value="Manager">Manager</option>
            </select>
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
          <div className="form-group">
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="register-btn">Register</button>
        </form>
        <p className="login-link">
          Already have an account? <span onClick={() => navigate('/login')}>Login here</span>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage; 
