import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import jsPDF from 'jspdf';
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
const FORWARD_OPTIONS = [
  { label: 'Head of Department (HoD)', value: 'HOD' },
  { label: 'Principal', value: 'Principal' },
  { label: 'Manager', value: 'Manager' },
  { label: 'Committee Convenor', value: 'Committee' },
  { label: 'Secretary', value: 'Secretary' },
];

export default function ReceivedFormView() {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [forwardTo, setForwardTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState('');
  const [canHodAccept, setCanHodAccept] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });
  const letterRef = useRef(null);

  useEffect(() => {
    const token = jwtDecode(localStorage.getItem('token'));
    if (token){
      setUserRole(token.role);
    }
    
    // Try both student and faculty endpoints
    const fetchForm = async () => {
      setLoading(true);
      setError('');
      try {
        let res = await axios.get(`/getSFormById/${id}`);
        const formData = res.data;
        setForm(formData);
        setRemarks(formData.remarks || '');
        checkHodAcceptance(formData.category);
      } catch (err1) {
        try {
          let res = await axios.get(`/getFFormById/${id}`);
          const formData = res.data;
          setForm(formData);
          setRemarks(formData.remarks || '');
          checkHodAcceptance(formData.category);
        } catch (err2) {
          setError('Submission not found or failed to load.');
        }
      } finally {
        setLoading(false);
      }
    };

    const checkHodAcceptance = async (category) => {
      try {
        const res = await axios.get(`/api/settings/configs?type=subject`);
        const subjectConfig = res.data.find(c => c.value === category);
        if (subjectConfig && subjectConfig.canBeAcceptedAtHodLevel) {
          setCanHodAccept(true);
        }
      } catch (err) {
        console.error("Failed to check HOD acceptance", err);
      }
    };

    fetchForm();
  }, [id]);

  const handleAction = async (action, overrideForwardTo) => {
    if (!form) {
      setError('Form data not available');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const finalForwardTo = overrideForwardTo || forwardTo;
      let newTo = Array.isArray(form.to) ? [...form.to] : [form.to];
      if (action === 'forward' && finalForwardTo && !newTo.includes(finalForwardTo)) {
        newTo.push(finalForwardTo);
      }
      
      const formType = form.owner === 'student' ? 'student' : 'faculty';

      // 1. Capture the response from the API call
      const response = await axios.put('/updateFormRemarksStatus', {
        formId: form._id || form.id,
        formType,
        remarks,
        to: action === 'forward' ? newTo : undefined,
        status: action === 'forward' ? 'forwarded' : action,
        by: userRole,
      });

      // 2. Use the returned data to update your state
      // This ensures your local state is a perfect match for the database
      setForm(response.data);
      
      if (action !== 'forward') {
        setShowSidePanel(false);
      }
      toast.success('Action completed successfully!');
    } catch (err) {
      // You can also improve error handling to be more specific
      const message = err.response?.data?.message || 'Failed to update.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
};

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>{error}</div>;
  if (!form) return null;

  const status = form.status || 'awaiting';
  const userRoleLower = userRole ? userRole.toLowerCase() : '';
  const userActions = form.history?.filter(h => h.by && h.by.toLowerCase() === userRoleLower) || [];
  const isLastReceiver = Array.isArray(form.to) 
    ? form.to[form.to.length - 1].toLowerCase() === userRoleLower
    : form.to?.toLowerCase() === userRoleLower;

  const hasActed = !isLastReceiver || ['accepted', 'approved', 'rejected', 'not_approved', 'edit'].includes(form.status?.toLowerCase());

  let actedStatus = 'forwarded';
  if (hasActed && userActions.length > 0) {
    const lastAction = userActions[userActions.length - 1].action.toLowerCase();
    if (lastAction.includes('not_approved')) actedStatus = 'not_approved';
    else if (lastAction.includes('approved')) actedStatus = 'approved';
    else if (lastAction.includes('accepted')) actedStatus = 'accepted';
    else if (lastAction.includes('rejected')) actedStatus = 'rejected';
    else if (form.status === 'edit') actedStatus = 'edit';
  } else if (hasActed && form.status === 'edit') {
    actedStatus = 'edit';
  }

  const statusLabel = hasActed ? (statusLabels[actedStatus] || actedStatus) : (statusLabels[status] || status);
  const statusColor = hasActed ? (statusColors[actedStatus] || '#888') : (statusColors[status] || '#888');
  const isFinal = ['accepted','rejected'].includes((status || '').toLowerCase()) || hasActed;

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await generateOfficialPdf(form);
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(false);
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
    <>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '80vh', background: 'var(--bg-color, #f8f9fa)', padding: 40 }}>
        {/* Status Bar */}
        <div style={{ width: 16, minHeight: 400, background: statusColor, borderRadius: 8, marginRight: 32, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 20, right: 24, color: statusColor, fontWeight: 'bold', writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', fontSize: 18, letterSpacing: 2 }}>
            {statusLabel}
          </div>
        </div>
        {/* Letter Format */}
        <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 12, boxShadow: 'var(--shadow-md, 0 2px 12px rgba(0,0,0,0.1))', padding: 40, minWidth: 400, maxWidth: 700, width: '100%', position: 'relative' }}>
          <div style={{ textAlign: 'right', marginBottom: 16 }}>
            <div><b>Date:</b> {form.createdAt ? new Date(form.createdAt).toLocaleString() : ''}</div>
            <div><b>No:</b> {form.formNo || form._id}</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div>To,</div>
            <div style={{ marginLeft: 32 }}>{Array.isArray(form.to) ? form.to.join(', ') : form.to}</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            {form.category && <div><b>Category:</b> {form.category}</div>}
            <div><b>Subject:</b> {form.subject}</div>
            {form.subjectElaboration && (
              <div><b>Elaboration:</b> {form.subjectElaboration}</div>
            )}
          </div>
          <div style={{ marginBottom: 16 }} ref={letterRef}>
            <div>Respected Sir/Madam,</div>
            <div style={{ marginTop: 16, marginLeft: 32 }}>{form.details}</div>
          </div>
          {form.attachments && form.attachments.length > 0 ? (
            <div style={{ marginBottom: 16, marginLeft: 32 }}>
              <b>Attachments:</b>
              <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                {form.attachments.map((att, idx) => (
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
          ) : form.attachment && form.attachment.filename && (
            <div style={{ marginBottom: 16, marginLeft: 32 }}>
              <b>Attachment:</b> {form.attachment.filename}
              <button
                onClick={() => handleDownloadAttachment(form.attachment)}
                style={{ marginLeft: 12, background: '#e5e7eb', border: '1px solid #d1d5db', borderRadius: 4, padding: '4px 8px', cursor: 'pointer' }}
              >
                Download
              </button>
            </div>
          )}
          <div style={{ marginTop: 32 }}>
            <div><b>Department:</b> {form.department}</div>
            <div><b>Submitted By:</b> {form.submittedBy}</div>
          </div>
          
          {/* Action Button */}
          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={handleDownloadPdf}
                disabled={downloading}
                style={{
                  background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 6,
                  padding: '10px 16px', fontWeight: 600, cursor: downloading ? 'not-allowed' : 'pointer'
                }}
              >
                ⬇️ Download PDF
              </button>
            <button
              onClick={() => setShowSidePanel(true)}
              style={{
                background: '#3182ce',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '12px 32px',
                cursor: 'pointer',
                fontWeight: '500',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={e => e.target.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.target.style.transform = 'scale(1)'}
            >
              Actions
              <span style={{ fontSize: '18px', marginTop: '1px' }}>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Side Panel */}
      {showSidePanel && (
        <>
          {/* Overlay */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 40,
            }}
            onClick={() => setShowSidePanel(false)}
          />
          
          {/* Side Panel Content */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: '400px',
              height: '100vh',
              background: 'white',
              boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
              padding: '24px',
              zIndex: 50,
              overflowY: 'auto'
            }}
          >
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ 
                  margin: 0, 
                  color: '#374151', 
                  fontSize: '1.2rem',
                }}>⚡ Form Actions</h3>
                <button 
                  onClick={() => setShowSidePanel(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#64748b'
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ height: '2px', background: '#e5e7eb' }} />
            </div>

            {/* Form Info */}
            <div style={{ 
              background: '#f8fafc',
              borderRadius: 8,
              padding: 16,
              marginBottom: 20,
              border: '1px solid #e2e8f0'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#374151', fontSize: '1rem' }}>
                📋 Form Details
              </h4>
              <div style={{ fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.5 }}>
                <div><strong>Form ID:</strong> #{form.formNo || form._id}</div>
                <div><strong>Subject:</strong> {form.subject}</div>
                <div><strong>Department:</strong> {form.department}</div>
                <div><strong>Status:</strong> 
                  <span style={{ 
                    background: statusColors[form.status?.toLowerCase?.()] || '#888',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    marginLeft: '8px'
                  }}>
                    {statusLabels[form.status?.toLowerCase()] || form.status || 'Awaiting'}
                  </span>
                </div>
                <div><strong>Submitted By:</strong> {form.submittedBy}</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '1rem' }}>
                🎯 Quick Actions
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {/* Accept button only for Principal/Manager and when not final, or HOD if subject allowed */}
                {((rolePermissions[userRole]?.accept) || ( (userRole === 'HOD' || userRole === 'hod') && canHodAccept )) && !isFinal && (
                  <button
                    onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        message: 'Are you sure you want to accept this form?',
                        onConfirm: () => {
                          setConfirmDialog({ isOpen: false });
                          handleAction('accepted');
                        }
                      });
                    }}
                    disabled={saving}
                    style={{
                      background: '#22c55e',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      padding: '10px 16px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.6 : 1
                    }}
                  >
                    ✓ Accept Form
                  </button>
                )}
                {/* Reject button for all allowed roles and when not final */}
                {rolePermissions[userRole]?.reject && !isFinal && (
                  <button
                    onClick={() => {
                      if (!remarks.trim()) {
                        toast.error('Please provide remarks when rejecting a form.');
                        return;
                      }
                      setConfirmDialog({
                        isOpen: true,
                        message: 'Are you sure you want to reject this form?',
                        onConfirm: () => {
                          setConfirmDialog({ isOpen: false });
                          handleAction('rejected');
                        }
                      });
                    }}
                    disabled={saving}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      padding: '10px 16px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.6 : 1
                    }}
                  >
                    ✗ Reject Form
                  </button>
                )}
                {/* Request Edit button for all allowed roles and when not final */}
                {rolePermissions[userRole]?.requestEdit && !isFinal && (
                  <button
                    onClick={() => {
                      if (!remarks.trim()) {
                        toast.error('Please provide remarks when requesting edits.');
                        return;
                      }
                      setConfirmDialog({
                        isOpen: true,
                        message: 'Are you sure you want to request edits for this form?',
                        onConfirm: () => {
                          setConfirmDialog({ isOpen: false });
                          handleAction('edit');
                        }
                      });
                    }}
                    disabled={saving}
                    style={{
                      background: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      padding: '10px 16px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.6 : 1
                    }}
                  >
                    ✏️ Request Edit
                  </button>
                )}

              </div>
            </div>

            {hasActed ? (() => {
              const actionText = userActions.length > 0 ? userActions[userActions.length - 1].action.toLowerCase() : '';
              let displayText = 'Action Completed';
              if (actionText.includes('forwarded to')) {
                const role = actionText.split('forwarded to')[1].trim();
                displayText = `Forwarded to ${role.charAt(0).toUpperCase() + role.slice(1)}`;
              } else if (actionText.includes('not_approved')) {
                displayText = 'Not Approved';
              } else if (actionText.includes('approved')) {
                displayText = 'Approved';
              } else if (actionText.includes('accepted')) {
                displayText = 'Accepted';
              } else if (actionText.includes('rejected')) {
                displayText = 'Rejected';
              }
              
              return (
                <div style={{ marginBottom: 20, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #d1d5db', textAlign: 'center' }}>
                  <h4 style={{ margin: 0, color: '#3b82f6', fontSize: '1rem' }}>
                    {displayText}
                  </h4>
                </div>
              );
            })() : (
              <>
                {/* Remarks Section */}
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '1rem' }}>
                    💬 Remarks
                  </h4>
                  <textarea
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="Add your remarks here..."
                    style={{
                      width: '100%',
                      minHeight: 80,
                      padding: 12,
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: '0.9rem',
                      resize: 'none',
                      fontFamily: 'inherit',
                      background: '#f8fafc'
                    }}
                    disabled={isFinal}
                  />
                </div>

                {/* Forward To Section */}
                {userRole?.toLowerCase() !== 'maintenancesection' && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '1rem' }}>
                    📤 Forward To
                  </h4>
                  
                  {(() => {
                    const nextRcv = getNextReceiver(form.category || form.subject, form.to);
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
                        {!isFinal && (
                          <button
                            onClick={() => {
                              setConfirmDialog({
                                isOpen: true,
                                message: `Are you sure you want to forward this form to ${targetOpt.label}?`,
                                onConfirm: () => {
                                  setConfirmDialog({ isOpen: false });
                                  handleAction('forward', targetOpt.value);
                                }
                              });
                            }}
                            disabled={saving}
                            style={{
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: 6,
                              padding: '8px 16px',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              opacity: saving ? 0.6 : 1,
                              marginTop: 8,
                              width: '100%'
                            }}
                          >
                            📤 Forward Form
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
                )}
              </>
            )}

            {/* Clear/Close Button */}
            <button
              onClick={() => setShowSidePanel(false)}
              style={{
                background: '#6b7280',
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
              🗑️ Close Panel
            </button>

            {error && (
              <div style={{ 
                marginTop: '12px', 
                padding: '8px', 
                borderRadius: '4px', 
                background: '#fef2f2', 
                color: '#ef4444', 
                fontSize: '0.875rem', 
                textAlign: 'center',
                border: '1px solid #fee2e2' 
              }}>
                {error}
              </div>
            )}
          </div>
        </>
      )}
      <ConfirmModal 
        isOpen={confirmDialog.isOpen} 
        message={confirmDialog.message} 
        onConfirm={confirmDialog.onConfirm} 
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} 
      />
    </>
  );
} 
