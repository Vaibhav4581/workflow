import { ROLES, isRole } from '../utils/roles';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import './Archive.css';

const statusColors = {
  accepted: '#22c55e',
  approved: '#22c55e',
  rejected: '#ef4444',
  edit: '#f59e0b'
};

export default function Archive() {
  const [archivedForms, setArchivedForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchArchivedForms = async () => {
      try {
        const token = jwtDecode(localStorage.getItem('token'));
        const { email, role } = token;
        setUserRole(role);

        const response = await axios.get(
          `/getArchivedForms?email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}`
        );
        setArchivedForms(response.data || []);
      } catch (error) {
        console.error('Error fetching archived forms:', error);
        setArchivedForms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArchivedForms();
  }, []);

  const isPending = (form) => {
    const s = (form.status || '').toLowerCase();
    return s !== 'accepted' && s !== 'declined';
  };

  const filteredForms = archivedForms.filter(form => {
    const s = (form.status || '').toLowerCase();
    const matchesStatus =
      categoryFilter === 'all' ||
      (categoryFilter === 'accepted' && s === 'accepted') ||
      (categoryFilter === 'declined' && s === 'declined') ||
      (categoryFilter === 'pending' && isPending(form));
    const matchesSearch = searchTerm === '' || 
      form.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.submittedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.formNo?.toString().includes(searchTerm);
    
    return matchesStatus && matchesSearch;
  });

  const handleViewForm = (form) => {
    navigate(form.type === 'faculty' ? `/received-forms/${form._id}` : `/submission/${form._id}`);
  };

  if (loading) {
    return <div className="archive-container"><div className="loading">Loading archived forms...</div></div>;
  }

  return (
    <div className="archive-container">
      <div className="archive-controls">
        <input
          type="text"
          placeholder="Search by subject, sender, department, or form number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />


        <div className="category-filter">
            <h4>Form Status:</h4>
            <div className="category-buttons">
              <button className={`category-btn ${categoryFilter === 'all' ? 'active' : ''}`} onClick={() => setCategoryFilter('all')}>
                All ({archivedForms.length})
              </button>
              <button className={`category-btn ${categoryFilter === 'accepted' ? 'active' : ''}`} onClick={() => setCategoryFilter('accepted')}>
                Accepted ({archivedForms.filter(f => (f.status || '').toLowerCase() === 'accepted').length})
              </button>
              <button className={`category-btn ${categoryFilter === 'declined' ? 'active' : ''}`} onClick={() => setCategoryFilter('declined')}>
                Declined ({archivedForms.filter(f => (f.status || '').toLowerCase() === 'declined').length})
              </button>
              <button className={`category-btn ${categoryFilter === 'pending' ? 'active' : ''}`} onClick={() => setCategoryFilter('pending')}>
                Pending ({archivedForms.filter(isPending).length})
              </button>
            </div>
          </div>
      </div>

      <div className="archive-content">
        {filteredForms.length === 0 ? (
          <div className="no-forms">
            <div className="no-forms-icon">📁</div>
            <h3>No completed forms found</h3>
            <p>
              {searchTerm || categoryFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Forms will appear here once they are processed'
              }
            </p>
          </div>
        ) : (
          <div className="forms-grid">
            {filteredForms.map((form) => (
              <div key={form._id} className="form-card" onClick={() => handleViewForm(form)}>
                <div className="form-header">
                  <div className="form-number">#{form.formNo}</div>
                  <div className="form-type-badge">{form.type === 'faculty' ? 'Faculty' : 'Student'}</div>
                </div>
                
                <div className="form-content">
                  <h3>{form.subject}</h3>
                  <p><strong>Department:</strong> {form.department || 'N/A'}</p>
                  <p><strong>Submitted by:</strong> {form.submittedBy}</p>
                  <p><strong>Date:</strong> {new Date(form.createdAt).toLocaleDateString()}</p>
                </div>

                <div className="form-footer">
                  <span className="status-badge" style={{ backgroundColor: statusColors[form.status] || '#888' }}>
                    {form.status}
                  </span>
                  <button className="view-details-btn">View Details</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
