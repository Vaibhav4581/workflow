import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import './ReceivedForms.css';

export default function ReceivedForms({ previewMode }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = jwtDecode(localStorage.getItem('token'));
    const email = token.email;
    const role = token.role;
    const params = new URLSearchParams();
    params.set('role', role);
    if (token.department) params.set('department', token.department);
    params.set('email', email);
    
    axios.get(`/getReceivedFormsForUser?${params.toString()}`)
      .then(res => setForms(res.data || []))
      .catch(() => setForms([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  const formsToShow = previewMode ? forms.slice(0, 5) : forms;

  const token = jwtDecode(localStorage.getItem('token'));
  const userRoleLower = token?.role ? token.role.toLowerCase() : '';
  const isFormForwardedByUser = (form) => {
    const userActions = form.history?.filter(h => h.by && h.by.toLowerCase() === userRoleLower) || [];
    return userActions.some(h => h.action.toLowerCase().includes('forwarded'));
  };

  const pendingReceivedForms = formsToShow.filter(s => 
    !['accepted', 'approved', 'rejected', 'not_approved', 'cancelled'].includes(s.status?.toLowerCase()) && 
    !isFormForwardedByUser(s)
  );

  const forwardedForms = formsToShow.filter(s => 
    !['accepted', 'approved', 'rejected', 'not_approved', 'cancelled'].includes(s.status?.toLowerCase()) && 
    isFormForwardedByUser(s)
  );

  return (
    <div className="received-forms-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Received Forms</h2>
        {previewMode && (
          <button
            className="view-all-btn"
            style={{ background: '#3182ce', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 500 }}
            onClick={() => navigate('received-forms')}
          >
            View All
          </button>
        )}
      </div>
      {pendingReceivedForms.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#718096' }}>No received forms</div>
      ) : (
      <table className="received-forms-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Sender</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {pendingReceivedForms.map(form => (
            <tr
              key={form._id || form.id}
              className="received-form-row"
              style={{ backgroundColor: '#fff', cursor: 'pointer', color: '#222' }}
              onClick={() => navigate(`/received-forms/${form._id || form.id}`)}
            >
              <td>{form.subject || form.title}</td>
              <td>{form.submittedBy || form.sender}</td>
              <td>{form.createdAt ? new Date(form.createdAt).toLocaleString() : (form.date || '')}</td>
              <td>
                <span className={`status-tag status-tag-${form.status}`}>{form.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', marginTop: '2rem' }}>
        <h2 style={{ margin: 0 }}>Forwarded Forms</h2>
      </div>
      {forwardedForms.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#718096' }}>No forwarded forms</div>
      ) : (
      <table className="received-forms-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Sender</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {forwardedForms.map(form => (
            <tr
              key={form._id || form.id}
              className="received-form-row"
              style={{ backgroundColor: '#fff', cursor: 'pointer', color: '#222' }}
              onClick={() => navigate(`/received-forms/${form._id || form.id}`)}
            >
              <td>{form.subject || form.title}</td>
              <td>{form.submittedBy || form.sender}</td>
              <td>{form.createdAt ? new Date(form.createdAt).toLocaleString() : (form.date || '')}</td>
              <td>
                <span className={`status-tag status-tag-${form.status}`}>{form.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </div>
  );
} 
