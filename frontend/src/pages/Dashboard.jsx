// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { jwtDecode } from "jwt-decode";
import axios from 'axios';
import toast from 'react-hot-toast';
import { customConfirm } from '../utils/customConfirm';
import Archive from './Archive';
import { getNextReceiver } from '../utils/hierarchy';
import { isNoDeptRole } from '../utils/roles';

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

// Actions component for better organization
function SubmissionActions({ submission, navigate, onStatusChange, onDelete, onEdit, currentUser, isValidReceiver }) {
  // Check if current user is the sender of this form
  const isSender = submission.submittedBy === currentUser?.email;
  
  // Check if current user can change status (is a valid receiver and not sender)
  const canChangeStatus = !isSender && isValidReceiver(submission);
  
  // Check if form needs editing and user is the sender
  const canEdit = isSender && submission.status === 'edit';
  
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Only show View and Delete in actions */}
      <button 
        className="view-btn"
        onClick={() => navigate(`/submission/${submission._id || submission.id}`)}
      >
        View
      </button>
      {canEdit && (
        <button 
          className="edit-btn"
          onClick={() => onEdit(submission)}
          title="Edit this form as requested"
        >
          Edit
        </button>
      )}
      <button 
        className="delete-btn"
        onClick={() => onDelete(submission._id, submission.owner, submission.status)}
        title={(submission.status !== 'awaiting' && submission.status !== 'edit') ? 'Only forms with "awaiting" or "edit" status can be deleted' : 'Delete this form'}
        disabled={submission.status !== 'awaiting' && submission.status !== 'edit'}
      >
        Delete
      </button>
    </div>
  );
}

