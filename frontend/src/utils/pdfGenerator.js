import { jsPDF } from 'jspdf';
import { DOCUMENT_HIERARCHIES, getDocumentTypeKey } from './hierarchy';

export const ROLE_DISPLAY_NAMES = {
  'HOD': 'HoD',
  'hod': 'HoD',
  'Principal': 'Principal',
  'principal': 'Principal',
  'JuniorSuperintendent': 'JuniorSuperintendent',
  'juniorsuperintendent': 'JuniorSuperintendent',
  'CFO': 'ChiefFinancialOfficer',
  'cfo': 'ChiefFinancialOfficer',
  'Manager': 'Manager',
  'manager': 'Manager',
  'AO': 'AdministrativeOfficer',
  'ao': 'AdministrativeOfficer',
  'VicePrincipal': 'VicePrincipal',
  'viceprincipal': 'VicePrincipal',
  'CollegeCouncil': 'CollegeCouncil',
  'collegecouncil': 'CollegeCouncil',
  'MaintenanceSection': 'MaintenanceSection',
  'maintenancesection': 'MaintenanceSection',
  'TransportinCharge': 'TransportinCharge',
  'transportincharge': 'TransportinCharge',
  'FacultyAdvisor': 'FacultyAdvisor',
  'facultyadvisor': 'FacultyAdvisor',
  'Faculty': 'Faculty',
  'faculty': 'Faculty',
  'Driver': 'Driver',
  'driver': 'Driver',
  'AccountsSection': 'AccountsSection',
  'accountssection': 'AccountsSection',
  'HRSection': 'HRSection',
  'hrsection': 'HRSection',
  'Student': 'Student',
  'student': 'Student',
};

export const getDeptLong = (short) => {
  const map = {
    'ce': 'Civil Engineering',
    'cse': 'Computer Science & Engineering',
    'me': 'Mechanical Engineering',
    'ece': 'Electronics & Communication',
    'eee': 'Electrical & Electronics Engineering',
    'mca': 'MCA',
    'mss': 'Management Studies',
    'sbhs': 'Science & Humanities',
    'ai': 'Artificial Intelligence',
    'cs': 'Cyber Security',
    'nasb': 'Naval Architect & Ship Building',
    'na': 'Not Applicable'
  };
  return map[short?.toLowerCase()] || short;
};

