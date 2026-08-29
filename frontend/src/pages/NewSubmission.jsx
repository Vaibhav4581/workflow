import { ROLES, isRole, isNoDeptRole } from '../utils/roles';
// frontend/src/pages/NewSubmission.jsx
import React, { useState, useEffect, useRef } from 'react';
import './NewSubmission.css';
import { jsPDF } from 'jspdf';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { CheckBoxOutlineBlank, CheckBox } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';
import { DOCUMENT_TYPES, getNextReceiver, canOriginate } from '../utils/hierarchy';
import { generateOfficialPdf } from '../utils/pdfGenerator';

const initialStateStudent = {
  category: '',
  subject: '',
  subjectElaboration: '',
  department: '',
  to: ['FacultyAdvisor'],
  toOthers: '',
  purpose: [],
  purposeOthers: '',
  details: '',
  remarks: '',
  additionalRemarks: '',
};

const initialStateStaff = {
  category: '',
  subject: '',
  subjectElaboration: '',
  department: '',
  to: [],
  toOthers: '',
  purpose: [],
  purposeOthers: '',
  details: '',
  remarks: '',
  additionalRemarks: '',
  actions: [],
};

const TO_OPTIONS_STAFF = [
  { label: 'Head of Department (HoD)', value: 'HOD' },
  { label: 'Principal', value: 'Principal' },
  { label: 'Manager', value: 'Manager' },
  { label: 'Committee Convenor', value: 'Committee' },
  { label: 'Secretary', value: 'Secretary' },
];

const TO_OPTIONS_STUDENT = [
  { label: 'Faculty Advisor', value: 'FacultyAdvisor' },
  { label: 'Head of Department (HoD)', value: 'HOD' },
  { label: 'Principal', value: 'Principal' },
  { label: 'Manager', value: 'Manager' },
];

const PURPOSE_OPTIONS = [
  { label: 'Approval for event / activity', value: 'event' },
  { label: 'Advance payment request', value: 'advance' },
  { label: 'Final payment settlement', value: 'final' },
  { label: 'Resource / budget allocation', value: 'resource' },
];

const ACTION_OPTIONS = [
  { label: 'Forwarded to higher authority with remarks', value: 'forwarded' },
  { label: 'Returned to lower level with remarks', value: 'returned-lower' },
  { label: 'Returned to originator with comments', value: 'returned-originator' },
  { label: 'Approved for Advance Payment', value: 'approved-advance' },
  { label: 'Settlement of Payment', value: 'settlement' },
];

const DEPARTMENT_OPTIONS = [
  { name: 'Computer Science and Engineering', short: 'CSE' },
  { name: 'Naval Architect and Ship Building', short: 'NASB' },
  { name: 'Electronics and Communication', short: 'ECE' },
  { name: 'Electrical and Electronics Engineering', short: 'EEE' },
  { name: 'Mechanical Engineering', short: 'ME' },
  { name: 'Civil Engineering', short: 'CE' },
  { name: 'Artificial Intelligence', short: 'AI' },
  { name: 'Cyber Security', short: 'CS' },
  { name: 'Master of Computer Applications', short: 'MCA' },
];

