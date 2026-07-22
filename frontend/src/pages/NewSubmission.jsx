import { ROLES, isRole } from '../utils/roles';
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
          date: today, to: formStudent.to, category: formStudent.category,
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
          date: today, to: formStaff.to, category: formStaff.category,
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

  // ── Helper: load image URL → base64 via canvas with dimensions ───────────
  const loadImageAsBase64 = (url) =>
    new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        resolve({ data: c.toDataURL('image/jpeg'), w: img.width, h: img.height });
      };
      img.onerror = reject;
      img.src = url;
    });

  // ── Minimal, structured official-letter PDF ───────────────────────────
  const handlePrintPDF = async () => {
    const form        = isRole(userRole, ROLES.STUDENT) ? formStudent : formStaff;
    const attachments = isRole(userRole, ROLES.STUDENT) ? attachmentsStudent : attachmentsStaff;
    const isStudent   = isRole(userRole, ROLES.STUDENT);

    const doc   = new jsPDF('p', 'mm', 'a4');
    const pageW = 210;
    const pageH = 297;
    const L     = 20;
    const R     = pageW - 20;
    const W     = R - L;

    /* ── HEADER ─────────────────────────────────────────────────────────── */
    let y = 15;

    try {
      // Use the website logo instead of the old one
      const logo = await loadImageAsBase64('/sngce.jpg');
      const aspect = logo.w / logo.h;
      
      let logoW, logoH;
      if (aspect > 2) {
        // Banner style
        logoW = 80;
        logoH = 80 / aspect;
        doc.addImage(logo.data, 'JPEG', pageW / 2 - logoW / 2, y, logoW, logoH);
        y += logoH + 6;
      } else {
        // Square or slight rectangle style
        logoH = 22;
        logoW = 22 * aspect;
        doc.addImage(logo.data, 'JPEG', pageW / 2 - logoW / 2, y, logoW, logoH);
        y += logoH + 6;
      }
    } catch (e) {
      // Fallback
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(26, 20, 100);
      doc.text('SNGCE', pageW / 2, y + 10, { align: 'center' });
      y += 20;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Sree Narayana Gurukulam College of Engineering', pageW / 2, y, { align: 'center' });
    y += 4;
    doc.setFontSize(8);
    doc.text('www.sngce.ac.in', pageW / 2, y, { align: 'center' });
    y += 6;

    // Elegant thin double line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(L, y, R, y);
    doc.setLineWidth(0.15);
    doc.line(L, y + 1.2, R, y + 1.2);
    y += 10;

    /* ── DOCUMENT TITLE & METADATA ──────────────────────────────────────── */
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('OFFICIAL SUBMISSION FORM', pageW / 2, y, { align: 'center' });
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    
    // Left: Ref No
    doc.setFont('helvetica', 'bold');
    doc.text('Ref No:', L, y);
    doc.setFont('helvetica', 'normal');
    doc.text(submissionNo, L + 14, y);
    
    // Right: Date
    doc.setFont('helvetica', 'bold');
    doc.text('Date:', R - 25, y);
    doc.setFont('helvetica', 'normal');
    doc.text(today, R - 15, y);
    y += 6;

    // Divider
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(L, y, R, y);
    y += 8;

    /* ── TO & FROM SECTIONS ─────────────────────────────────────────────── */
    const recipientLabel = getRecipientLabels(form.to, form.toOthers, isStudent);
    const userName  = localStorage.getItem('userName')  || '';
    const userEmail = localStorage.getItem('userEmail') || '';
    const userDept  = form.department ? `Dept. of ${getDeptLong(form.department)}` : '';

    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    
    // "To" section
    doc.setFont('helvetica', 'bold');
    doc.text('To,', L, y);
    doc.setFont('helvetica', 'normal');
    const recipLines = doc.splitTextToSize(recipientLabel, (W / 2) - 15);
    doc.text(recipLines, L + 10, y + 5);

    // "From" section
    doc.setFont('helvetica', 'bold');
    doc.text('From,', pageW / 2, y);
    doc.setFont('helvetica', 'normal');
    doc.text(userName, pageW / 2 + 12, y + 5);
    if (userEmail) doc.text(userEmail, pageW / 2 + 12, y + 10);
    if (userDept)  doc.text(userDept, pageW / 2 + 12, y + 15);

    y += Math.max(recipLines.length * 5, 15) + 12;

    /* ── SUBJECT & CATEGORY ─────────────────────────────────────────────── */
    // Add a light background box for the subject
    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(230, 233, 236);
    doc.setLineWidth(0.2);
    
    const subjectLines = doc.splitTextToSize(`Subject: ${form.subject || ''}`, W - 10);
    const boxH = subjectLines.length * 6 + 10;
    
    doc.roundedRect(L, y, W, boxH, 2, 2, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text(subjectLines, L + 5, y + 8);
    
    y += boxH + 8;

    /* ── BODY ───────────────────────────────────────────────────────────── */
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text('Respected Sir / Madam,', L, y);
    y += 8;

    const bodyLines = doc.splitTextToSize(form.details || '', W);
    // Render body with slightly increased line height for professional look
    bodyLines.forEach(line => {
      doc.text(line, L, y);
      y += 6;
    });
    
    y += 4;

    if (form.subjectElaboration) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(80, 80, 80);
      const elaLines = doc.splitTextToSize(`Additional Details: ${form.subjectElaboration}`, W);
      elaLines.forEach(line => {
        doc.text(line, L, y);
        y += 5.5;
      });
      doc.setFont('helvetica', 'normal');
      y += 6;
    }

    if (attachments.length > 0) {
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text('Enclosures Attached:', L, y);
      doc.setFont('helvetica', 'normal');
      attachments.forEach((f, i) => { 
        y += 5; 
        doc.text(`• ${f.name}`, L + 5, y); 
      });
      y += 10;
    }

    /* ── SIGNATURE & OFFICIAL USE SECTION ──────────────────────────────── */
    // Ensure we have enough space on the page for signatures (at least 60mm)
    if (pageH - y < 60) {
      doc.addPage();
      y = 20;
    } else {
      y += 15;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text('Yours faithfully,', L, y);
    y += 18;

    // Applicant Signature line
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.2);
    doc.line(L, y, L + 50, y);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(userName, L, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    doc.text('(Signature of Applicant)', L, y + 10);

    // Official use box (bottom right)
    const boxWidth = 75;
    const boxX = R - boxWidth;
    const boxY = y - 25;
    
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.3);
    doc.roundedRect(boxX, boxY, boxWidth, 42, 2, 2);
    
    // Box header
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(boxX, boxY, boxWidth, 8, 2, 2, 'FD');
    
    // Fix lower corners of the header to merge seamlessly
    doc.rect(boxX, boxY + 6, boxWidth, 2, 'F');
    doc.line(boxX, boxY + 8, boxX + boxWidth, boxY + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text('FOR OFFICIAL USE ONLY', boxX + boxWidth / 2, boxY + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text('Received Date:', boxX + 4, boxY + 14);
    doc.text('Processed By:', boxX + 4, boxY + 22);
    doc.text('Status / Remarks:', boxX + 4, boxY + 30);
    
    // Lines inside box
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    doc.line(boxX + 28, boxY + 14, boxX + boxWidth - 4, boxY + 14);
    doc.line(boxX + 26, boxY + 22, boxX + boxWidth - 4, boxY + 22);
    doc.line(boxX + 4, boxY + 38, boxX + boxWidth - 4, boxY + 38);

    /* ── FOOTER ─────────────────────────────────────────────────────────── */
    doc.setFillColor(26, 20, 100);
    doc.rect(0, pageH - 11, pageW, 11, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(200, 200, 255);
    doc.text(
      'SNGCE – St. George College of Engineering  ·  www.sngce.ac.in',
      pageW / 2, pageH - 4.5, { align: 'center' }
    );

    /* ── ATTACHMENT PAGES ────────────────────────────────────────────────── */
    const att = attachments[0];
    if (att && att.type.startsWith('image/')) {
      doc.addPage();
      const imgURL = URL.createObjectURL(att);
      const img    = new window.Image();
      img.src      = imgURL;
      await new Promise(r => { img.onload = r; });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const ratio = Math.min((pw - 30) / img.width, (ph - 40) / img.height);
      const iw = img.width * ratio;
      const ih = img.height * ratio;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text('Attachment', pw / 2, 16, { align: 'center' });
      doc.setDrawColor(190, 190, 190);
      doc.line(L, 19, R, 19);
      doc.addImage(img, att.type === 'image/png' ? 'PNG' : 'JPEG', (pw - iw) / 2, 24, iw, ih);
      URL.revokeObjectURL(imgURL);
    } else if (att && att.type === 'application/pdf') {
      doc.addPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`Attachment: ${att.name}`, L, 30);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('(PDF file — please attach separately)', L, 38);
    }

    doc.save(`SNGCE_Submission_${submissionNo.replace(/\//g, '_')}.pdf`);
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
        <label>Others:</label>
        <input type="text" name="toOthers" value={formStudent.toOthers}
          onChange={handleChangeStudent} className="long-input" />
      </div>

      <div className="form-row">
        <label>Department</label>
        <select name="department" value={formStudent.department}
          onChange={e => setFormStudent(p => ({ ...p, department: e.target.value }))}
          className="long-input" required>{deptOptions}</select>
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

      <div className="form-row">
        <label>Others:</label>
        <input type="text" name="toOthers" value={formStaff.toOthers}
          onChange={handleChangeStaff} className="long-input" />
      </div>

      <div className="form-row">
        <label>Department</label>
        <select name="department" value={formStaff.department}
          onChange={e => setFormStaff(p => ({ ...p, department: e.target.value }))}
          className="long-input" required>{deptOptions}</select>
      </div>

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
