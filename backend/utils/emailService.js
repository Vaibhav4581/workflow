// backend/utils/emailService.js
// SMTP Email Service using Nodemailer + Gmail SMTP (port 587 / STARTTLS)

const nodemailer = require('nodemailer');

// Lazy transporter — created on first use so that process.env is fully loaded
function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // STARTTLS on port 587 (NOT SSL 465)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    }
  });
}

/**
 * Send a generic email.
 * Falls back silently if SMTP credentials are not configured.
 */
async function sendEmail({ to, subject, html }) {
  // If no SMTP credentials set, skip silently (don't break the app)
  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your_email@gmail.com') {
    console.log(`[EMAIL] SMTP not configured. Skipping email to: ${to}`);
    return;
  }

  try {
    const transporter = getTransporter(); // read credentials now, not at startup
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `SNGCE Workflow <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[EMAIL] Sent to ${to} | MessageId: ${info.messageId}`);
  } catch (err) {
    // Log error but never crash the app due to email failure
    console.error(`[EMAIL] Failed to send to ${to}:`, err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Notify a reviewer that a new form has been forwarded/submitted to them.
 */
async function sendFormForwardedEmail({ recipientEmail, recipientName, submitterName, formSubject, formId, formType, actionBy }) {
  const viewUrl = `http://localhost:5173/received-forms/${formId}`;
  const subject = `📋 New Form Awaiting Your Review — ${formSubject}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 10px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">📋 New Form For Your Review</h1>
        <p style="color: #bfdbfe; margin: 8px 0 0 0;">SNGCE Workflow Management System</p>
      </div>
      <div style="padding: 30px; background: white;">
        <p style="font-size: 16px; color: #374151;">Hello <strong>${recipientName || recipientEmail}</strong>,</p>
        <p style="color: #6b7280;">A form has been submitted and is now waiting for your action.</p>
        
        <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 6px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 140px;"><strong>Subject:</strong></td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px;">${formSubject}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px;"><strong>Submitted By:</strong></td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px;">${submitterName || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px;"><strong>Form Type:</strong></td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px; text-transform: capitalize;">${formType}</td>
            </tr>
            ${actionBy ? `<tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px;"><strong>Forwarded By:</strong></td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px;">${actionBy}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px;"><strong>Date:</strong></td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${viewUrl}" style="background: #3b82f6; color: white; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
            View & Review Form →
          </a>
        </div>

        <p style="color: #9ca3af; font-size: 13px; text-align: center;">Please log in to the SNGCE Workflow System to take action on this form.</p>
      </div>
      <div style="background: #f3f4f6; padding: 16px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">SNGCE Workflow System &bull; Automated Notification &bull; Do not reply to this email</p>
      </div>
    </div>
  `;

  await sendEmail({ to: recipientEmail, subject, html });
}

/**
 * Notify the original submitter that their form status has changed.
 */
async function sendStatusUpdateEmail({ recipientEmail, recipientName, formSubject, formId, formType, newStatus, actionBy, remarks }) {
  const viewUrl = `http://localhost:5173/submission/${formId}`;

  const statusConfig = {
    forwarded: { label: 'Forwarded ↗', color: '#3b82f6', bg: '#eff6ff', icon: '📤' },
    accepted:  { label: 'Accepted ✅',  color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
    approved:  { label: 'Approved ✅',  color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
    rejected:  { label: 'Rejected ❌',  color: '#dc2626', bg: '#fef2f2', icon: '❌' },
    edit:      { label: 'Edit Requested ✏️', color: '#d97706', bg: '#fffbeb', icon: '✏️' },
  };

  const config = statusConfig[newStatus] || { label: newStatus, color: '#6b7280', bg: '#f9fafb', icon: '📋' };
  const subject = `${config.icon} Your Form Status Updated — ${formSubject}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 10px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">${config.icon} Form Status Update</h1>
        <p style="color: #bfdbfe; margin: 8px 0 0 0;">SNGCE Workflow Management System</p>
      </div>
      <div style="padding: 30px; background: white;">
        <p style="font-size: 16px; color: #374151;">Hello <strong>${recipientName || recipientEmail}</strong>,</p>
        <p style="color: #6b7280;">Your form has been reviewed and the status has been updated.</p>
        
        <div style="background: ${config.bg}; border: 2px solid ${config.color}; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; font-size: 20px; font-weight: bold; color: ${config.color};">${config.label}</p>
        </div>

        <div style="background: #f9fafb; border-radius: 6px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 140px;"><strong>Subject:</strong></td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px;">${formSubject}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px;"><strong>Action By:</strong></td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px;">${actionBy || 'System'}</td>
            </tr>
            ${remarks ? `<tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px; vertical-align: top;"><strong>Remarks:</strong></td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px;">${remarks}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px;"><strong>Date:</strong></td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${viewUrl}" style="background: #3b82f6; color: white; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
            View Form →
          </a>
        </div>
      </div>
      <div style="background: #f3f4f6; padding: 16px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">SNGCE Workflow System &bull; Automated Notification &bull; Do not reply to this email</p>
      </div>
    </div>
  `;

  await sendEmail({ to: recipientEmail, subject, html });
}

/**
 * Notify a submitter that their form has been returned for editing.
 */
async function sendEditRequestEmail({ recipientEmail, recipientName, formSubject, formId, formType, requestedBy, remarks }) {
  const editUrl = `http://localhost:5173/submission/${formId}`;
  const subject = `✏️ Edit Required on Your Form — ${formSubject}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 10px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #b45309, #f59e0b); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">✏️ Edit Required</h1>
        <p style="color: #fef3c7; margin: 8px 0 0 0;">SNGCE Workflow Management System</p>
      </div>
      <div style="padding: 30px; background: white;">
        <p style="font-size: 16px; color: #374151;">Hello <strong>${recipientName || recipientEmail}</strong>,</p>
        <p style="color: #6b7280;">Your form has been reviewed and the reviewer has requested some changes before it can be processed further.</p>
        
        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 140px;"><strong>Form Subject:</strong></td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px;">${formSubject}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px;"><strong>Requested By:</strong></td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px;">${requestedBy || 'Reviewer'}</td>
            </tr>
            ${remarks ? `<tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px; vertical-align: top;"><strong>Remarks:</strong></td>
              <td style="padding: 6px 0; color: #b45309; font-size: 14px; font-weight: bold;">${remarks}</td>
            </tr>` : ''}
          </table>
        </div>

        <p style="color: #374151;">Please log in and update your form with the requested changes, then resubmit it.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${editUrl}" style="background: #f59e0b; color: white; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
            Edit My Form →
          </a>
        </div>
      </div>
      <div style="background: #f3f4f6; padding: 16px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">SNGCE Workflow System &bull; Automated Notification &bull; Do not reply to this email</p>
      </div>
    </div>
  `;

  await sendEmail({ to: recipientEmail, subject, html });
}

/**
 * Notify anyone who previously forwarded a form about an update, rejection, edit request, or approval.
 */
async function sendForwarderUpdateEmail({ recipientEmail, recipientName, submitterName, formSubject, formId, formType, newStatus, actionBy, remarks }) {
  const viewUrl = `http://localhost:5173/received-forms/${formId}`;

  const statusConfig = {
    forwarded: { label: 'Forwarded ↗', color: '#3b82f6', bg: '#eff6ff', icon: '📤' },
    accepted:  { label: 'Accepted ✅',  color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
    approved:  { label: 'Approved ✅',  color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
    rejected:  { label: 'Rejected ❌',  color: '#dc2626', bg: '#fef2f2', icon: '❌' },
    edit:      { label: 'Edit Requested ✏️', color: '#d97706', bg: '#fffbeb', icon: '✏️' },
    awaiting:  { label: 'Updated / Resubmitted 🔄', color: '#0284c7', bg: '#f0f9ff', icon: '🔄' },
  };

  const config = statusConfig[newStatus] || { label: newStatus || 'Updated', color: '#6b7280', bg: '#f9fafb', icon: '📋' };
  const subject = `${config.icon} Form You Forwarded Was Updated — ${formSubject}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 10px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">${config.icon} Form Update Notice</h1>
        <p style="color: #bfdbfe; margin: 8px 0 0 0;">SNGCE Workflow Management System</p>
      </div>
      <div style="padding: 30px; background: white;">
        <p style="font-size: 16px; color: #374151;">Hello <strong>${recipientName || recipientEmail}</strong>,</p>
        <p style="color: #6b7280;">A form that was previously forwarded by you has received an update.</p>
        
        <div style="background: ${config.bg}; border: 2px solid ${config.color}; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${config.color};">${config.label}</p>
        </div>

        <div style="background: #f9fafb; border-radius: 6px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 140px;"><strong>Subject:</strong></td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px;">${formSubject}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px;"><strong>Submitted By:</strong></td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px;">${submitterName || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px;"><strong>Action Taken By:</strong></td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px;">${actionBy || 'Reviewer'}</td>
            </tr>
            ${remarks ? `<tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px; vertical-align: top;"><strong>Remarks:</strong></td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px;">${remarks}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px;"><strong>Date:</strong></td>
              <td style="padding: 6px 0; color: #111827; font-size: 14px;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${viewUrl}" style="background: #3b82f6; color: white; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
            View Form Details →
          </a>
        </div>
      </div>
      <div style="background: #f3f4f6; padding: 16px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">SNGCE Workflow System &bull; Automated Notification &bull; Do not reply to this email</p>
      </div>
    </div>
  `;

  await sendEmail({ to: recipientEmail, subject, html });
}

module.exports = {
  sendEmail,
  sendFormForwardedEmail,
  sendStatusUpdateEmail,
  sendEditRequestEmail,
  sendForwarderUpdateEmail,
};