// ─────────────────────────────────────────────────────────────────────────────
function NewSubmission() {
  const navigate = useNavigate();
  const location = useLocation();

  const editMode         = location.state?.editMode   || false;
  const existingFormData = location.state?.formData   || null;
  const editFormId       = location.state?.formId     || null;

  const [userRole, setUserRole] = useState();
  const [userDepartment, setUserDepartment] = useState('');
  const [formStudent, setFormStudent] = useState({ ...initialStateStudent });
  const [formStaff,   setFormStaff]   = useState({ ...initialStateStaff });

  const today        = new Date().toISOString().slice(0, 10);
  const submissionNo = editMode ? (existingFormData?.formNo || '001/2025') : '001/2025';
  const formRef      = useRef();

  const [attachmentsStudent, setAttachmentsStudent] = useState([]);
  const [attachmentsStaff,   setAttachmentsStaff]   = useState([]);
  const [dynamicCategories,  setDynamicCategories]  = useState([]);
  const [dynamicDepartments, setDynamicDepartments] = useState([]);


  // ── Fetch dynamic configs ────────────────────────────────────────────────
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const [resDept] = await Promise.all([
          axios.get('/api/departments'),
        ]);
        // Category filtering is now handled in a separate useEffect that depends on userRole
        setDynamicDepartments(resDept.data.map(d => ({ name: d.name, short: d.shortName })));
      } catch (err) {
        console.error('Failed to fetch dynamic configs', err);
      }
    };
    fetchConfigs();
  }, []);

  // ── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const tokenStr = localStorage.getItem('token');
      if (!tokenStr) { navigate('/login'); return; }
      const token = jwtDecode(tokenStr);
      
      const role = token.role?.toLowerCase() || '';
      const allowedOriginators = ['faculty', 'facultyadvisor', 'juniorsuperintendent', 'accountssection', 'driver', 'hrsection', 'staff', 'student'];
      
      if (!allowedOriginators.includes(role)) {
        toast.error('You do not have permission to create new submissions.');
        navigate('/dashboard');
        return;
      }
      
      setUserRole(token.role);
      const dept = token.department || localStorage.getItem('userDepartment') || '';
      setUserDepartment(dept);

      if (dept) {
        setFormStaff(p => ({ ...p, department: dept }));
        setFormStudent(p => ({ ...p, department: dept }));
      }

      // Roles that are institution-wide and don't need a department on the form
      if (isNoDeptRole(token.role)) {
        setFormStaff(p => ({ ...p, department: '' }));
      }
    } catch (err) {
      console.error('Invalid token');
      navigate('/login');
    }
  }, [navigate]);

  // Update categories whenever userRole changes
  useEffect(() => {
    if (userRole) {
      const allowedTypes = DOCUMENT_TYPES.filter(type => canOriginate(type, userRole));
      setDynamicCategories(allowedTypes.map(c => ({ label: c, value: c })));
    } else {
      // Fallback: show none if no role
      setDynamicCategories([]);
    }
  }, [userRole]);

  // ── Edit-mode prefill ────────────────────────────────────────────────────
  useEffect(() => {
    if (!editMode || !existingFormData) return;
    const toArr = Array.isArray(existingFormData.to) ? existingFormData.to : [existingFormData.to];
    const base = {
      category:           existingFormData.category           || '',
      subject:            existingFormData.subject            || '',
      subjectElaboration: existingFormData.subjectElaboration || '',
      department:         existingFormData.department         || '',
      to:                 toArr,
      toOthers:           existingFormData.others             || '',
      details:            existingFormData.details            || '',
      additionalRemarks:  '',
    };
    if (existingFormData.owner === 'student') setFormStudent(prev => ({ ...prev, ...base }));
    else                                      setFormStaff(prev   => ({ ...prev, ...base }));
  }, [editMode, existingFormData]);

  useEffect(() => {
    if (editMode) return;
    const opts = TO_OPTIONS_STAFF.filter(opt => {
      if (['FacultyAdvisor', 'facultyadvisor'].includes(userRole)) return opt.value === 'HOD';
      if (['HOD', 'hod'].includes(userRole)) return opt.value === 'Principal';
      return true;
    });
    if (opts.length === 1 && (!formStaff.to || formStaff.to.length === 0 || formStaff.to[0] !== opts[0].value)) {
      setFormStaff(p => ({ ...p, to: [opts[0].value] }));
    }
  }, [userRole, editMode, formStaff.to]);

  // ── File helpers ─────────────────────────────────────────────────────────
  const toBase64 = file =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.readAsDataURL(file);
      r.onload  = () => resolve(r.result);
      r.onerror = reject;
    });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleChangeStudent = e => setFormStudent(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleChangeStaff   = e => setFormStaff(p   => ({ ...p, [e.target.name]: e.target.value }));

  const handleAttachmentStudent = e => {
    const valid = Array.from(e.target.files).filter(f => f.size <= 10 * 1024 * 1024);
    if (valid.length < e.target.files.length) alert('Some files exceed 10 MB and were ignored.');
    setAttachmentsStudent(prev => [...prev, ...valid]);
    e.target.value = null;
  };
  const handleAttachmentStaff = e => {
    const valid = Array.from(e.target.files).filter(f => f.size <= 10 * 1024 * 1024);
    if (valid.length < e.target.files.length) alert('Some files exceed 10 MB and were ignored.');
    setAttachmentsStaff(prev => [...prev, ...valid]);
    e.target.value = null;
  };

  const removeAttachmentStudent = index => {
    setAttachmentsStudent(prev => prev.filter((_, i) => i !== index));
  };
  const removeAttachmentStaff = index => {
    setAttachmentsStaff(prev => prev.filter((_, i) => i !== index));
  };

  const handleStudentToChange = (_, value) => setFormStudent(p => ({ ...p, to: value ? [value.value] : [] }));
  const handleStaffToChange   = (_, value) => setFormStaff(p   => ({ ...p, to: value ? [value.value] : [] }));

  // ── Submit helpers ────────────────────────────────────────────────────────
  const buildAttachments = async files =>
    Promise.all(
      files.map(async f => ({
        file:     (await toBase64(f)).split(',')[1],
        filename: f.name,
        mimetype: f.type,
      }))
    );

  const handleSubmitStudent = async e => {
    e.preventDefault();
    try {
      const token = jwtDecode(localStorage.getItem('token'));
      const attachments = await buildAttachments(attachmentsStudent);
      const finalTo = [formStudent.category ? (getNextReceiver(formStudent.category) || 'FacultyAdvisor') : 'FacultyAdvisor'];
      if (editMode && editFormId) {
        await axios.put('/updateFormRemarksStatus', {
          formId: editFormId, formType: 'student', status: 'awaiting',
          remarks: formStudent.additionalRemarks || 'Updated by student', by: token.email,
          department: formStudent.department,
          details: formStudent.details,
          attachments,
          others: formStudent.toOthers
        });
        toast.success('Form remarks updated and resubmitted successfully!');
      } else {
        await axios.post('/studentFormSubmission', JSON.stringify({
          date: today, to: finalTo, category: formStudent.category,
          subject: formStudent.subject, subjectElaboration: formStudent.subjectElaboration,
          others: formStudent.toOthers, department: formStudent.department,
          details: formStudent.details, submittedBy: token.email,
          attachments, year: token.year, div: token.div,
        }), { headers: { 'Content-Type': 'application/json' } });
        toast.success('Submitted successfully');
      }
      navigate('/dashboard');
    } catch (err) { toast.error('Submission failed. Please try again.'); console.error(err); }
  };

  const handleSubmitStaff = async e => {
    e.preventDefault();
    try {
      const token = jwtDecode(localStorage.getItem('token'));
      const attachments = await buildAttachments(attachmentsStaff);
      const finalTo = [formStaff.category ? (getNextReceiver(formStaff.category) || 'HOD') : 'HOD'];
      if (editMode && editFormId) {
        await axios.put('/updateFormRemarksStatus', {
          formId: editFormId, formType: 'faculty', status: 'awaiting',
          remarks: formStaff.additionalRemarks || 'Updated by faculty', by: token.email,
          department: formStaff.department,
          details: formStaff.details,
          attachments,
          others: formStaff.toOthers
        });
        toast.success('Form remarks updated and resubmitted successfully!');
      } else {
        await axios.post('/facultyFormSubmission', JSON.stringify({
          date: today, to: finalTo, category: formStaff.category,
          subject: formStaff.subject, subjectElaboration: formStaff.subjectElaboration,
          others: formStaff.toOthers, department: formStaff.department,
          details: formStaff.details, submittedBy: token.email, attachments,
        }), { headers: { 'Content-Type': 'application/json' } });
        toast.success('Submitted successfully');
      }
      navigate('/dashboard');
    } catch (err) { toast.error('Submission failed. Please try again.'); console.error(err); }
  };

  // ── Label helpers ─────────────────────────────────────────────────────────
  const getDeptLong = short => {
    const all = [...dynamicDepartments, ...DEPARTMENT_OPTIONS.map(d => ({ name: d.name, short: d.short }))];
    const found = all.find(d => d.short === short);
    return found ? `${found.name} (${found.short})` : short;
  };

  const getRecipientLabels = (toArr, toOthers, isStudent) => {
    const opts = isStudent ? TO_OPTIONS_STUDENT : TO_OPTIONS_STAFF;
    const labels = toArr.map(v => opts.find(o => o.value === v)?.label || v);
    if (toOthers?.trim()) labels.push(toOthers);
    return labels.join(', ');
  };

  const handlePrintPDF = async () => {
    const form        = isRole(userRole, ROLES.STUDENT) ? formStudent : formStaff;
    const attachments = isRole(userRole, ROLES.STUDENT) ? attachmentsStudent : attachmentsStaff;
    const isStudent   = isRole(userRole, ROLES.STUDENT);

    const submissionData = {
      ...form,
      formNo: submissionNo,
      date: today,
      owner: isStudent ? 'student' : 'staff',
      role: userRole,
      submittedBy: localStorage.getItem('userEmail') || '',
      submitterName: localStorage.getItem('userName') || '',
      attachments: attachments
    };

    try {
      await generateOfficialPdf(submissionData);
    } catch (e) {
      console.error('Error generating PDF:', e);
      toast.error('Failed to generate PDF');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM JSX
  // ═══════════════════════════════════════════════════════════════════════════
  
  const availableStaffToOptions = TO_OPTIONS_STAFF.filter(opt => {
    if (['FacultyAdvisor', 'facultyadvisor'].includes(userRole)) return opt.value === 'HOD';
    if (['HOD', 'hod'].includes(userRole)) return opt.value === 'Principal';
    return true;
  });

  const deptOptions = (
    <>
      <option value="" disabled>Select department</option>
      {dynamicDepartments.map((d, i) => (
        <option key={`dyn-${i}`} value={d.short}>{d.name} ({d.short})</option>
      ))}
      {DEPARTMENT_OPTIONS
        .filter(d => !dynamicDepartments.some(dd => dd.short === d.short))
        .map((d, i) => (
          <option key={`def-${i}`} value={d.short}>{d.name} ({d.short})</option>
        ))}
    </>
  );

  const categoryOptions = (
    <>
      <option value="" disabled>Select category</option>
      {dynamicCategories.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
      <option value="other">Other</option>
    </>
  );

  const studentForm = (
    <form className="submission-card" onSubmit={handleSubmitStudent} ref={formRef}>
      <h2 className="form-title">{editMode ? 'EDIT SUBMISSION Student' : 'SUBMISSION Student'}</h2>
      <div className="form-meta-row">
        <div><label>No:</label><input type="text" value={submissionNo} readOnly /></div>
        <div><label>Date:</label><input type="date" value={today} readOnly /></div>
      </div>

      <div className="form-row">
        <label>Category</label>
        <select name="category" value={formStudent.category} onChange={handleChangeStudent}
          className="subject-input" required disabled={editMode}>{categoryOptions}</select>
        {formStudent.category === 'other' && (
          <input type="text" name="categoryOther" value={formStudent.categoryOther || ''}
            onChange={handleChangeStudent} className="long-input" placeholder="Enter custom category"
            required disabled={editMode} />
        )}
      </div>

      <div className="form-row">
        <label>Subject</label>
        <textarea name="subject" value={formStudent.subject} onChange={handleChangeStudent}
          rows={2} className="long-input" placeholder="Enter the subject" required disabled={editMode} style={{ resize: 'none' }} />
      </div>

      <div className="form-row">
        <label>To:</label>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {(() => {
            const nextRcv = formStudent.category ? (getNextReceiver(formStudent.category) || 'FacultyAdvisor') : 'FacultyAdvisor';
            return (
              <>
                <input type="text" value={nextRcv} disabled className="long-input" />
                <input type="hidden" name="to" value={nextRcv} />
              </>
            );
          })()}
        </div>
      </div>


      <div className="form-row">
        <label>Department</label>
        {userDepartment ? (
          <>
            <input 
              type="text" 
              value={getDeptLong(userDepartment)} 
              disabled 
              className="long-input" 
              style={{ background: '#f8fafc', color: '#334155', cursor: 'not-allowed' }}
            />
            <input type="hidden" name="department" value={formStudent.department || userDepartment} />
          </>
        ) : (
          <select name="department" value={formStudent.department}
            onChange={e => setFormStudent(p => ({ ...p, department: e.target.value }))}
            className="long-input" required>{deptOptions}</select>
        )}
      </div>

      <div className="form-row">
        <label>Details of Submission:</label>
        <textarea name="details" value={formStudent.details} onChange={handleChangeStudent}
          rows={3} className="long-input" required />
      </div>

      <div className="form-row" style={{ alignItems: 'flex-start' }}>
        <label>Attachments (Max 10MB per file)</label>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="file" multiple onChange={handleAttachmentStudent} disabled={editMode} className="file-input" />
          {attachmentsStudent.length > 0 && (
            <div className="attachment-list">
              {attachmentsStudent.map((f, i) => (
                <div key={i} className="attachment-item">
                  <span>{f.name}</span>
                  {!editMode && (
                    <button type="button" className="remove-attachment-btn" onClick={() => removeAttachmentStudent(i)} title="Remove attachment">
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editMode && (
        <div className="form-row">
          <label>Additional Remarks / Corrections</label>
          <textarea name="additionalRemarks" value={formStudent.additionalRemarks}
            onChange={handleChangeStudent} rows={4} className="long-input"
            placeholder="Enter any additional remarks or corrections" required />
        </div>
      )}

      <div className="form-row form-btn-row">
        <button type="submit" className="submit-btn">{editMode ? 'Update & Resubmit' : 'Submit'}</button>
        <button type="button" className="cancel-btn" onClick={() => window.history.back()}>Cancel</button>
        <button type="button" className="print-btn" onClick={handlePrintPDF}>Print as PDF</button>
      </div>
    </form>
  );

  const staffForm = (
    <form className="submission-card" onSubmit={handleSubmitStaff} ref={formRef}>
      <h2 className="form-title">{editMode ? 'EDIT SUBMISSION' : 'SUBMISSION'}</h2>
      <div className="form-meta-row">
        <div><label>No:</label><input type="text" value={submissionNo} readOnly /></div>
        <div><label>Date:</label><input type="date" value={today} readOnly /></div>
      </div>

      <div className="form-row">
        <label>Category</label>
        <select name="category" value={formStaff.category} onChange={handleChangeStaff}
          className="subject-input" required disabled={editMode}>{categoryOptions}</select>
        {formStaff.category === 'other' && (
          <input type="text" name="categoryOther" value={formStaff.categoryOther || ''}
            onChange={handleChangeStaff} className="long-input" placeholder="Enter custom category"
            required disabled={editMode} />
        )}
      </div>

      <div className="form-row">
        <label>Subject</label>
        <textarea name="subject" value={formStaff.subject} onChange={handleChangeStaff}
          rows={2} className="long-input" placeholder="Enter the subject" required disabled={editMode} style={{ resize: 'none' }} />
      </div>

      <div className="form-row">
        <label>To:</label>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {(() => {
            const nextRcv = formStaff.category ? (getNextReceiver(formStaff.category) || 'HOD') : 'HOD';
            return (
              <>
                <input type="text" value={nextRcv} disabled className="long-input" />
                <input type="hidden" name="to" value={nextRcv} />
              </>
            );
          })()}
        </div>
      </div>


      {/* Hide department field for roles that are institution-wide */}
      {!isNoDeptRole(userRole) && (
        <div className="form-row">
          <label>Department</label>
          {userDepartment ? (
            <>
              <input 
                type="text" 
                value={getDeptLong(userDepartment)} 
                disabled 
                className="long-input" 
                style={{ background: '#f8fafc', color: '#334155', cursor: 'not-allowed' }}
              />
              <input type="hidden" name="department" value={formStaff.department || userDepartment} />
            </>
          ) : (
            <select name="department" value={formStaff.department}
              onChange={e => setFormStaff(p => ({ ...p, department: e.target.value }))}
              className="long-input" required>{deptOptions}</select>
          )}
        </div>
      )}

      <div className="form-row">
        <label>Details of Submission:</label>
        <textarea name="details" value={formStaff.details} onChange={handleChangeStaff}
          rows={3} className="long-input" required />
      </div>

      <div className="form-row" style={{ alignItems: 'flex-start' }}>
        <label>Attachments (Max 10MB per file)</label>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="file" multiple onChange={handleAttachmentStaff} disabled={editMode} className="file-input" />
          {attachmentsStaff.length > 0 && (
            <div className="attachment-list">
              {attachmentsStaff.map((f, i) => (
                <div key={i} className="attachment-item">
                  <span>{f.name}</span>
                  {!editMode && (
                    <button type="button" className="remove-attachment-btn" onClick={() => removeAttachmentStaff(i)} title="Remove attachment">
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editMode && (
        <div className="form-row">
          <label>Additional Remarks / Corrections</label>
          <textarea name="additionalRemarks" value={formStaff.additionalRemarks}
            onChange={handleChangeStaff} rows={4} className="long-input"
            placeholder="Enter any additional remarks or corrections" required />
        </div>
      )}

      <div className="form-row form-btn-row">
        <button type="submit" className="submit-btn">{editMode ? 'Update & Resubmit' : 'Submit'}</button>
        <button type="button" className="cancel-btn" onClick={() => window.history.back()}>Cancel</button>
        <button type="button" className="print-btn" onClick={handlePrintPDF}>Print as PDF</button>
      </div>
    </form>
  );

  return (
    <div className="submission-outer">
      <h1 className="submission-main-title">
        {editMode ? 'Edit Form Submission' : 'Submission and Approval'}
      </h1>
      {isRole(userRole, ROLES.STUDENT) ? studentForm : staffForm}
    </div>
  );
}

export default NewSubmission;
