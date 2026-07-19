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
  approved: '#22c55e',
  edit: '#f59e0b'
};

export default function Archive() {
  const [archivedForms, setArchivedForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
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

  const filteredForms = archivedForms.filter(form => {
    const matchesFilter = filter === 'all' || (filter === 'accepted' ? (form.status === 'accepted' || form.status === 'approved') : form.status === filter);
    const matchesCategory = categoryFilter === 'all' || form.category === categoryFilter;
    const matchesSearch = searchTerm === '' || 
      form.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.submittedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.formNo?.toString().includes(searchTerm);
    
    return matchesFilter && matchesCategory && matchesSearch;
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

        <div className="filter-buttons">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            All ({archivedForms.length})
          </button>
          <button className={`filter-btn ${filter === 'accepted' ? 'active' : ''}`} onClick={() => setFilter('accepted')}>
            Approved ({archivedForms.filter(f => f.status === 'accepted' || f.status === 'approved').length})
          </button>
          <button className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`} onClick={() => setFilter('rejected')}>
            Rejected ({archivedForms.filter(f => f.status === 'rejected').length})
          </button>
        </div>

        {(isRole(userRole, ROLES.HOD) || userRole === 'Principal' || userRole === 'Manager' || 
          isRole(userRole, ROLES.FACULTY_ADVISOR) || userRole === 'admin') && (
          <div className="category-filter">
            <h4>Form Category:</h4>
            <div className="category-buttons">
              <button className={`category-btn ${categoryFilter === 'all' ? 'active' : ''}`} onClick={() => setCategoryFilter('all')}>
                All ({archivedForms.length})
              </button>
              <button className={`category-btn ${categoryFilter === 'submitted' ? 'active' : ''}`} onClick={() => setCategoryFilter('submitted')}>
                Submitted ({archivedForms.filter(f => f.category === 'submitted').length})
              </button>
              <button className={`category-btn ${categoryFilter === 'received' ? 'active' : ''}`} onClick={() => setCategoryFilter('received')}>
                Received ({archivedForms.filter(f => f.category === 'received').length})
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="archive-content">
        {filteredForms.length === 0 ? (
          <div className="no-forms">
            <div className="no-forms-icon">📁</div>
            <h3>No completed forms found</h3>
            <p>
              {searchTerm || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Forms will appear here once they are accepted or rejected'
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