export const generateOfficialPdf = async (submission) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const pageH = 297;
  const L = 20;
  const R = pageW - 20;
  const W = R - L;

  // 1. Top-Right Reference Box: "No:  /2026" & "Date:  "
  const refBoxW = 42;
  const refBoxH = 14;
  const refBoxX = R - refBoxW;
  const refBoxY = 12;

  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.25);
  doc.rect(refBoxX, refBoxY, refBoxW, refBoxH);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);

  const currentYear = new Date().getFullYear();
  const formNumber = submission.formNo ? String(submission.formNo) : '';
  const dateValue = submission.createdAt
    ? new Date(submission.createdAt).toLocaleDateString('en-GB')
    : (submission.date ? (typeof submission.date === 'string' && submission.date.includes('-') ? submission.date : new Date(submission.date).toLocaleDateString('en-GB')) : '');

  doc.text(`No:`, refBoxX + 2.5, refBoxY + 5.5);
  if (formNumber) {
    doc.setFont('helvetica', 'bold');
    doc.text(formNumber, refBoxX + 10, refBoxY + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`/${currentYear}`, refBoxX + 10 + (formNumber.length * 2.2), refBoxY + 5.5);
  } else {
    doc.text(`        /${currentYear}`, refBoxX + 10, refBoxY + 5.5);
  }

  doc.text(`Date:`, refBoxX + 2.5, refBoxY + 11);
  if (dateValue) {
    doc.setFont('helvetica', 'bold');
    doc.text(dateValue, refBoxX + 11, refBoxY + 11);
    doc.setFont('helvetica', 'normal');
  }

  // 2. Centered Title: SUBMISSION (underlined)
  let y = 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  const titleText = 'SUBMISSION';
  doc.text(titleText, pageW / 2, y, { align: 'center' });
  const titleW = doc.getTextWidth(titleText);
  doc.setLineWidth(0.4);
  doc.line(pageW / 2 - titleW / 2, y + 1.2, pageW / 2 + titleW / 2, y + 1.2);

  // 3. Header Text Section
  y = 34;

  // "Seeking Approval for the following-Reg."
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 30);
  doc.text('Seeking Approval for the following-Reg.', L, y);
  y += 5.5;

  // Category / Type line
  const categoryText = submission.category || submission.subject || 'Type:1.SubmissionofAcademicMatters/Co-curricularandExtracurricular activities (with Financial Impact)';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const typeLines = doc.splitTextToSize(categoryText.startsWith('Type:') ? `${categoryText}:` : `Type: ${categoryText}:`, W);
  typeLines.forEach(line => {
    doc.text(line, L, y);
    y += 4.5;
  });
  y += 2;

  // Originator
  const originatorRole = submission.owner === 'student' ? 'Student' : (submission.role || (submission.owner === 'staff' ? 'Faculty' : 'Faculty'));
  const originatorDept = submission.department ? getDeptLong(submission.department) : '';
  const originatorName = submission.submitterName || submission.userName || submission.name || (submission.fName ? `${submission.fName} ${submission.lName || ''}`.trim() : '') || (submission.submittedBy && !submission.submittedBy.includes('@') ? submission.submittedBy : '') || '';
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  let originatorLabel = `Originator(${originatorRole})`;
  if (originatorName) {
    originatorLabel += ` - ${originatorName}`;
  } else if (submission.submittedBy) {
    originatorLabel += ` - ${submission.submittedBy}`;
  }
  if (originatorDept) {
    originatorLabel += ` - Dept. of ${originatorDept}`;
  }
  doc.text(originatorLabel, L + 10, y);
  y += 7;

  // 4. Determine Hierarchy List for Approval Boxes
  const typeKey = getDocumentTypeKey(categoryText);
  let hierarchy = typeKey && DOCUMENT_HIERARCHIES[typeKey] ? [...DOCUMENT_HIERARCHIES[typeKey]] : null;

  if (!hierarchy) {
    if (Array.isArray(submission.to) && submission.to.length > 0) {
      hierarchy = [...submission.to];
    } else if (typeof submission.to === 'string' && submission.to) {
      hierarchy = submission.to.split(',').map(s => s.trim());
    } else {
      // Default standard hierarchy
      hierarchy = ['HOD', 'Principal', 'JuniorSuperintendent', 'CFO', 'Manager'];
    }
  }

  // 5. Draw Boxes for Hierarchy
  const numBoxes = hierarchy.length;
  const bottomMargin = 16;
  const availHeight = pageH - bottomMargin - y;
  const boxGap = numBoxes > 4 ? 4 : 6;
  const boxHeight = Math.min(38, Math.max(26, (availHeight - (numBoxes - 1) * boxGap) / numBoxes));

  hierarchy.forEach((roleKey) => {
    const roleDisplay = ROLE_DISPLAY_NAMES[roleKey] || roleKey;
    const boxY = y;

    // Draw box
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.25);
    doc.rect(L, boxY, W, boxHeight);

    // Authority Label at top-left
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 30, 30);
    doc.text(roleDisplay, L + 2.5, boxY + 5);

    // Check for matching history / action
    const matchingHistory = submission.history?.filter(h => {
      if (!h.by) return false;
      const byLower = h.by.toLowerCase();
      const roleLower = roleKey.toLowerCase();
      const dispLower = roleDisplay.toLowerCase();
      return byLower === roleLower || byLower === dispLower || byLower.includes(roleLower) || roleLower.includes(byLower);
    });

    if (matchingHistory && matchingHistory.length > 0) {
      const lastAction = matchingHistory[matchingHistory.length - 1];
      let actionY = boxY + 10;

      // Status Tag & Reviewer Identity
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(20, 90, 40);
      const actionText = lastAction.action || 'Approved';
      const reviewerName = lastAction.authorName 
        ? ` (${lastAction.authorName})` 
        : (lastAction.authorEmail ? ` (${lastAction.authorEmail})` : '');
      doc.text(`Action: ${actionText}${reviewerName}`, L + 22, actionY);

      if (lastAction.timestamp) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(90, 90, 90);
        doc.text(`Date: ${new Date(lastAction.timestamp).toLocaleDateString('en-GB')}`, R - 40, actionY);
      }

      if (lastAction.remarks) {
        actionY += 4.5;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(40, 40, 40);
        const remarkLines = doc.splitTextToSize(`Remarks: "${lastAction.remarks}"`, W - 28);
        remarkLines.slice(0, 3).forEach(rl => {
          doc.text(rl, L + 22, actionY);
          actionY += 3.5;
        });
      }
    }

    y += boxHeight + boxGap;
  });

  // 6. Handle Attachments (Images/PDFs) on Extra Pages if present
  const attachments = submission.attachments || (submission.attachment ? [submission.attachment] : []);
  for (const att of attachments) {
    if (att) {
      let u8arr = null;
      let mime = att.mimetype || '';

      if (att.file) {
        if (att.file.type === 'Buffer' && att.file.data) {
          u8arr = new Uint8Array(att.file.data);
        } else if (typeof att.file === 'string') {
          try {
            const binaryString = window.atob(att.file);
            u8arr = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              u8arr[i] = binaryString.charCodeAt(i);
            }
          } catch (e) {}
        }
      } else if (att instanceof File || att instanceof Blob) {
        mime = att.type;
      }

      if (mime.startsWith('image/')) {
        doc.addPage();
        let imgURL = '';
        if (att instanceof File || att instanceof Blob) {
          imgURL = URL.createObjectURL(att);
        } else if (u8arr) {
          const blob = new Blob([u8arr], { type: mime });
          imgURL = URL.createObjectURL(blob);
        }

        if (imgURL) {
          try {
            const img = new window.Image();
            img.src = imgURL;
            await new Promise(r => { img.onload = r; img.onerror = r; });
            const pw = doc.internal.pageSize.getWidth();
            const ph = doc.internal.pageSize.getHeight();
            const ratio = Math.min((pw - 30) / img.width, (ph - 40) / img.height);
            const iw = img.width * ratio;
            const ih = img.height * ratio;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(30, 30, 30);
            doc.text(`Attachment: ${att.filename || att.name || 'Image'}`, pw / 2, 16, { align: 'center' });
            doc.setDrawColor(190, 190, 190);
            doc.line(L, 19, R, 19);
            doc.addImage(img, 'JPEG', (pw - iw) / 2, 24, iw, ih);
          } catch (e) {
            console.error('Error attaching image to PDF', e);
          } finally {
            URL.revokeObjectURL(imgURL);
          }
        }
      }
    }
  }

  // 7. Trigger download
  const saveFileName = `SNGCE_Submission_${(submission.formNo || submission._id || 'Form').toString().replace(/\//g, '_')}.pdf`;
  doc.save(saveFileName);
};
