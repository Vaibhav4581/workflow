// frontend/src/pages/PrincipalPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customConfirm } from '../utils/customConfirm';
import { jwtDecode } from "jwt-decode";
import axios from 'axios';
import Archive from './Archive';
import { getNextReceiver } from '../utils/hierarchy';
import './PrincipalPage.css';

const statusColors = {
  awaiting: '#fbbf24', // yellow
  forwarded: '#3b82f6', // blue
  accepted: '#22c55e', // green
  rejected: '#ef4444', // red
  approved: '#22c55e', // green
  edit: '#f59e0b', // orange - needs editing/revision
};

const defaultPermissions = { accept: true, reject: true, requestEdit: true };
const restrictedRoles = ['faculty', 'facultyadvisor'];

const rolePermissions = new Proxy({}, {
  get: function(target, prop) {
    if (typeof prop === 'string' && restrictedRoles.includes(prop.toLowerCase())) {
      return { accept: false, reject: false, requestEdit: false };
    }
    return defaultPermissions;
  }
});

function PrincipalPage() {
  const navigate = useNavigate();
  const [receivedSubmissions, setReceivedSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editRows, setEditRows] = useState({}); // { [formId]: { remarks, status, saving } }
  const [viewMode, setViewMode] = useState('current'); // 'current' or 'archived'
  
  // Enhanced form action states
  const [selectedForm, setSelectedForm] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [forwardTo, setForwardTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState('');

  // Handler for input changes
  const handleEditChange = (formId, field, value) => {
    setEditRows(prev => ({
      ...prev,
      [formId]: {
        ...prev[formId],
        [field]: value,
      },
    }));
  };

  // Handler for save (existing modal-based save)
  const handleSave = async (form) => {
    const formId = form._id || form.id;
    const formType = form.owner === 'student' ? 'student' : 'faculty';
    const { remarks, status } = editRows[formId] || {};
    setEditRows(prev => ({ ...prev, [formId]: { ...prev[formId], saving: true } }));
    try {
      const token = jwtDecode(localStorage.getItem('token'));
      const res = await axios.put('/updateFormRemarksStatus', {
        formId,
        formType,
        remarks,
        by: token.role,
        status,
      });
      // Optimistically update the receivedSubmissions state
      setReceivedSubmissions(prev => prev.map(f => (f._id === formId ? { ...f, remarks, status } : f)));
    } catch (err) {
      alert('Failed to update.');
    } finally {
      setEditRows(prev => ({ ...prev, [formId]: { ...prev[formId], saving: false } }));
    }
  };

  // Enhanced form action handler
  const handleFormAction = async (action, actionRemarks = '') => {
    if (!selectedForm) {
      alert('No form selected.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = jwtDecode(localStorage.getItem('token'));
      const formId = selectedForm._id || selectedForm.id;
      const formType = selectedForm.owner === 'student' ? 'student' : 'faculty';
      
      await axios.put('/updateFormRemarksStatus', {
        formId,
        formType,
        status: action,
        remarks: actionRemarks || remarks,
        forwardTo: forwardTo || undefined,
        by: token.role,
      });
      
      // Update local state
      setReceivedSubmissions(prev => prev.map(f => 
        f._id === formId ? { ...f, status: action, remarks: actionRemarks || remarks } : f
      ));
      
      // Reset form
      setRemarks('');
      setForwardTo('');
      setSelectedForm(null);
      alert(`Form ${action} successfully!`);
      
    } catch (error) {
      console.error('Error performing action:', error);
      alert('Failed to perform action. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle accept action
  const handleAccept = async () => {
    if (await customConfirm('Are you sure you want to accept this form?')) {
      handleFormAction('accepted', remarks);
    }
  };

  // Handle reject action
  const handleReject = async () => {
    if (!remarks.trim()) {
      alert('Please provide remarks when rejecting a form.');
      return;
    }
    if (await customConfirm('Are you sure you want to reject this form?')) {
      handleFormAction('rejected', remarks);
    }
  };

  // Handle request edit action
  const handleRequestEdit = async () => {
    if (!remarks.trim()) {
      alert('Please provide remarks when requesting edits.');
      return;
    }
    if (await customConfirm('Are you sure you want to request edits for this form?')) {
      handleFormAction('edit', remarks);
    }
  };

  // Handle forward action
  const handleForward = async () => {
    if (!forwardTo) {
      alert('Please select someone to forward to.');
      return;
    }
    if (await customConfirm(`Are you sure you want to forward this form to ${forwardTo}?`)) {
      handleFormAction('forwarded', remarks);
    }
  };

  // Handler for quick status changes (legacy)
  const handleQuickStatusChange = async (form, newStatus, defaultRemarks) => {
    if (!(await customConfirm(`Are you sure you want to ${newStatus} this form?`))) {
      return;
    }

    const formId = form._id || form.id;
    const formType = form.owner === 'student' ? 'student' : 'faculty';
    
    try {
      const token = jwtDecode(localStorage.getItem('token'));
      await axios.put('/updateFormRemarksStatus', {
        formId,
        formType,
        remarks: defaultRemarks,
        status: newStatus,
        by: token.role,
      });
      
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    window.location.reload();
  };

  useEffect(() => {
    const token = jwtDecode(localStorage.getItem('token'));
    if (!token) {
      navigate('/login');
      return;
    }
    setUserRole(token.role);
    // Check if user is actually a principal
    if (token.role !== 'Principal' && token.role !== 'principal') {
      navigate('/dashboard');
      return;
    }

    const email = token.email;
    const role = token.role;
    
    console.log('Principal page loaded for user:', email, role);
    
    const fetchReceived = async () => {
      try {
        // Principal needs role and potentially department from token
        let url = `/getReceivedFormsForUser?role=${encodeURIComponent(role)}`;
        
        // Add department if available in token (though Principal should see all departments)
        if (token.department) {
          url += `&department=${encodeURIComponent(token.department)}`;
        }
        
        console.log('Fetching forms for Principal with URL:', url);
        const res = await axios.get(url);
        console.log('Received forms data for Principal:', res.data);
        setReceivedSubmissions(res.data || []);
      } catch (err) {
        console.error('Error fetching received forms:', err);
        setError('Failed to fetch received submissions');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReceived();
  }, [navigate]);

  if (loading) {
    return (
      <div className="principal-page">
        <div style={{ padding: 40, textAlign: 'center' }}>Loading received forms...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="principal-page">
        <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="principal-page">
      {/* Header */}
      <div className="principal-header">
        <div className="principal-title">
          <h1>Principal Dashboard</h1>
          <span className="role-badge principal">Principal</span>
        </div>
        <p className="principal-subtitle">Review and manage all forms submitted to you</p>
      </div>

      {/* View Mode Toggle */}
      <div style={{ maxWidth: '1400px', margin: '0 auto 24px auto' }}>
        <div className="view-toggle-container" style={{ display: 'inline-flex', background: 'var(--card-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color, rgba(0,0,0,0.05))', boxShadow: 'var(--shadow-sm)' }}>
          <button
            onClick={() => setViewMode('current')}
            style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', background: viewMode === 'current' ? '#3b82f6' : 'transparent', color: viewMode === 'current' ? 'white' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }}
          >
            Current Forms
          </button>
          <button
            onClick={() => setViewMode('archived')}
            style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', background: viewMode === 'archived' ? '#3b82f6' : 'transparent', color: viewMode === 'archived' ? 'white' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }}
          >
            Form History
          </button>
        </div>
      </div>

      {viewMode === 'current' ? (() => {
        const userRoleLower = userRole ? userRole.toLowerCase() : '';
        const isFormForwardedByUser = (form) => {
          if (!form.to) return false;
          const toArray = Array.isArray(form.to) ? form.to : [form.to];
          // If the user's role is not the last one in the 'to' array, they have forwarded it.
          // Note: we also consider it 'forwarded' if their role is in the array but not the last element.
          if (toArray.length === 0) return false;
          const isLast = toArray[toArray.length - 1].toLowerCase() === userRoleLower;
          const isInArray = toArray.some(role => role.toLowerCase() === userRoleLower);
          return isInArray && !isLast;
        };

        const pendingReceivedForms = receivedSubmissions.filter(s => 
          !['accepted', 'approved', 'rejected', 'not_approved', 'cancelled', 'edit'].includes(s.status?.toLowerCase()) && 
          !isFormForwardedByUser(s)
        );

        const forwardedForms = receivedSubmissions.filter(s => 
          !['accepted', 'approved', 'rejected', 'not_approved', 'cancelled'].includes(s.status?.toLowerCase()) && 
          isFormForwardedByUser(s)
        );

        return (
        <div className="principal-content" style={{ display: 'flex', gap: '24px' }}>
          <div className="received-forms-section" style={{ flex: 1 }}>
            <h2>Received Forms</h2>
            <div className="submissions-table">
              {pendingReceivedForms.length === 0 ? (
                <div className="no-forms">
                  <div className="no-forms-icon">📋</div>
                  <h3>No forms received yet</h3>
                  <p>Forms submitted to you will appear here for review</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Form No</th>
                      <th>Subject</th>
                      <th>Department</th>
                      <th>Submitted By</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingReceivedForms.map((submission, idx) => (
                      <tr key={submission._id || submission.id || idx}>
                        <td>#{submission.formNo || submission.id || submission._id}</td>
                        <td>{submission.subject}</td>
                        <td>{submission.department}</td>
                        <td>
                          <div className="submitter-info">
                            <span className="submitter-name">{submission.submittedBy}</span>
                            <span className="submitter-role">{submission.owner}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`status ${submission.status?.toLowerCase?.() || ''}`}>
                            {submission.status}
                          </span>
                        </td>
                        <td>
                          {submission.createdAt 
                            ? new Date(submission.createdAt).toLocaleString() 
                            : (submission.date 
                                ? new Date(submission.date).toLocaleDateString() 
                                : 'N/A'
                              )
                          }
                        </td>
                        <td>
                          <div className="action-buttons" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              className="view-btn"
                              onClick={() => navigate(`/received-forms/${submission._id || submission.id}`)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              View
                            </button>
                            <button
                              className="select-btn"
                              onClick={() => {
                                setSelectedForm(submission);
                                setRemarks(submission.remarks || '');
                                setForwardTo('');
                              }}
                              style={{ 
                                padding: '4px 8px', 
                                fontSize: '0.75rem',
                                background: selectedForm?._id === submission._id ? '#8b5cf6' : 'var(--text-secondary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                              title="Select for detailed review"
                            >
                              {selectedForm?._id === submission._id ? '✓ Selected' : '📋 Select'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <h2 style={{ marginTop: 40 }}>Forwarded Forms</h2>
            <div className="submissions-table">
              {forwardedForms.length === 0 ? (
                <div className="no-forms">
                  <div className="no-forms-icon">📋</div>
                  <h3>No forwarded forms</h3>
                  <p>Forms you forward will appear here</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Form No</th>
                      <th>Subject</th>
                      <th>Department</th>
                      <th>Submitted By</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forwardedForms.map((submission, idx) => (
                      <tr key={submission._id || submission.id || idx}>
                        <td>#{submission.formNo || submission.id || submission._id}</td>
                        <td>{submission.subject}</td>
                        <td>{submission.department}</td>
                        <td>
                          <div className="submitter-info">
                            <span className="submitter-name">{submission.submittedBy}</span>
                            <span className="submitter-role">{submission.owner}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`status ${submission.status?.toLowerCase?.() || ''}`}>
                            {submission.status}
                          </span>
                        </td>
                        <td>
                          {submission.createdAt 
                            ? new Date(submission.createdAt).toLocaleString() 
                            : (submission.date 
                                ? new Date(submission.date).toLocaleDateString() 
                                : 'N/A'
                              )
                          }
                        </td>
                        <td>
                          <div className="action-buttons" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              className="view-btn"
                              onClick={() => navigate(`/received-forms/${submission._id || submission.id}`)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              View
                            </button>
                            <button
                              className="select-btn"
                              onClick={() => {
                                setSelectedForm(submission);
                                setRemarks(submission.remarks || '');
                                setForwardTo('');
                              }}
                              style={{ 
                                padding: '4px 8px', 
                                fontSize: '0.75rem',
                                background: selectedForm?._id === submission._id ? '#8b5cf6' : 'var(--text-secondary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                              title="Select for detailed review"
                            >
                              {selectedForm?._id === submission._id ? '✓ Selected' : '📋 Select'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right-Hand Side Action Panel */}
          <div style={{ 
            background: 'var(--card-bg)', 
            borderRadius: 12, 
            boxShadow: 'var(--shadow-md)', 
            padding: 24, 
            width: 320,
            height: 'fit-content',
            position: 'sticky',
            top: 24
          }}>
            <h3 style={{ 
              margin: '0 0 20px 0', 
              color: 'var(--text-primary)', 
              fontSize: '1.2rem',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: 8
            }}>
              ⚡ Form Actions
            </h3>
            
            {selectedForm ? (() => {
              const userRoleLower = userRole ? userRole.toLowerCase() : '';
              const userActions = selectedForm.history?.filter(h => h.by && h.by.toLowerCase() === userRoleLower) || [];
              const isLastReceiver = Array.isArray(selectedForm.to) 
                ? selectedForm.to[selectedForm.to.length - 1].toLowerCase() === userRoleLower
                : selectedForm.to?.toLowerCase() === userRoleLower;

              const hasActed = !isLastReceiver || ['accepted', 'approved', 'rejected', 'not_approved', 'edit'].includes(selectedForm.status?.toLowerCase());
              
              let actedStatus = 'forwarded';
              if (hasActed && userActions.length > 0) {
                const lastAction = userActions[userActions.length - 1].action.toLowerCase();
                if (lastAction.includes('not_approved')) actedStatus = 'not_approved';
                else if (lastAction.includes('approved')) actedStatus = 'approved';
                else if (lastAction.includes('accepted')) actedStatus = 'accepted';
                else if (lastAction.includes('rejected')) actedStatus = 'rejected';
                else if (selectedForm.status === 'edit') actedStatus = 'edit';
              } else if (hasActed && selectedForm.status === 'edit') {
                actedStatus = 'edit';
              }

              const displayStatus = hasActed ? (statusLabels[actedStatus] || actedStatus) : (selectedForm.status || 'awaiting');
              const displayColor = hasActed ? (statusColors[actedStatus] || '#888') : (statusColors[selectedForm.status?.toLowerCase?.()] || '#888');
              
              return (
              <>
                {/* Selected Form Info */}
                <div style={{ 
                  background: 'var(--bg-color)',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 20,
                  border: '1px solid #e2e8f0'
                }}>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '1rem' }}>
                    📋 Selected Form
                  </h4>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <div><strong>Form ID:</strong> #{selectedForm.formNo || selectedForm._id}</div>
                    <div><strong>Subject:</strong> {selectedForm.subject}</div>
                    <div><strong>Department:</strong> {selectedForm.department}</div>
                    <div><strong>Status:</strong> 
                      <span style={{ 
                        background: displayColor,
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        marginLeft: '8px'
                      }}>
                        {displayStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {hasActed ? (
                  <div style={{ marginBottom: 20, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #d1d5db' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>Action Completed</h4>
                    <p style={{ margin: 0, color: '#334155' }}>
                      {userActions.length > 0 
                        ? (userActions[userActions.length - 1].action.toLowerCase().includes('forwarded') 
                            ? `You have already forwarded to ${userActions[userActions.length - 1].target || 'another role'}.` 
                            : `You have already ${userActions[userActions.length - 1].action} this form.`)
                        : 'You have already actioned this form.'}
                    </p>
                  </div>
                ) : (
                <>
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', fontSize: '1rem' }}>
                    🎯 Quick Actions
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {/* Accept button only for Principal/Manager */}
                    {rolePermissions[userRole]?.accept && (
                      <button
                        onClick={handleAccept}
                        disabled={isSubmitting}
                        style={{
                          background: '#22c55e',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          padding: '10px 16px',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          cursor: isSubmitting ? 'not-allowed' : 'pointer',
                          opacity: isSubmitting ? 0.6 : 1
                        }}
                      >
                        ✓ Accept Form
                      </button>
                    )}
                    
                    {/* Reject button for all allowed roles */}
                    {rolePermissions[userRole]?.reject && (
                      <button
                        onClick={handleReject}
                        disabled={isSubmitting}
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          padding: '10px 16px',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          cursor: isSubmitting ? 'not-allowed' : 'pointer',
                          opacity: isSubmitting ? 0.6 : 1
                        }}
                      >
                        ✗ Reject Form
                      </button>
                    )}
                    
                    {/* Request Edit button for all allowed roles */}
                    {rolePermissions[userRole]?.requestEdit && (
                      <button
                        onClick={handleRequestEdit}
                        disabled={isSubmitting}
                        style={{
                          background: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          padding: '10px 16px',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          cursor: isSubmitting ? 'not-allowed' : 'pointer',
                          opacity: isSubmitting ? 0.6 : 1
                        }}
                      >
                        ✏️ Request Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Remarks Section */}
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', fontSize: '1rem' }}>
                    💬 Remarks
                  </h4>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Add your remarks here..."
                    style={{
                      width: '100%',
                      minHeight: 80,
                      padding: 12,
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: '0.9rem',
                      resize: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Forward To Section */}
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', fontSize: '1rem' }}>
                    📤 Forward To
                  </h4>
                  <select
                    value={forwardTo}
                    onChange={(e) => setForwardTo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 10,
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: '0.9rem',
                      background: 'var(--card-bg)'
                    }}
                  >
                    <option value="">Select person to forward</option>
                    {(() => {
                      const nextRcv = selectedForm ? getNextReceiver(selectedForm.category || selectedForm.subject, selectedForm.to) : null;
                      const possibleReceivers = nextRcv ? [nextRcv] : ['FacultyAdvisor', 'HOD', 'Manager', 'Committee', 'Secretary'];
                      return possibleReceivers.map(receiver => (
                        <option key={receiver} value={receiver}>{receiver}</option>
                      ));
                    })()}
                  </select>
                  
                  {forwardTo && (
                    <button
                      onClick={handleForward}
                      disabled={isSubmitting}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        opacity: isSubmitting ? 0.6 : 1,
                        marginTop: 8,
                        width: '100%'
                      }}
                    >
                      📤 Forward Form
                    </button>
                  )}
                </div>
                </>
                )}

                {/* Clear Selection */}
                <button
                  onClick={() => {
                    setSelectedForm(null);
                    setRemarks('');
                    setForwardTo('');
                  }}
                  style={{
                    background: 'var(--text-secondary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  🗑️ Clear Selection
                </button>
              </>
              );
            })() : (
              <div style={{ 
                textAlign: 'center', 
                color: 'var(--text-secondary)', 
                padding: '40px 20px',
                fontSize: '0.9rem'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📋</div>
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>No Form Selected</div>
                <div>Click "Select" on any form to review and take action</div>
              </div>
            )}
          </div>

          {/* Review Modal for forms that need attention */}
          {Object.keys(editRows).length > 0 && (
            <div className="review-modal">
              <div className="review-modal-content">
                <h3>Review Form</h3>
                {Object.entries(editRows).map(([formId, editData]) => {
                  const form = receivedSubmissions.find(f => f._id === formId);
                  if (!form) return null;
                  
                  return (
                    <div key={formId} className="review-form">
                      <div className="review-form-header">
                        <h4>Form #{form.formNo} - {form.subject}</h4>
                        <button
                          className="close-btn"
                          onClick={() => setEditRows(prev => {
                            const newRows = { ...prev };
                            delete newRows[formId];
                            return newRows;
                          })}
                        >
                          ×
                        </button>
                      </div>
                      
                      <div className="review-form-body">
                        <div className="form-field">
                          <label>Status:</label>
                          <select
                            value={editData.status || 'awaiting'}
                            onChange={(e) => handleEditChange(formId, 'status', e.target.value)}
                          >
                            <option value="awaiting">Awaiting</option>
                            <option value="forwarded">Forwarded</option>
                            <option value="accepted">Accepted</option>
                            <option value="rejected">Rejected</option>
                            <option value="edit">Request Edit</option>
                          </select>
                        </div>
                        
                        <div className="form-field">
                          <label>Remarks:</label>
                          <textarea
                            value={editData.remarks || ''}
                            onChange={(e) => handleEditChange(formId, 'remarks', e.target.value)}
                            placeholder="Add your remarks here..."
                            rows="4"
                          />
                        </div>
                        
                        <div className="form-actions">
                          <button
                            className="save-btn"
                            onClick={() => handleSave(form)}
                            disabled={editData.saving}
                          >
                            {editData.saving ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            className="cancel-btn"
                            onClick={() => setEditRows(prev => {
                              const newRows = { ...prev };
                              delete newRows[formId];
                              return newRows;
                            })}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    })() : (
        <div className="archived-section">
          <Archive />
        </div>
      )}
    </div>
  );
}

export default PrincipalPage; 
