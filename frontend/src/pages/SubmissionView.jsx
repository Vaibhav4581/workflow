import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import axios from 'axios';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { generateOfficialPdf } from '../utils/pdfGenerator';
import { getNextReceiver } from '../utils/hierarchy';

const statusLabels = {
  awaiting: 'Awaiting',
  forwarded: 'Forwarded',
  accepted: 'Accepted',
  rejected: 'Rejected',
  approved: 'Approved',
  not_approved: 'Not Approved',
  cancelled: 'Cancelled',
};
const statusColors = {
  awaiting: '#fbbf24', // yellow
  forwarded: '#3b82f6', // blue
  accepted: '#22c55e', // green
  rejected: '#ef4444', // red
  approved: '#22c55e', // green
  edit: '#f59e0b', // orange - needs editing/revision
  not_approved: '#f97316', // orange
  cancelled: '#6b7280', // gray
};

// Role permissions map
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

export default function SubmissionView() {
  const { id } = useParams();
  const location = useLocation();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const letterRef = useRef(null);
  
  // Form action states
  const [remarks, setRemarks] = useState('');
  const [forwardTo, setForwardTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Get current user info
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setCurrentUser(decoded);
      } catch (err) {
        console.error('Invalid token');
      }
    }

    const fetchSubmission = async () => {
      setLoading(true);
      setError('');
      try {
        let res = await axios.get(`/getSFormById/${id}`);
        setSubmission(res.data);
      } catch (err1) {
        try {
          let res = await axios.get(`/getFFormById/${id}`);
          setSubmission(res.data);
        } catch (err2) {
          setError('Submission not found or failed to load.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSubmission();
    
    // Set up auto-refresh for real-time status updates
    const refreshInterval = setInterval(() => {
      // Only refresh if the page is visible
      if (document.visibilityState === 'visible') {
        console.log('Auto-refreshing submission data...');
        fetchSubmission();
        setLastUpdateTime(Date.now());
      }
    }, 15000); // 15 seconds for more frequent updates on individual forms
    
    // Cleanup interval on unmount
    return () => clearInterval(refreshInterval);
  }, [id]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>{error}</div>;
  if (!submission) return null;

  const status = submission.status || 'awaiting';
  
  const userRoleLower = currentUser?.role ? currentUser.role.toLowerCase() : '';
  const userActions = submission.history?.filter(h => h.by && h.by.toLowerCase() === userRoleLower) || [];
  
  const isLastReceiver = Array.isArray(submission.to) 
    ? submission.to[submission.to.length - 1].toLowerCase() === userRoleLower
    : submission.to?.toLowerCase() === userRoleLower;

  const hasActed = !isLastReceiver || ['accepted', 'approved', 'rejected', 'not_approved', 'edit'].includes(submission.status?.toLowerCase());

  let actedStatus = 'forwarded';
  if (hasActed && userActions.length > 0) {
    const lastAction = userActions[userActions.length - 1].action.toLowerCase();
    if (lastAction.includes('not_approved')) actedStatus = 'not_approved';
    else if (lastAction.includes('approved')) actedStatus = 'approved';
    else if (lastAction.includes('accepted')) actedStatus = 'accepted';
    else if (lastAction.includes('rejected')) actedStatus = 'rejected';
    else if (submission.status === 'edit') actedStatus = 'edit';
  } else if (hasActed && submission.status === 'edit') {
    actedStatus = 'edit';
  }

  const statusLabel = hasActed ? (statusLabels[actedStatus] || actedStatus) : (statusLabels[status] || status);
  const statusColor = hasActed ? (statusColors[actedStatus] || '#888') : (statusColors[status] || '#888');

  // Determine if this is a received form view (e.g., via location.state)
  const isReceivedView = location.state?.fromReceived || false;
  
  // Check if current user can see tracking (sender or receiver)
  const canSeeTracking = currentUser && (
    submission.submittedBy === currentUser.email || 
    (Array.isArray(submission.to) ? submission.to.includes(currentUser.role) : submission.to === currentUser.role)
  );

  // Check if current user can perform actions (receiver only, not sender)
  const canPerformActions = !hasActed && currentUser && 
    submission.submittedBy !== currentUser.email && 
    (Array.isArray(submission.to) ? submission.to.includes(currentUser.role) : submission.to === currentUser.role);

  // Handle form actions
  const handleFormAction = async (action, actionRemarks = '', targetForwardTo = '') => {
    if (!canPerformActions) {
      toast.error('You are not authorized to perform this action.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = jwtDecode(localStorage.getItem('token'));
      const backendFormType = submission.owner === 'staff' ? 'faculty' : submission.owner;
      
      await axios.put('/updateFormRemarksStatus', {
        formId: submission._id,
        formType: backendFormType,
        status: action,
        remarks: actionRemarks || remarks,
        to: targetForwardTo ? (Array.isArray(submission.to) ? [...submission.to, targetForwardTo] : [submission.to, targetForwardTo]) : undefined,
        by: currentUser?.role || 'system',
        authorName: localStorage.getItem('userName') || '',
        authorEmail: localStorage.getItem('userEmail') || '',
      });
      
      // Refresh the submission data
      const fetchSubmission = async () => {
        try {
          let res = await axios.get(`/getSFormById/${id}`);
          setSubmission(res.data);
        } catch (err1) {
          try {
            let res = await axios.get(`/getFFormById/${id}`);
            setSubmission(res.data);
          } catch (err2) {
            console.error('Failed to refresh submission');
          }
        }
      };
      await fetchSubmission();
      
      // Reset form
      setRemarks('');
      setForwardTo('');
      toast.success(`Form ${action} successfully!`);
      
    } catch (error) {
      console.error('Action Error:', error);
      toast.error('Failed to perform action. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle accept action
  const handleAccept = () => {
    setConfirmDialog({
      isOpen: true,
      message: 'Are you sure you want to accept this form?',
      onConfirm: () => {
        setConfirmDialog({ isOpen: false });
        handleFormAction('accepted', remarks);
      }
    });
  };

  // Handle reject action
  const handleReject = () => {
    if (!remarks.trim()) {
      toast.error('Please provide remarks when rejecting a form.');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      message: 'Are you sure you want to reject this form?',
      onConfirm: () => {
        setConfirmDialog({ isOpen: false });
        handleFormAction('rejected', remarks);
      }
    });
  };

  // Handle request edit action
  const handleRequestEdit = () => {
    if (!remarks.trim()) {
      toast.error('Please provide remarks when requesting edits.');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      message: 'Are you sure you want to request edits for this form?',
      onConfirm: () => {
        setConfirmDialog({ isOpen: false });
        handleFormAction('edit', remarks);
      }
    });
  };

  // Handle forward action
  const handleForward = (targetForwardTo) => {
    if (!targetForwardTo) {
      toast.error('Please select someone to forward to.');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      message: `Are you sure you want to forward this form to ${targetForwardTo}?`,
      onConfirm: () => {
        setConfirmDialog({ isOpen: false });
        handleFormAction('forwarded', remarks, targetForwardTo);
      }
    });
  };

  const handleDownloadPdf = async () => {
    try {
      await generateOfficialPdf(submission, {
        userRole: currentUser?.role,
        liveRemarks: remarks,
        userName: localStorage.getItem('userName') || '',
        userEmail: localStorage.getItem('userEmail') || '',
      });
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleDownloadAttachment = (attachment) => {
    let u8arr;
    if (attachment.file.type === 'Buffer' && attachment.file.data) {
      u8arr = new Uint8Array(attachment.file.data);
    } else {
      const binaryString = window.atob(attachment.file);
      u8arr = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        u8arr[i] = binaryString.charCodeAt(i);
      }
    }
    const blob = new Blob([u8arr], { type: attachment.mimetype });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '80vh', background: 'var(--bg-color, #f8f9fa)', padding: 40, gap: 24 }}>
      <ConfirmModal 
        isOpen={confirmDialog.isOpen} 
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} 
        onConfirm={confirmDialog.onConfirm} 
        message={confirmDialog.message} 
      />
      {/* Status Bar */}
      <div style={{ width: 16, minHeight: 400, background: statusColor, borderRadius: 8, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 20, right: 24, color: statusColor, fontWeight: 'bold', writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', fontSize: 18, letterSpacing: 2 }}>
          {statusLabel}
        </div>
      </div>
      
      {/* Main Content Container */}
      <div style={{ display: 'flex', gap: 24, flex: 1, maxWidth: 1200 }}>
      {/* Letter Format */}
        <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 12, boxShadow: 'var(--shadow-md, 0 2px 12px rgba(0,0,0,0.1))', padding: 40, minWidth: 400, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div />
            <button
              onClick={handleDownloadPdf}
              style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 12px', fontWeight: 600 }}
            >
              ⬇️ Download PDF
            </button>
        </div>
        <div style={{ textAlign: 'right', marginBottom: 16 }}>
          <div><b>Date:</b> {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : ''}</div>
          <div><b>No:</b> {submission.formNo || submission._id}</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div>To,</div>
          <div style={{ marginLeft: 32 }}>{Array.isArray(submission.to) ? submission.to.join(', ') : submission.to}</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          {submission.category && <div><b>Category:</b> {submission.category}</div>}
          <div><b>Subject:</b> {submission.subject}</div>
          {submission.subjectElaboration && (
            <div><b>Elaboration:</b> {submission.subjectElaboration}</div>
          )}
        </div>
        <div style={{ marginBottom: 16 }} ref={letterRef}>
          <div>Respected Sir/Madam,</div>
          <div style={{ marginTop: 16, marginLeft: 32 }}>{submission.details}</div>
        </div>
        {submission.attachments && submission.attachments.length > 0 ? (
          <div style={{ marginBottom: 16, marginLeft: 32 }}>
            <b>Attachments:</b>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
              {submission.attachments.map((att, idx) => (
                <li key={idx} style={{ marginBottom: 8 }}>
                  {att.filename}
                  <button
                    onClick={() => handleDownloadAttachment(att)}
                    style={{ marginLeft: 12, background: '#e5e7eb', border: '1px solid #d1d5db', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}
                  >
                    Download
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : submission.attachment && submission.attachment.filename && (
          <div style={{ marginBottom: 16, marginLeft: 32 }}>
            <b>Attachment:</b> {submission.attachment.filename}
            <button
              onClick={() => handleDownloadAttachment(submission.attachment)}
              style={{ marginLeft: 12, background: '#e5e7eb', border: '1px solid #d1d5db', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}
            >
              Download
            </button>
          </div>
        )}
        <div style={{ marginTop: 32 }}>
          <div><b>Department:</b> {submission.department}</div>
          <div><b>Submitted By:</b> {submission.submittedBy}</div>
        </div>
        
        {/* Form History/Roadmap */}
        {submission.history && submission.history.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h3 style={{ color: '#374151', marginBottom: 16, borderBottom: '2px solid #e5e7eb', paddingBottom: 8 }}>
              Form Roadmap & History
            </h3>
            <div style={{ position: 'relative' }}>
              {/* Timeline line */}
              <div style={{ 
                position: 'absolute', 
                left: 15, 
                top: 0, 
                bottom: 0, 
                width: 2, 
                background: '#d1d5db' 
              }} />
              
              {submission.history.map((entry, index) => (
                <div key={index} style={{ 
                  position: 'relative', 
                  paddingLeft: 40, 
                  paddingBottom: 24,
                  marginBottom: index === submission.history.length - 1 ? 0 : 16
                }}>
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute',
                    left: 8,
                    top: 4,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: index === 0 ? '#22c55e' : '#3b82f6',
                    border: '3px solid white',
                    boxShadow: '0 0 0 3px #e5e7eb'
                  }} />
                  
                  <div style={{ 
                    background: '#f9fafb',
                    padding: 16,
                    borderRadius: 8,
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          background: '#4f46e5',
                          color: '#ffffff',
                          fontWeight: '700',
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: 4
                        }}>
                          {entry.by || 'Reviewer'}
                        </span>
                        {(entry.authorName || entry.authorEmail) && (
                          <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.85rem' }}>
                            {entry.authorName || entry.authorEmail}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ 
                      fontWeight: '600', 
                      color: '#374151',
                      fontSize: '0.85rem',
                      marginBottom: entry.remarks ? 6 : 0
                    }}>
                      {entry.action}
                    </div>
                    {entry.remarks && (
                      <div style={{ 
                        background: '#ffffff',
                        borderLeft: '3px solid #6366f1',
                        padding: '6px 12px',
                        borderRadius: '0 4px 4px 0',
                        color: '#334155',
                        fontSize: '0.875rem',
                        fontStyle: 'italic',
                        marginTop: 4
                      }}>
                        "{entry.remarks}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Tracking Panel - Right Side */}
      {canSeeTracking && (
        <div style={{ 
          background: '#fff', 
          borderRadius: 12, 
          boxShadow: '0 2px 12px #eee', 
          padding: 24, 
          width: 300,
          height: 'fit-content',
          position: 'sticky',
          top: 24
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            color: '#374151', 
            fontSize: '1.2rem',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: 8
          }}>
            📍 Form Tracking
          </h3>
          
          {/* Current Status */}
          <div style={{ 
            background: `linear-gradient(135deg, ${statusColor}20, ${statusColor}10)`,
            border: `2px solid ${statusColor}`,
            borderRadius: 8,
            padding: 16,
            marginBottom: 20,
            textAlign: 'center'
          }}>
            <div style={{ fontWeight: 'bold', color: statusColor, fontSize: '1.1rem' }}>
              {statusLabel}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: 4 }}>
              Current Status
            </div>
          </div>
          
          {/* Form Journey */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '1rem' }}>
              📋 Form Journey
            </h4>
            <div style={{ fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.5 }}>
              <div><strong>Form ID:</strong> {submission.formNo || submission._id}</div>
              <div><strong>Submitted:</strong> {submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : 'N/A'}</div>
              <div><strong>To:</strong> {Array.isArray(submission.to) ? submission.to.join(', ') : submission.to}</div>
              <div><strong>Department:</strong> {submission.department}</div>
            </div>
          </div>
          
          {/* Progress Steps */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '1rem' }}>
              🛣️ Progress Steps
            </h4>
            <div style={{ position: 'relative' }}>
              {/* Progress line */}
              <div style={{
                position: 'absolute',
                left: 8,
                top: 0,
                bottom: 0,
                width: 2,
                background: '#e5e7eb'
              }} />
              
              {['Submitted', 'Under Review', 'Processed', 'Completed'].map((step, index) => {
                const isCompleted = (
                  (index === 0) ||
                  (index === 1 && ['forwarded', 'accepted', 'rejected', 'approved'].includes(status)) ||
                  (index === 2 && ['accepted', 'approved'].includes(status)) ||
                  (index === 3 && status === 'approved')
                );
                
                return (
                  <div key={step} style={{ 
                    position: 'relative', 
                    paddingLeft: 28, 
                    paddingBottom: index === 3 ? 0 : 16,
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {/* Step dot */}
                    <div style={{
                      position: 'absolute',
                      left: 2,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: isCompleted ? '#22c55e' : '#e5e7eb',
                      border: '2px solid white',
                      boxShadow: '0 0 0 2px #e5e7eb'
                    }} />
                    
                    <div style={{
                      fontSize: '0.85rem',
                      color: isCompleted ? '#374151' : '#9ca3af',
                      fontWeight: isCompleted ? '600' : '400'
                    }}>
                      {step}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submitter Actions */}
          {submission.submittedBy === currentUser?.email && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '1rem' }}>
                👤 Submitter Actions
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {status === 'awaiting' && (
                  <button
                    onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        message: 'Are you sure you want to cancel this submission?',
                        onConfirm: () => {
                          setConfirmDialog({ isOpen: false });
                          handleFormAction('cancelled', 'Cancelled by submitter');
                        }
                      });
                    }}
                    disabled={isSubmitting}
                    style={{
                      background: '#6b7280', color: 'white', border: 'none', borderRadius: 6,
                      padding: '10px 16px', fontSize: '0.9rem', fontWeight: '600', cursor: isSubmitting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    🚫 Cancel Form
                  </button>
                )}
                {['awaiting', 'forwarded', 'edit'].includes(status) && (
                  <button
                    onClick={async () => {
                      setIsSubmitting(true);
                      try {
                        await axios.post('/sendReminders', {
                          submitterEmail: currentUser.email,
                          formId: submission._id,
                          subject: submission.subject,
                          to: submission.to,
                        });
                        toast.success('Reminders sent successfully!');
                      } catch (err) {
                        toast.error('Failed to send reminders.');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                    style={{
                      background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 6,
                      padding: '10px 16px', fontSize: '0.9rem', fontWeight: '600', cursor: isSubmitting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    🔔 Send Reminder
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Form Actions - Only show for receivers */}
          {canPerformActions && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '1rem' }}>
                ⚡ Quick Actions
              </h4>
              
              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {/* Accept button only for Principal/Manager */}
                {rolePermissions[currentUser?.role]?.accept && (
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
                {rolePermissions[currentUser?.role]?.reject && (
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
                {rolePermissions[currentUser?.role]?.requestEdit && (
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
          )}

          {/* Remarks & Review History Section */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>💬</span> Remarks & Review History
            </h4>

            {/* Past Tagged Remarks */}
            {submission.history && submission.history.filter(h => h.remarks || h.action).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {submission.history
                  .filter(h => h.remarks || h.action)
                  .map((item, idx) => {
                    const roleName = item.by || 'Reviewer';
                    const actionText = item.action || 'Reviewed';
                    const isApprove = actionText.toLowerCase().includes('accept') || actionText.toLowerCase().includes('approve');
                    const isReject = actionText.toLowerCase().includes('reject') || actionText.toLowerCase().includes('not_approved');
                    const isEdit = actionText.toLowerCase().includes('edit');
                    const isForward = actionText.toLowerCase().includes('forward');
                    
                    let badgeBg = '#e0e7ff';
                    let badgeColor = '#3730a3';
                    if (isApprove) { badgeBg = '#dcfce7'; badgeColor = '#166534'; }
                    else if (isReject) { badgeBg = '#fee2e2'; badgeColor = '#991b1b'; }
                    else if (isEdit) { badgeBg = '#fef3c7'; badgeColor = '#92400e'; }
                    else if (isForward) { badgeBg = '#dbeafe'; badgeColor = '#1e40af'; }

                    return (
                      <div 
                        key={idx} 
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: '10px 12px',
                          fontSize: '0.85rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {/* Role Tag */}
                            <span style={{
                              background: '#4f46e5',
                              color: '#ffffff',
                              fontWeight: '700',
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: 4,
                              letterSpacing: '0.5px'
                            }}>
                              {roleName}
                            </span>

                            {/* Author Name / Email */}
                            {(item.authorName || item.authorEmail) && (
                              <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.8rem' }}>
                                {item.authorName || item.authorEmail}
                              </span>
                            )}
                          </div>

                          {/* Action Badge */}
                          <span style={{
                            background: badgeBg,
                            color: badgeColor,
                            fontWeight: '600',
                            fontSize: '0.72rem',
                            padding: '2px 6px',
                            borderRadius: 4
                          }}>
                            {actionText}
                          </span>
                        </div>

                        {/* Timestamp */}
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: item.remarks ? 6 : 0 }}>
                          🕒 {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                        </div>

                        {/* Remark Content */}
                        {item.remarks && (
                          <div style={{
                            background: '#ffffff',
                            borderLeft: '3px solid #6366f1',
                            padding: '6px 10px',
                            borderRadius: '0 4px 4px 0',
                            color: '#334155',
                            fontStyle: 'italic',
                            marginTop: 4
                          }}>
                            "{item.remarks}"
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', padding: '8px 10px', background: '#f8fafc', borderRadius: 6, marginBottom: 12 }}>
                No prior remarks recorded.
              </div>
            )}

            {/* Add New Remark for active reviewers */}
            {canPerformActions && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#4b5563', marginBottom: 4 }}>
                  ➕ Add your remarks for this action:
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Type remarks here before forwarding or acting..."
                  style={{
                    width: '100%',
                    minHeight: 70,
                    padding: 10,
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    fontSize: '0.875rem',
                    resize: 'none',
                    fontFamily: 'inherit',
                    background: '#ffffff'
                  }}
                />
              </div>
            )}
          </div>

          {canPerformActions && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '1rem' }}>
                📤 Forward To
              </h4>
              
              {(() => {
                const nextRcv = getNextReceiver(submission.category || submission.subject, submission.to);
                const targetOpt = nextRcv ? { label: nextRcv, value: nextRcv } : null;
                if (!targetOpt) return null;

                return (
                  <div style={{
                    padding: 12,
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    background: '#f8fafc',
                    fontSize: '0.9rem',
                    color: '#374151'
                  }}>
                    <strong>Forward to:</strong> {targetOpt.label}
                    <button
                      onClick={() => handleForward(targetOpt.value)}
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
                  </div>
                );
              })()}
            </div>
          )}

          {/* User Info */}
          <div style={{ 
            background: '#f9fafb',
            borderRadius: 8,
            padding: 12,
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
              <div><strong>Viewing as:</strong></div>
              <div>{currentUser?.role} - {currentUser?.email}</div>
              <div style={{ marginTop: 8, fontSize: '0.8rem', fontStyle: 'italic' }}>
                {submission.submittedBy === currentUser?.email ? '👤 You are the sender' : '📨 You are a receiver'}
              </div>
            </div>
          </div>
          </div>
        )}
      </div>
      <ConfirmModal 
        isOpen={confirmDialog.isOpen} 
        message={confirmDialog.message} 
        onConfirm={confirmDialog.onConfirm} 
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} 
      />
    </div>
  );
} 