function RoleDashboard({ userRole, submissions, navigate, setSubmissions }) {
  // Get current user info for authorization checks
  const getCurrentUserInfo = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const decoded = jwtDecode(token);
        return {
          email: decoded.email,
          role: decoded.role,
          department: decoded.department,
          year: decoded.year,
          div: decoded.div
        };
      }
    } catch (error) {
      console.error('Error decoding token:', error);
    }
    return null;
  };
  
  const currentUser = getCurrentUserInfo();
  const currentUserEmail = currentUser?.email;

  // Check if current user is a valid receiver for a form
  const isValidReceiver = (submission) => {
    if (!currentUser || !submission) return false;
    
    // Admin can view and delete forms but CANNOT change status
    if (currentUser.role === 'admin' || currentUser.role === 'Admin') {
      return false;
    }
    
    // Students cannot change status of any forms (they only submit)
    if (currentUser.role === 'Student' || currentUser.role === 'student') {
      return false;
    }
    
    // Principal can change status of forms sent to them
    if (currentUser.role === 'Principal' || currentUser.role === 'principal') {
      const toArray = Array.isArray(submission.to) ? submission.to : [submission.to];
      return toArray.includes('Principal') || toArray.includes('principal');
    }
    
    // For other roles, check if they are in the "to" field and meet criteria
    const toArray = Array.isArray(submission.to) ? submission.to : [submission.to];
    
    // Check if user's role is in the "to" array
    if (!toArray.includes(currentUser.role)) {
      return false;
    }
    
    // Additional checks based on role
    switch (currentUser.role) {
      case 'HOD':
        // HOD can only change status of forms in their department
        return submission.department === currentUser.department;
        
      case 'FacultyAdvisor':
        // Faculty Advisor can only change status of forms in their department, year, and division
        return submission.department === currentUser.department && 
               submission.year == currentUser.year && 
               submission.div === currentUser.div;
               
      case 'Faculty':
        // Faculty can change status of forms sent to them in their department
        return submission.department === currentUser.department;
        
      default:
        // For other roles, just check if they're in the "to" field
        return true;
    }
  };

  const handleStatusChange = async (formId, formType, newStatus) => {
    const submission = submissions.find(s => (s._id || s.id) === formId);
    
    if (!submission) {
      toast.error('Form not found.');
      return;
    }
    
    // Check if user is the sender
    if (submission.submittedBy === currentUserEmail) {
      toast.error('You cannot change the status of your own form. Only reviewers can change form status.');
      return;
    }
    
    // Check if user is a valid receiver of this form
    if (!isValidReceiver(submission)) {
      toast.error('You can only change the status of forms that were sent to you for review.');
      return;
    }
    
    if (await customConfirm(`Are you sure you want to change status to "${newStatus}"?`)) {
      try {
        const token = jwtDecode(localStorage.getItem('token'));
        const backendFormType = formType === 'staff' ? 'faculty' : formType;
        
        await axios.put('/updateFormRemarksStatus', {
          formId,
          formType: backendFormType,
          status: newStatus,
          by: token.role,
        });
        
        // Update the submission status in the local state
        const updatedSubmissions = submissions.map(s => {
          if ((s._id || s.id) === formId) {
            return { ...s, status: newStatus };
          }
          return s;
        });
        setSubmissions(updatedSubmissions);
        toast.success(`Status updated to ${newStatus}`);
      } catch (error) {
        console.error('Error updating status:', error);
        toast.error('Failed to update status. Please try again.');
      }
    }
  };

  const handleEditForm = (submission) => {
    // Navigate to new submission page with edit parameters
    navigate('/submission/new', { 
      state: { 
        editMode: true, 
        formData: submission,
        formId: submission._id || submission.id 
      } 
    });
  };

  const handleDeleteForm = async (formId, formType, status) => {
    // Only allow deletion of forms that are still awaiting or need editing
    if (status !== 'awaiting' && status !== 'edit') {
      toast.error('Only forms with "awaiting" or "edit" status can be deleted. Forms that are being reviewed or completed cannot be deleted.');
      return;
    }

    if (await customConfirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      try {
        // Get user info from localStorage
        const token = jwtDecode(localStorage.getItem('token'));
        const userEmail = token.email;
        const userRole = token.role;

        // Map 'staff' to 'faculty' for backend compatibility
        const backendFormType = formType === 'staff' ? 'faculty' : formType;

        await axios.delete('/deleteForm', {
          data: { formId, formType: backendFormType, userEmail, userRole }
        });
        
        // Filter out the deleted submission from the local state
        const updatedSubmissions = submissions.filter(s => (s._id || s.id) !== formId);
        setSubmissions(updatedSubmissions);
        
        toast.success('Form deleted successfully');
      } catch (error) {
        console.error('Error deleting form:', error);
        if (error.response?.status === 403) {
          toast.error('You can only delete forms you submitted or received.');
        } else if (error.response?.status === 400) {
          toast.error(error.response.data?.message || 'Only forms with "awaiting" status can be deleted.');
        } else {
          toast.error('Failed to delete form. Please try again.');
        }
      }
    }
  };
  if (userRole === 'admin' || userRole === 'Admin') {
    // Show all forms for admin
    return (
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h2>All Submissions <span className="role-badge admin">Admin</span></h2>
        </div>
        <div className="submissions-table">
          {submissions.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#888' }}>No submissions found.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Submission No</th>
                  <th>Category</th>
                  <th>Subject</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Current Reviewer</th>
                  <th>Owner</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission, idx) => (
                  <tr key={submission._id || submission.id || idx}>
                    <td>
                      <div>{submission._id || submission.id}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{submission.submittedBy}</div>
                    </td>
                    <td>#{submission.formNo || submission.id || submission._id}</td>
                    <td>{submission.category || '-'}</td>
                    <td>{submission.subject}</td>
                    <td>{submission.department}</td>
                    <td>
                      <span className={`status ${submission.status?.toLowerCase?.() || ''}`}>{submission.status}</span>
                    </td>
                    <td>{submission.createdAt ? new Date(submission.createdAt).toLocaleString() : (submission.date ? new Date(submission.date).toLocaleDateString() : '')}</td>
                    <td>{submission.currentReviewer}</td>
                    <td>{submission.owner}</td>
                    <td>
                      <SubmissionActions 
                        submission={submission}
                        navigate={navigate}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDeleteForm}
                        onEdit={handleEditForm}
                        currentUser={currentUser}
                        isValidReceiver={isValidReceiver}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  } else if (userRole === 'student' || userRole === 'Student') {
    const studentSubmissions = submissions.filter(s => s.owner === 'student');
    return (
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h2>My Submissions <span className="role-badge student">Student</span></h2>
          <div style={{ display: 'flex', gap: 12 }}>
            {/* <button 
              className="new-submission-btn"
              onClick={() => navigate('/submission/new')}
            >
              New Submission
            </button> */}
          </div>
        </div>
        <div className="submissions-table">
          {studentSubmissions.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#888' }}>No submissions found.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Submission No</th>
                  <th>Category</th>
                  <th>Subject</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Current Reviewer</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {studentSubmissions.map((submission, idx) => (
                  <tr key={submission._id || submission.id || idx}>
                    <td>#{submission.formNo || submission.id || submission._id}</td>
                    <td>{submission.category || '-'}</td>
                    <td>{submission.subject}</td>
                    <td>{submission.department}</td>
                    <td>
                      <span className={`status ${submission.status?.toLowerCase?.() || ''}`}>
                        {submission.status}
                      </span>
                    </td>
                    <td>{submission.createdAt ? new Date(submission.createdAt).toLocaleString() : (submission.date ? new Date(submission.date).toLocaleDateString() : '')}</td>
                    <td>{submission.currentReviewer}</td>
                    <td>
                      <SubmissionActions 
                        submission={submission}
                        navigate={navigate}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDeleteForm}
                        onEdit={handleEditForm}
                        currentUser={currentUser}
                        isValidReceiver={isValidReceiver}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  } else {
    const staffSubmissions = submissions.filter(s => s.owner === 'staff');
    return (
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h2>All Submissions <span className="role-badge staff">Staff</span></h2>
          <button 
            className="new-submission-btn"
            onClick={() => navigate('/submission/new')}
          >
            New Submission
          </button>
        </div>
        <div className="submissions-table">
          {staffSubmissions.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#888' }}>No submissions found.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Submission No</th>
                  <th>Category</th>
                  <th>Subject</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Current Reviewer</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffSubmissions.map((submission, idx) => (
                  <tr key={submission._id || submission.id || idx}>
                    <td>#{submission.formNo || submission.id || submission._id}</td>
                    <td>{submission.category || '-'}</td>
                    <td>{submission.subject}</td>
                    <td>{submission.department}</td>
                    <td>
                      <span className={`status ${submission.status?.toLowerCase?.() || ''}`}>
                        {submission.status}
                      </span>
                    </td>
                    <td>{submission.createdAt ? new Date(submission.createdAt).toLocaleString() : (submission.date ? new Date(submission.date).toLocaleDateString() : '')}</td>
                    <td>{submission.currentReviewer}</td>
                    <td>
                      <SubmissionActions 
                        submission={submission}
                        navigate={navigate}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDeleteForm}
                        onEdit={handleEditForm}
                        currentUser={currentUser}
                        isValidReceiver={isValidReceiver}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }
}

function Dashboard() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState();
  const [submissions, setSubmissions] = useState([]);
  const [receivedSubmissions, setReceivedSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingReceived, setLoadingReceived] = useState(true);
  const [error, setError] = useState('');
  const [errorReceived, setErrorReceived] = useState('');
  const [editRows, setEditRows] = useState({}); // { [formId]: { remarks, status, saving } }
  const [viewMode, setViewMode] = useState('current'); // 'current' or 'archived'
  const [year, setYear] = useState(''); // For Faculty Advisors
  const [div, setDiv] = useState(''); // For Faculty Advisors
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [activeSidePanelForm, setActiveSidePanelForm] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [forwardTo, setForwardTo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [tempDepartment, setTempDepartment] = useState('');
  const [dynamicDepartments, setDynamicDepartments] = useState([]);
  const [userEmail, setUserEmail] = useState('');

  // FormSidePanel component
  const FormSidePanel = ({ submission }) => {
    const nextRcv = getNextReceiver(submission.category || submission.subject, submission.to);
    const possibleReceivers = nextRcv ? [nextRcv] : ['HOD', 'Faculty', 'FacultyAdvisor', 'Principal'];
    const token = jwtDecode(localStorage.getItem('token'));
    const userRoleLower = token?.role ? token.role.toLowerCase() : '';
    const userActions = submission.history?.filter(h => h.by && h.by.toLowerCase() === userRoleLower) || [];
    const hasActed = userActions.some(h => 
      h.action.toLowerCase().includes('forwarded') || 
      ['accepted', 'approved', 'rejected', 'not_approved'].some(st => h.action.toLowerCase().includes(st))
    );

    const handleSaveAndForward = async () => {
      if (!remarks || !forwardTo) {
        toast.error('Please fill in both remarks and forward to fields');
        return;
      }

      setIsSaving(true);
      try {
        const token = jwtDecode(localStorage.getItem('token'));
        // Build the full updated `to` array by appending the new recipient
        const existingTo = Array.isArray(submission.to) ? submission.to : (submission.to ? [submission.to] : []);
        const newTo = existingTo.includes(forwardTo) ? existingTo : [...existingTo, forwardTo];

        await axios.put('/updateFormRemarksStatus', {
          formId: submission._id,
          formType: submission.owner === 'student' ? 'student' : 'faculty',
          remarks,
          status: 'forwarded',
          to: newTo,
          by: token.role,
        });
        
        setActiveSidePanelForm(null);
        setRemarks('');
        setForwardTo('');
        // Update the specific form in state — avoids full page reload
        setReceivedSubmissions(prev =>
          prev.map(f =>
            f._id === submission._id
              ? { ...f, status: 'forwarded', remarks, to: newTo }
              : f
          )
        );
        toast.success('Form forwarded successfully!');
      } catch (error) {
        console.error('Error updating form:', error);
        toast.error('Failed to update form. Please try again.');
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <>
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 40
          }}
          onClick={() => setActiveSidePanelForm(null)}
        />
        <div 
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            width: '400px',
            height: '100vh',
            background: 'white',
            boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
            padding: '24px',
            overflowY: 'auto',
            zIndex: 50
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Form Actions</h3>
              <button 
                onClick={() => setActiveSidePanelForm(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ height: '1px', background: '#e5e7eb' }} />
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
              <div style={{ padding: '20px', textAlign: 'center', color: '#3b82f6', background: '#f3f4f6', borderRadius: '8px', fontWeight: 'bold' }}>
                {displayText}
              </div>
            );
          })() : (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Add Remarks
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter your remarks..."
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    resize: 'none',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Forward To
                </label>
                <select
                  value={forwardTo}
                  onChange={(e) => setForwardTo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select recipient...</option>
                  {possibleReceivers.map(receiver => (
                    <option key={receiver} value={receiver}>{receiver}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSaveAndForward}
                disabled={isSaving || !remarks || !forwardTo}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: isSaving || !remarks || !forwardTo ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isSaving || !remarks || !forwardTo ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
              >
                {isSaving ? 'Saving...' : 'Save & Forward'}
              </button>
            </>
          )}
        </div>
      </>
    );
  };

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

  // Handler for save
  const handleSave = async (form) => {
    const formId = form._id || form.id;
    const formType = form.owner === 'student' ? 'student' : 'faculty';
    const { remarks, status } = editRows[formId] || {};
    setEditRows(prev => ({ ...prev, [formId]: { ...prev[formId], saving: true } }));
    try {
      const res = await axios.put('/updateFormRemarksStatus', {
        formId,
        formType,
        remarks,
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

  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    setLastUpdateTime(Date.now());
    window.location.reload();
  };

  useEffect(() => {
    const tokenString = localStorage.getItem('token');
    if (!tokenString) {
      navigate('/login');
      return;
    }
    let token;
    try {
      token = jwtDecode(tokenString);
    } catch {
      navigate('/login');
      return;
    }

    const initDashboard = async () => {
      try {
        // Fetch latest user data and departments list
        const [resUser, resDepts] = await Promise.all([
          axios.get(`/api/user/profile/${token.email}`),
          axios.get(`/api/departments`)
        ]);
        
        const latestUser = resUser.data;
        setDynamicDepartments(resDepts.data);
        
        const email = latestUser.email;
        const role = latestUser.role;
        const department = latestUser.department;

        setUserRole(role);
        setUserEmail(email);

        if (role === 'Admin' || role === 'admin') {
          navigate('/admin');
          return;
        }

        if (role === 'Principal' || role === 'principal') {
          navigate('/principal');
          return;
        }

        // Roles that are institution-wide and don't belong to a specific department
        if (!department && !isNoDeptRole(role)) {
          setShowDepartmentModal(true);
          setLoading(false);
          setLoadingReceived(false);
          return;
        }

        const fetchSubmissionsLocal = async () => {
          try {
            const res = await axios.get(`/getFormsForUser?email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}`);
            setSubmissions(res.data || []);
          } catch (err) {
            setError('Failed to fetch submissions');
          } finally {
            setLoading(false);
          }
        };

        const fetchReceivedLocal = async () => {
          try {
            const params = new URLSearchParams();
            params.set('role', role);
            if (department) params.set('department', department);
            params.set('email', email);
            const res = await axios.get(`/getReceivedFormsForUser?${params.toString()}`);
            const unique = res.data ? Array.from(new Map(res.data.map(f => [f._id || f.id, f])).values()) : [];
            setReceivedSubmissions(unique);
          } catch (err) {
            setErrorReceived('Failed to fetch received submissions');
          } finally {
            setLoadingReceived(false);
          }
        };

        const fetchFALocal = async () => {
          try {
            const res = await axios.get(`/getFacultyAdvisor?email=${encodeURIComponent(email)}&department=${encodeURIComponent(department)}`);
            if (res.data && res.data.length > 0) {
              const advisorData = res.data[0];
              const { year, div } = advisorData;
              setYear(year);
              setDiv(div);
              const resFA = await axios.get(`/getReceivedFormsForUser?role=${encodeURIComponent(role)}&department=${encodeURIComponent(department)}&year=${encodeURIComponent(year)}&div=${encodeURIComponent(div)}&email=${encodeURIComponent(email)}`);
              const uniqueFA = resFA.data ? Array.from(new Map(resFA.data.map(f => [f._id || f.id, f])).values()) : [];
              setReceivedSubmissions(uniqueFA);
              setLoadingReceived(false);
            } else {
              await fetchReceivedLocal();
            }
          } catch (err) {
            if (err.response?.status === 404) {
              await fetchReceivedLocal();
            } else {
              setErrorReceived('Failed to fetch advisor forms');
              setLoadingReceived(false);
            }
          }
        };

        fetchSubmissionsLocal();
        if (role === 'FacultyAdvisor') {
          fetchFALocal();
        } else {
          fetchReceivedLocal();
        }

      } catch (err) {
        console.error("Dashboard sync error", err);
        setUserRole(token.role);
        setUserEmail(token.email);
        setLoading(false);
      }
    };

    initDashboard();
  }, [navigate]);
  if (loading) {
    return <div className="dashboard-page"><div style={{ padding: 40, textAlign: 'center' }}>Loading submissions...</div></div>;
  }
  if (error) {
    return <div className="dashboard-page"><div style={{ padding: 40, textAlign: 'center', color: 'red' }}>{error}</div></div>;
  }
  return (
    <div className="dashboard-page">
      {/* View Mode Toggle and Refresh */}
      {/* View Mode Toggle and Refresh */}
      <div className="dashboard-main-header" style={{ marginBottom: '24px', maxWidth: '1280px', margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 16px 0', fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)' }}>Dashboard</h1>
      </div>
      
      <div style={{ maxWidth: '1280px', margin: '0 auto 24px auto' }}>
        <div className="view-toggle-container" style={{ display: 'inline-flex' }}>
          <button
            className={`view-toggle-btn ${viewMode === 'current' ? 'active' : ''}`}
            onClick={() => setViewMode('current')}
          >
            Current Forms
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'archived' ? 'active' : ''}`}
            onClick={() => setViewMode('archived')}
          >
            Form History
          </button>
        </div>
      </div>

      {viewMode === 'current' ? (
        <>
          {['faculty', 'facultyadvisor', 'juniorsuperintendent', 'accountssection', 'driver', 'hrsection', 'staff', 'student'].includes(userRole?.toLowerCase()) && (
            <RoleDashboard 
              userRole={userRole} 
              submissions={submissions.filter(s => !['accepted', 'approved', 'rejected', 'not_approved', 'cancelled'].includes(s.status?.toLowerCase()))} 
              navigate={navigate} 
              setSubmissions={setSubmissions} 
            />
          )}
          {userRole?.toLowerCase() !== 'student' && (() => {
            const userRoleLower = userRole ? userRole.toLowerCase() : '';
            const isFormForwardedByUser = (form) => {
              const userActions = form.history?.filter(h => h.by && h.by.toLowerCase() === userRoleLower) || [];
              return userActions.some(h => h.action.toLowerCase().includes('forwarded'));
            };

            const pendingReceivedForms = receivedSubmissions.filter(s => 
              !['accepted', 'approved', 'rejected', 'not_approved', 'cancelled'].includes(s.status?.toLowerCase()) && 
              !isFormForwardedByUser(s)
            );

            const forwardedForms = receivedSubmissions.filter(s => 
              !['accepted', 'approved', 'rejected', 'not_approved', 'cancelled'].includes(s.status?.toLowerCase()) && 
              isFormForwardedByUser(s)
            );

            return (
              <>
            <div className="dashboard-content" style={{ marginTop: 48 }}>
              <div className="dashboard-header">
                <h2 style={{ margin: 0, fontWeight: 700, fontSize: 24}}>Received Submissions</h2>
              </div>
        {loadingReceived ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Loading received submissions...</div>
        ) : errorReceived ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>{errorReceived}</div>
        ) : (
          <div className="submissions-table">
            {pendingReceivedForms.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#888' }}>No received submissions found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Submission No</th>
                    <th>Subject</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Current Reviewer</th>
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
                        <span className={`status ${submission.status?.toLowerCase?.() || ''}`}>{submission.status}</span>
                      </td>
                      <td>{submission.createdAt ? new Date(submission.createdAt).toLocaleString() : (submission.date ? new Date(submission.date).toLocaleDateString() : '')}</td>
                      <td>{submission.currentReviewer}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="view-btn"
                            onClick={() => navigate(`/received-forms/${submission._id || submission.id}`)}
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <div className="dashboard-content" style={{ marginTop: 48 }}>
        <div className="dashboard-header">
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: 24}}>Forwarded Submissions</h2>
        </div>
        {loadingReceived ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Loading forwarded submissions...</div>
        ) : errorReceived ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>{errorReceived}</div>
        ) : (
          <div className="submissions-table">
            {forwardedForms.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#888' }}>No forwarded submissions found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Submission No</th>
                    <th>Subject</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Current Reviewer</th>
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
                        <span className={`status ${submission.status?.toLowerCase?.() || ''}`}>{submission.status}</span>
                      </td>
                      <td>{submission.createdAt ? new Date(submission.createdAt).toLocaleString() : (submission.date ? new Date(submission.date).toLocaleDateString() : '')}</td>
                      <td>{submission.currentReviewer}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="view-btn"
                            onClick={() => navigate(`/received-forms/${submission._id || submission.id}`)}
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
      </>
            );
          })()}
        </>
      ) : (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.5rem', color: '#1e293b', marginBottom: '0.5rem', fontWeight: '700' }}>
              Form History
            </h1>
            <p style={{ color: '#64748b', fontSize: '1.1rem', margin: '0' }}>
              Completed forms and their final status
            </p>
          </div>
          
          <Archive />
        </div>
      )}

      {showDepartmentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '12px', width: '400px', color: 'white', border: '1px solid #334155' }}>
            <h2 style={{ marginTop: 0 }}>Welcome!</h2>
            <p style={{ color: '#94a3b8' }}>Please select your department to continue.</p>
            <select 
              value={tempDepartment} 
              onChange={e => setTempDepartment(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', marginBottom: '20px', background: '#0f172a', color: 'white', border: '1px solid #475569' }}
            >
              <option value="">Select Department</option>
              {dynamicDepartments.map(dept => (
                <option key={dept._id} value={dept.shortName}>{dept.name} ({dept.shortName})</option>
              ))}
              {/* Show defaults that aren't in dynamicDepartments */}
              {[
                { v: "CSE", n: "CSE" },
                { v: "NASB", n: "NASB" },
                { v: "ECE", n: "ECE" },
                { v: "EEE", n: "EEE" },
                { v: "ME", n: "ME" },
                { v: "CE", n: "CE" },
                { v: "AI", n: "AI" },
                { v: "CS", n: "CS" },
                { v: "MCA", n: "MCA" }
              ].filter(d => !dynamicDepartments.some(dyn => dyn.shortName === d.v)).map(d => (
                <option key={d.v} value={d.v}>{d.n}</option>
              ))}
            </select>
            <button 
              onClick={async () => {
                if (!tempDepartment) return alert("Please select a department");
                try {
                  const res = await axios.put('/updateMyDepartment', { email: userEmail, department: tempDepartment });
                  localStorage.setItem('token', res.data.token);
                  setShowDepartmentModal(false);
                  window.location.reload();
                } catch (err) {
                  alert("Failed to update department");
                }
              }}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Save Department
            </button>
          </div>
        </div>
      )}
      
      {activeSidePanelForm && <FormSidePanel submission={activeSidePanelForm} />}
    </div>
  );
}

export default Dashboard;
