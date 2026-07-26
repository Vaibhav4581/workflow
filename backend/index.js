const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { normalizeRole, ROLES, isRole, getRoleQueryArray } = require('./utils/roles');
require("dotenv").config();
require('./connection');

const logmodel = require('./models/User');

const PORT = process.env.PORT || 3096;

const app = express();
app.use(cors({
  origin: ["https://submission.sngce.ac.in", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"], // frontend urls
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));

// Models
// Models
const fFormModel = require('./models/facultyForm');
const sFormModel = require('./models/studentForm');
const fAdvisorModel = require('./models/facultyAdvisor');
const Department = require('./models/Department');
const SystemConfig = require('./models/SystemConfig');
const RoleDashboardConfig = require('./models/RoleDashboardConfig');

// Notification Model (Inline)
const NotificationSchema = new mongoose.Schema({
  recipientEmail: { type: String, required: true },
  message: { type: String, required: true },
  relatedFormId: { type: mongoose.Schema.Types.ObjectId, refPath: 'relatedFormType' },
  relatedFormType: { type: String, enum: ['studentForm', 'facultyForm'] },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const NotificationModel = mongoose.model('Notification', NotificationSchema);

// Helper function to create notification
const createNotification = async (recipientEmail, message, relatedFormId, relatedFormType) => {
  try {
    await new NotificationModel({
      recipientEmail,
      message,
      relatedFormId,
      relatedFormType: relatedFormType === 'student' ? 'studentForm' : 'facultyForm' // Adjust based on your model names usually
    }).save();
    console.log(`Notification sent to ${recipientEmail}`);
  } catch (error) {
    console.error(`Failed to send notification to ${recipientEmail}:`, error);
  }
};

// Routes

/**
 * GET /getFacultyAdvisor
 * Finds the class assignments for a specific faculty member within a department.
 *
 * Query Parameters:
 * - email (string): The faculty member's email address.
 * - department (string): The department to search within.
 */
app.get('/getFacultyAdvisor', async (req, res) => {
  const { email, department } = req.query;
  // console.log(email, department);
  // --- Basic input validation ---
  if (!email || !department) {
    return res.status(400).send({ message: 'Email and department are required query parameters.' });
  }

  try {
    // --- Corrected Mongoose Query ---
    // 1. Use 'facultyNames.email' to query the nested field inside the array.
    // 2. Combine conditions in a single query object. This is an implicit "AND".
    const assignments = await fAdvisorModel.find({
      department: department,
      'facultyNames.email': email
    });
    // console.log(assignments)

    if (assignments.length === 0) {
      // It's good practice to handle cases where nothing is found.
      return res.status(404).send({ message: 'No assignments found for this faculty member in the specified department.' });
    }

    // console.log('Successfully found assignments:', assignments);
    res.status(200).send(assignments);

  } catch (error) {
    console.error("Error in /getFacultyAdvisor:", error);
    // --- Send a structured error response ---
    res.status(500).send({ message: 'An error occurred while fetching advisor data.', error: error.message });
  }
});

// Department Management
app.get('/api/departments', async (req, res) => {
  console.log("GET /api/departments hit");
  try {
    const depts = await Department.find();
    res.json(depts);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post('/api/departments', async (req, res) => {
  try {
    const { name, shortName } = req.body;
    if (!name || !shortName) return res.status(400).send("Name and Short Name are required");
    const dept = new Department({ name, shortName });
    await dept.save();
    res.status(201).json(dept);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.delete('/api/departments/:id', async (req, res) => {
  try {
    await Department.findByIdAndDelete(req.params.id);
    res.send("Department deleted");
  } catch (error) {
    res.status(500).send(error);
  }
});

// Get all Faculty Forms
app.get('/getAllFForms', async (req, res) => {
  try {
    const forms = await fFormModel.find().select('-attachment -attachments');
    console.log(forms)
    res.send(forms.map(s => ({ ...s.toObject(), owner: 'faculty' })));
  } catch (error) {
    console.log(error)
    res.send(error)
  }
})
// Get all Student Forms
app.get('/getAllSForms', async (req, res) => {
  try {
    const forms = await sFormModel.find().select('-attachment -attachments');
    console.log(forms)
    res.send(forms.map(s => ({ ...s.toObject(), owner: 'student' })));
  } catch (error) {
    console.log(error)
    res.send(error)
  }
})
// Get Student Forms by user
app.get('/getSFormsByUser', async (req, res) => {
  const { email } = req.query;
  try {
    const forms = await sFormModel.find().select('-attachment -attachments');
    res.send(forms.map(s => ({ ...s.toObject(), owner: 'student' })));
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});
// Get Faculty Forms by user
app.get('/getFFormsByUser', async (req, res) => {
  const { email } = req.query;
  try {
    const forms = await fFormModel.find().select('-attachment -attachments');
    res.send(forms.map(s => ({ ...s.toObject(), owner: 'faculty' })));
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});
// Get single Student Form by ID
app.get('/getSFormById/:id', async (req, res) => {
  console.log(req.params.id)
  try {
    const form = await sFormModel.findById(req.params.id);
    if (!form) return res.status(404).send('Not found');
    res.send({ ...form.toObject(), owner: 'student' });
  } catch (error) {
    res.status(500).send(error);
  }
});
// Get single Faculty Form by ID
app.get('/getFFormById/:id', async (req, res) => {
  console.log(req.params.id)
  try {
    const form = await fFormModel.findById(req.params.id);
    if (!form) return res.status(404).send('Not found');
    res.send({ ...form.toObject(), owner: 'faculty' });
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post('/createFacultyAdvisor', async (req, res) => {
  const { year, department, facultyNames } = req.body;
  try {
    await fAdvisorModel({ year, department, facultyNames }).save();
    console.log("Saved to DB!");
    res.send("Saved to DB!");
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});


app.post('/facultyFormSubmission', async (req, res) => {
  const { date, to, category, subject, subjectElaboration, others, department, details, attachment, attachments, submittedBy } = req.body;
  console.log(req.body);
  try {
    let finalAttachments = attachments || (attachment ? [attachment] : []);
    finalAttachments = finalAttachments.map(att => {
      if (att && typeof att.file === 'string') {
        return { ...att, file: Buffer.from(att.file, 'base64') };
      }
      return att;
    });

    const savedForm = await fFormModel({ 
      date, to, 
      category: category || subject, 
      subject, subjectElaboration, 
      others, department, details, 
      attachment: finalAttachments.length > 0 ? finalAttachments[0] : null,
      attachments: finalAttachments, 
      submittedBy 
    }).save();
    console.log("form submitted!")

    // Notify Recipient
    // Logic to resolve 'to' role to emails would go here. 
    // For now, simpler implementation: 
    // If 'to' is a role like 'HOD' or 'Principal', we might need to find the user.
    // Ideally, we'd have a helper to resolve Roles -> Emails based on Dept.
    // For this step, let's assume 'to' might be a specific email OR we notify all users with that role/dept.

    await notifyRecipients(savedForm, 'faculty', to, department);

    res.send('Form submitted');
  } catch (error) {
    console.log(error);
    res.status(500).send("Form submission failed");
  }
});
app.post('/studentFormSubmission', async (req, res) => {
  const { date, to, category, subject, subjectElaboration, others, department, details, attachment, attachments, submittedBy, div, year } = req.body;
  console.log(req.body);
  try {
    let finalAttachments = attachments || (attachment ? [attachment] : []);
    finalAttachments = finalAttachments.map(att => {
      if (att && typeof att.file === 'string') {
        return { ...att, file: Buffer.from(att.file, 'base64') };
      }
      return att;
    });

    const savedForm = await sFormModel({ 
      date, to, 
      category: category || subject, 
      subject, subjectElaboration, 
      others, department, details, 
      attachment: finalAttachments.length > 0 ? finalAttachments[0] : null,
      attachments: finalAttachments, 
      submittedBy, div, year 
    }).save();
    console.log("form submitted!")

    await notifyRecipients(savedForm, 'student', to, department);

    res.send('Form submitted');
  } catch (error) {
    console.log(error);
    res.status(500).send("Form submission failed");
  }
});

// Change Password
app.put('/changePassword', async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  if (!email || !currentPassword || !newPassword) {
    return res.status(400).send({ message: 'email, currentPassword, and newPassword are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).send({ message: 'New password must be at least 6 characters.' });
  }
  try {
    const user = await logmodel.findOne({ email });
    if (!user) return res.status(404).send({ message: 'User not found.' });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).send({ message: 'Current password is incorrect.' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.status(200).send({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).send({ message: 'Failed to change password.', error: error.message });
  }
});

app.post('/createAccount', async (req, res) => {
  const { fName, lName, email, password, role, department } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await logmodel({ fName, lName, email, password: hashedPassword, role, department }).save();
    res.send("User added");
  } catch (error) {
    console.log(error);
    res.status(500).send("Account creation failed");
  }
});

// Update user details
app.put('/updateUser', async (req, res) => {
  const { email, updates } = req.body;
  if (!email || !updates || typeof updates !== 'object') {
    return res.status(400).send({ message: 'Email and updates object are required.' });
  }

  try {
    const allowedRoles = new Set(['Student', 'Faculty', 'Principal', 'Manager', 'HOD', 'FacultyAdvisor', 'Admin']);
    const allowedDepartments = new Set(['CSE', 'NASB', 'ECE', 'EEE', 'ME', 'CE', 'AI', 'CS', 'MCA']);

    const changes = {};
    if (typeof updates.fName === 'string') changes.fName = updates.fName.trim();
    if (typeof updates.lName === 'string') changes.lName = updates.lName.trim();
    if (typeof updates.role === 'string') {
      changes.role = updates.role;
    }
    if (typeof updates.department === 'string') {
      changes.department = updates.department;
    }
    if (updates.year !== undefined) {
      const yearNum = Number(updates.year);
      if (!Number.isFinite(yearNum)) {
        return res.status(400).send({ message: 'year must be a number' });
      }
      changes.year = yearNum;
    }
    if (updates.div !== undefined) {
      changes.div = String(updates.div);
    }
    if (typeof updates.password === 'string' && updates.password.length > 0) {
      changes.password = await bcrypt.hash(updates.password, 10);
    }

    if (Object.keys(changes).length === 0) {
      return res.status(400).send({ message: 'No valid fields to update.' });
    }

    const updated = await logmodel.findOneAndUpdate(
      { email },
      { $set: changes },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).send({ message: 'User not found' });
    }

    if (isRole(updated.role, ROLES.FACULTY_ADVISOR) && updated.year && updated.div && updated.department) {
      // Sync with fAdvisorModel
      const existingAssignment = await fAdvisorModel.findOne({
        year: updated.year,
        div: updated.div,
        department: updated.department
      });

      if (existingAssignment) {
        const hasFaculty = existingAssignment.facultyNames.some(f => f.email === email);
        if (!hasFaculty) {
          existingAssignment.facultyNames.push({ name: `${updated.fName} ${updated.lName}`, email });
          await existingAssignment.save();
        }
      } else {
        await new fAdvisorModel({
          year: updated.year,
          div: updated.div,
          department: updated.department,
          facultyNames: [{ name: `${updated.fName} ${updated.lName}`, email }]
        }).save();
      }
    }

    // Remove password from response
    delete updated.password;
    res.status(200).send(updated);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).send({ message: 'Failed to update user', error: error.message });
  }
});

// Delete user
app.delete('/deleteUser/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const deletedUser = await logmodel.findOneAndDelete({ email });
    if (!deletedUser) {
      return res.status(404).send({ message: 'User not found' });
    }
    res.status(200).send({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).send({ message: 'Failed to delete user', error: error.message });
  }
});


app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const usr = await logmodel.findOne({ email });
    if (!usr) return res.status(400).send("Invalid Credentials");

    const isMatch = await bcrypt.compare(password, usr.password);
    if (!isMatch) return res.status(400).send("Invalid Credentials");

    const token = jwt.sign(
      { _id: usr._id, email: usr.email, role: usr.role, department: usr.department, year: usr.year, div: usr.div },
      process.env.JWT_SECRET || 'pineapplepie',
      { expiresIn: '2h' }
    );

    res.send({
      _id: usr._id,
      fName: usr.fName,
      lName: usr.lName,
      email: usr.email,
      role: usr.role,
      token
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Login failed");
  }
});

app.put('/updateMyDepartment', async (req, res) => {
  const { email, department } = req.body;
  try {
    const usr = await logmodel.findOneAndUpdate({ email }, { department }, { new: true });
    if (!usr) return res.status(404).send("User not found");

    const token = jwt.sign(
      { _id: usr._id, email: usr.email, role: usr.role, department: usr.department, year: usr.year, div: usr.div },
      process.env.JWT_SECRET || 'pineapplepie',
      { expiresIn: '2h' }
    );
    res.send({ token, department: usr.department });
  } catch (error) {
    console.log(error);
    res.status(500).send("Failed to update department");
  }
});

app.put('/updateMyRole', async (req, res) => {
  const { email, role, year, div } = req.body;
  try {
    const usr = await logmodel.findOne({ email });
    if (!usr) return res.status(404).send("User not found");
    if (!isRole(usr.role, ROLES.FACULTY) && !isRole(usr.role, ROLES.FACULTY_ADVISOR)) {
      return res.status(403).send("Only Faculty can switch roles.");
    }
    if (isRole(role, ROLES.FACULTY) || isRole(role, ROLES.FACULTY_ADVISOR)) {
      if (isRole(role, ROLES.FACULTY_ADVISOR)) {
        // Store the canonical no-space value ('FacultyAdvisor') used everywhere
        // else in the app (admin-assigned advisors, form `to` fields, Dashboard
        // role checks) so self-switched advisors are routed identically.
        usr.role = 'FacultyAdvisor';
        if (year !== undefined && year !== '') usr.year = Number(year);
        if (div !== undefined && div !== '') usr.div = String(div);
        await usr.save();

        // Sync the FacultyAdvisor class assignment. All faculty/student forms
        // are routed to advisors dynamically by (department, year, div) via
        // fAdvisorModel, with no time filter. Registering this user for their
        // class means they immediately inherit every form already forwarded to
        // the previous advisor of that class, as well as any forwarded later.
        if (usr.year != null && usr.div && usr.department) {
          const facultyName =
            [usr.fName, usr.lName].filter(Boolean).join(' ').trim() || email;
          const existingAssignment = await fAdvisorModel.findOne({
            year: usr.year,
            div: usr.div,
            department: usr.department,
          });
          if (existingAssignment) {
            if (!existingAssignment.facultyNames.some(f => f.email === email)) {
              existingAssignment.facultyNames.push({ name: facultyName, email });
              await existingAssignment.save();
            }
          } else {
            await new fAdvisorModel({
              year: usr.year,
              div: usr.div,
              department: usr.department,
              facultyNames: [{ name: facultyName, email }],
            }).save();
          }
        }
      } else {
        usr.role = 'Faculty';
        await usr.save();

        // Switching back to plain Faculty: drop this user from any advisor
        // class assignments so they stop receiving that class's forwarded forms,
        // and clean up assignments left with no advisors.
        await fAdvisorModel.updateMany(
          { 'facultyNames.email': email },
          { $pull: { facultyNames: { email } } }
        );
        await fAdvisorModel.deleteMany({ facultyNames: { $size: 0 } });
      }

      const token = jwt.sign(
        { _id: usr._id, email: usr.email, role: usr.role, department: usr.department, year: usr.year, div: usr.div },
        process.env.JWT_SECRET || 'pineapplepie',
        { expiresIn: '2h' }
      );
      res.send({ token, role: usr.role });
    } else {
      res.status(400).send("Invalid role switch");
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Failed to update role");
  }
});

// Get all users
app.get('/api/user/profile/:email', async (req, res) => {
  try {
    const user = await logmodel.findOne({ email: req.params.email }).select('-password').lean();
    if (!user) return res.status(404).send('User not found');
    res.json(user);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get('/getAllUsers', async (req, res) => {
  try {
    const users = await logmodel.find();
    res.send(users);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Unified endpoint for all roles
app.get('/getFormsForUser', async (req, res) => {
  const { email, role } = req.query;
  try {
    if (isRole(role, ROLES.ADMIN)) {
      // Admin: return all forms
      const [facultyForms, studentForms] = await Promise.all([
        fFormModel.find().select('-attachment -attachments'),
        sFormModel.find().select('-attachment -attachments')
      ]);
      res.send([
        ...facultyForms.map(f => ({ ...f.toObject(), owner: 'staff' })),
        ...studentForms.map(s => ({ ...s.toObject(), owner: 'student' }))
      ]);
    } else if (isRole(role, ROLES.STUDENT)) {
      // Student: only their forms
      const forms = await sFormModel.find({ submittedBy: email }).select('-attachment -attachments');
      res.send(forms.map(s => ({ ...s.toObject(), owner: 'student' })));
    } else {
      // Staff: only their forms
      const forms = await fFormModel.find({ submittedBy: email }).select('-attachment -attachments');
      res.send(forms.map(f => ({ ...f.toObject(), owner: 'staff' })));
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

// Archived forms (final status) for a user
app.get('/getArchivedForms', async (req, res) => {
  const { email, role } = req.query;
  if (!email || !role) {
    return res.status(400).send({ message: 'Missing required parameters: email, role' });
  }

  try {
    // Pull user context for department/year/div filtering
    const user = await logmodel.findOne({ email }).lean();
    const userDepartment = user?.department;
    const userYear = user?.year;
    const userDiv = user?.div;

    const roleLower = (role || '').toLowerCase();

    // ── 1. Forms SUBMITTED by this user ────────────────────────────────────
    const [submittedStudent, submittedFaculty] = await Promise.all([
      sFormModel.find({ submittedBy: email }).select('-attachment -attachments').lean(),
      fFormModel.find({ submittedBy: email }).select('-attachment -attachments').lean(),
    ]);

    const submitted = [
      ...submittedStudent.map(s => ({ ...s, owner: 'student', type: 'student', category: 'submitted' })),
      ...submittedFaculty.map(f => ({ ...f, owner: 'staff',   type: 'faculty', category: 'submitted' })),
    ];

    // ── 2. Forms RECEIVED by this user (role in the `to` array) ────────────
    let received = [];

    if (roleLower !== 'student') {
      const roleVariants = getRoleQueryArray(role);

      // Faculty forms addressed to this role
      let fFacQuery = { to: { $in: roleVariants } };
      if (roleLower === 'hod' && userDepartment) fFacQuery.department = userDepartment;
      const facReceived = await fFormModel.find(fFacQuery).select('-attachment -attachments').lean();

      // Student forms addressed to this role, with dept/year/div scoping
      let facStudentQuery = { to: { $in: roleVariants } };
      if (roleLower === 'hod' && userDepartment) {
        facStudentQuery.department = userDepartment;
      } else if (roleLower === 'facultyadvisor') {
        const advisorRoles = ['FacultyAdvisor', 'facultyadvisor', 'Faculty Advisor', 'Faculty', 'faculty'];
        facStudentQuery = {
          to: { $in: advisorRoles },
          department: userDepartment,
          ...(userYear != null ? { year: String(userYear) } : {}),
          ...(userDiv       ? { div: userDiv }              : {}),
        };
      }
      const stuReceived = await sFormModel.find(facStudentQuery).select('-attachment -attachments').lean();

      received = [
        ...facReceived.map(f => ({ ...f, owner: 'staff',   type: 'faculty', category: 'received' })),
        ...stuReceived.map(s => ({ ...s, owner: 'student', type: 'student', category: 'received' })),
      ];
    }

    // ── 3. Forms FORWARDED by this user (acted on in history) ──────────────
    // Look for any form where history has an entry with `by` matching this role
    const historyRoleVariants = [role, roleLower, role.toLowerCase()];

    const [facForwarded, stuForwarded] = await Promise.all([
      fFormModel.find({ 'history.by': { $in: historyRoleVariants } }).select('-attachment -attachments').lean(),
      sFormModel.find({ 'history.by': { $in: historyRoleVariants } }).select('-attachment -attachments').lean(),
    ]);

    const forwarded = [
      ...facForwarded.map(f => ({ ...f, owner: 'staff',   type: 'faculty', category: 'forwarded' })),
      ...stuForwarded.map(s => ({ ...s, owner: 'student', type: 'student', category: 'forwarded' })),
    ];

    // ── Merge, deduplicate by _id, sort newest first ────────────────────────
    const allMap = new Map();
    // Priority: submitted > received > forwarded (first write wins)
    for (const form of [...submitted, ...received, ...forwarded]) {
      const key = form._id.toString();
      if (!allMap.has(key)) allMap.set(key, form);
    }

    const response = Array.from(allMap.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).send(response);
  } catch (error) {
    console.error('Error in /getArchivedForms:', error);
    res.status(500).send({ message: 'An error occurred while fetching archived forms', error: error.message });
  }
});


// Endpoint to get received forms for a user
/**
 * GET /getReceivedFormsForUser
 * Fetches forms that have been sent to a specific user based on their role, department, year, and division.
 *
 * Query Parameters:
 * - role (string): The user's role (e.g., 'FacultyAdvisor', 'HOD', 'Principal').
 * - department (string): The user's department (required for 'FacultyAdvisor' and 'HOD').
 * - year (number): The user's assigned year (required for 'FacultyAdvisor').
 * - div (string): The user's assigned division (required for 'FacultyAdvisor').
 */
app.get('/getReceivedFormsForUser', async (req, res) => {
  const { role, department, year, div, type, email } = req.query; // Added 'email'
  console.log({ role, department, year, div, type, email });

  // --- Input Validation ---
  if (!role) {
    return res.status(400).send({ message: 'Role is a required query parameter.' });
  }
  if (isRole(role, ROLES.HOD) && !department) {
    return res.status(400).send({ message: 'Department is required for HOD role.' });
  }
  if (isRole(role, ROLES.FACULTY_ADVISOR) && (!department || !email)) {
    return res.status(400).send({ message: 'Department and email are required for FacultyAdvisor role.' });
  }

  try {
    let facultyReceived = [];
    let studentReceived = [];

    if (isRole(role, ROLES.HOD)) {
      if (type === 'staff') {
        const staffUsers = await logmodel.find({ role: 'Faculty', department: department }, 'email').lean();
        const staffEmails = staffUsers.map(u => u.email);
        facultyReceived = await fFormModel.find({ submittedBy: { $in: staffEmails }, to: { $in: getRoleQueryArray(ROLES.HOD) }, department: department }).select('-attachment -attachments');
      } else if (type === 'student') {
        const studentUsers = await logmodel.find({ role: 'Student', department: department }, 'email').lean();
        const studentEmails = studentUsers.map(u => u.email);
        studentReceived = await sFormModel.find({ submittedBy: { $in: studentEmails }, to: { $in: getRoleQueryArray(ROLES.HOD) }, department: department }).select('-attachment -attachments');
      } else {
        const hodQuery = { department, to: { $in: getRoleQueryArray(ROLES.HOD) } };
        const [deptFacultyForms, deptStudentForms] = await Promise.all([
          fFormModel.find(hodQuery).select('-attachment -attachments'),
          sFormModel.find(hodQuery).select('-attachment -attachments')
        ]);
        facultyReceived = deptFacultyForms;
        studentReceived = deptStudentForms;
      }
    } else if (isRole(role, ROLES.MANAGER)) {
      const pendingStatuses = ['awaiting', 'forwarded', 'edit'];
      facultyReceived = await fFormModel.find().select('-attachment -attachments');
      studentReceived = await sFormModel.find().select('-attachment -attachments');
    } else if (isRole(role, ROLES.PRINCIPAL)) {
      // Principal sees all faculty forms addressed to them
      facultyReceived = await fFormModel.find({ to: { $in: getRoleQueryArray(ROLES.PRINCIPAL) } }).select('-attachment -attachments');
      studentReceived = await sFormModel.find({ to: { $in: getRoleQueryArray(ROLES.PRINCIPAL) } }).select('-attachment -attachments');
    } else {
      // For other roles
      const facultyQuery = { to: { $in: getRoleQueryArray(role) } };
      if ((isRole(role, ROLES.HOD)) && department) {
        facultyQuery.department = department;
      }
      facultyReceived = await fFormModel.find(facultyQuery).select('-attachment -attachments');

      let faAssignments = [];
      if (isRole(role, ROLES.FACULTY_ADVISOR)) {
        faAssignments = await fAdvisorModel.find({ 'facultyNames.email': email, department }).lean();
      }

      let studentQuery = { to: { $in: getRoleQueryArray(role) } };

      if (isRole(role, ROLES.HOD)) {
        studentQuery.department = department;
      } else if (isRole(role, ROLES.FACULTY_ADVISOR)) {
        if (faAssignments.length > 0) {
          const advisorRoles = ['FacultyAdvisor', 'facultyadvisor', 'Faculty Advisor'];
          const facultyRoles = ['Faculty', 'faculty'];
          
          studentQuery = {
            $or: [
              // Forms addressed to 'Faculty' in this advisor's department, year & div
              {
                to: { $in: facultyRoles },
                department: department,
                $or: faAssignments.map(a => ({ year: String(a.year), div: a.div }))
              },
              // Forms explicitly addressed to 'FacultyAdvisor' in this department/year/div
              {
                to: { $in: advisorRoles },
                department: department,
                $or: faAssignments.map(a => ({ year: String(a.year), div: a.div }))
              }
            ]
          };
        } else {
          // No FA assignments: only see forms addressed to Faculty in own department
          studentQuery = { to: { $in: ['Faculty', 'faculty'] }, department: department };
        }
      }

      studentReceived = await sFormModel.find(studentQuery).select('-attachment -attachments').lean();
    }

    const toPlain = doc => (typeof doc.toObject === 'function' ? doc.toObject() : doc);
    res.send([
      ...facultyReceived.map(f => ({ ...toPlain(f), owner: 'staff' })),
      ...studentReceived.map(s => ({ ...toPlain(s), owner: 'student' }))
    ]);

  } catch (error) {
    console.error("Error in /getReceivedFormsForUser:", error);
    res.status(500).send({ message: "An error occurred while fetching forms.", error: error.message });
  }
});


// Endpoint to update remarks and status for a form
// app.put('/updateFormRemarksStatus', async (req, res) => {
//   const { formId, formType, remarks, status, to } = req.body;
//   console.log(req.body);
//   try {
//     let model;
//     if (formType === 'student') {
//       model = sFormModel;
//     } else if (formType === 'faculty') {
//       model = fFormModel;
//     } else {
//       return res.status(400).send('Invalid form type');
//     }
//     const updateFields = {};
//     if (remarks !== undefined) updateFields.remarks = remarks;
//     if (status !== undefined) updateFields.status = status;
//     if (to !== undefined) updateFields.to = to;
//     const updated = await model.findByIdAndUpdate(
//       formId,
//       updateFields,
//       { new: true }
//     );
//     if (!updated) return res.status(404).send('Form not found');
//     res.send(updated);
//   } catch (error) {
//     res.status(500).send(error);
//   }
// });

// --- Notification Endpoints ---

// Send Reminder
app.post('/sendReminder', async (req, res) => {
  const { formId, formType, submitterEmail, currentHandlerRoles, department } = req.body;
  try {
    // Notify the current handler roles based on the pending status
    if (currentHandlerRoles && Array.isArray(currentHandlerRoles)) {
      for (const role of currentHandlerRoles) {
        // Here we ideally send to specific emails, for now send role-based message or find users by role
        const users = await logmodel.find({ role: new RegExp(`^${role}$`, 'i'), ...(role.toLowerCase() === 'hod' || role.toLowerCase() === 'facultyadvisor' ? { department } : {}) }).lean();
        for (const user of users) {
          await createNotification(user.email, `Reminder: A form submitted by ${submitterEmail} is pending your approval.`, formId, formType);
        }
      }
    }
    
    // Notify Manager about the delay
    const managers = await logmodel.find({ role: new RegExp('^Manager$', 'i') }).lean();
    for (const manager of managers) {
      await createNotification(manager.email, `Escalation: Form ${formId} from ${submitterEmail} is pending and a reminder was sent.`, formId, formType);
    }

    res.status(200).send({ message: 'Reminders sent successfully' });
  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).send({ message: 'Failed to send reminder', error: error.message });
  }
});

// Get notifications for a user
app.get('/notifications', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).send({ message: 'Email is required' });
  try {
    const notifications = await NotificationModel.find({ recipientEmail: email }).sort({ createdAt: -1 });
    // console.log(notifications)
    res.send(notifications);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Mark single notification as read
app.put('/markNotificationRead/:id', async (req, res) => {
  try {
    await NotificationModel.findByIdAndUpdate(req.params.id, { isRead: true });
    res.send({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).send(error);
  }
});

// Mark all notifications as read
app.put('/markAllNotificationsRead', async (req, res) => {
  const { email } = req.body;
  try {
    await NotificationModel.updateMany({ recipientEmail: email, isRead: false }, { isRead: true });
    res.send({ message: 'All marked as read' });
  } catch (error) {
    res.status(500).send(error);
  }
});

// Delete read notifications (optional cleanup)
app.delete('/clearNotifications/:email', async (req, res) => {
  const email = req.params.email;
  try {
    await NotificationModel.deleteMany({ recipientEmail: email, isRead: true });
    res.send({ message: 'Read notifications cleared' });
  } catch (error) {
    res.status(500).send(error);
  }
});


// 2. System Config Routes (Subjects)
app.get('/api/settings/configs', async (req, res) => {
  const { type } = req.query;
  try {
    const query = type ? { configType: type, isActive: true } : { isActive: true };
    const configs = await SystemConfig.find(query);
    res.send(configs);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post('/api/settings/configs', async (req, res) => {
  try {
    const { _id, ...data } = req.body;
    if (_id) {
      const updated = await SystemConfig.findByIdAndUpdate(_id, data, { new: true });
      return res.send(updated);
    }
    const newConfig = new SystemConfig(req.body);
    await newConfig.save();
    res.send(newConfig);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.put('/api/settings/configs/:id', async (req, res) => {
  try {
    const updated = await SystemConfig.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.send(updated);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.delete('/api/settings/configs/:id', async (req, res) => {
  try {
    await SystemConfig.findByIdAndDelete(req.params.id);
    res.send({ message: 'Config deleted' });
  } catch (error) {
    res.status(500).send(error);
  }
});

// 2. Role Dashboard Config Routes (RBAC)
app.get('/api/admin/role-dashboard', async (req, res) => {
  try {
    const configs = await RoleDashboardConfig.find();
    res.send(configs);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get('/api/admin/role-dashboard/:role', async (req, res) => {
  try {
    const config = await RoleDashboardConfig.findOne({ role: new RegExp(`^${req.params.role}$`, 'i') });
    res.send(config || {}); // Send empty object if none exists so frontend can use defaults
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post('/api/admin/role-dashboard', async (req, res) => {
  try {
    const { role, permissions, dashboardWidgets } = req.body;
    let config = await RoleDashboardConfig.findOne({ role: new RegExp(`^${role}$`, 'i') });
    if (config) {
      config.permissions = permissions;
      config.dashboardWidgets = dashboardWidgets;
      await config.save();
    } else {
      config = new RoleDashboardConfig({ role, permissions, dashboardWidgets });
      await config.save();
    }
    res.send(config);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Helper: generate a temporary password
const generateTempPassword = () => 'Sngce@123';

app.post('/api/users/bulk', async (req, res) => {
  const { users } = req.body;
  if (!Array.isArray(users) || users.length === 0) {
    return res.status(400).json({ error: 'No user data received' });
  }

  const created = [];
  const updated = [];
  const errors = [];

  for (const u of users) {
    try {
      const { fName, lName, email, department, role, year, div } = u;
      if (!fName || !lName || !email) {
        throw new Error('Missing required fields (First Name, Last Name, Email)');
      }

      const existing = await logmodel.findOne({ email });
      
      const userData = {
        fName,
        lName,
        department,
        role: role || 'Student',
        year: year ? Number(year) : undefined,
        div,
      };

      if (existing) {
        // Update existing user
        await logmodel.updateOne({ email }, { $set: userData });
        updated.push({ email });
      } else {
        // Create new user
        let rawPwd = u.password?.trim();
        if (!rawPwd) rawPwd = generateTempPassword();
        userData.password = await bcrypt.hash(rawPwd, 10);
        userData.email = email;
        const newUser = new logmodel(userData);
        await newUser.save();
        created.push({ email, tempPassword: rawPwd });
      }
    } catch (e) {
      errors.push({ email: u.email, message: e.message });
    }
  }

  res.json({ 
    created: created.length, 
    updated: updated.length, 
    createdDetails: created, 
    errors 
  });
});

app.listen(PORT, () => {
  console.log(`Port is up and running at ${PORT}`);
});

// app.put('/updateFormRemarksStatus', async (req, res) => {
//   const { formId, formType, remarks, status, to, by } = req.body;
//   console.log(formType, remarks, status, to, by);
//   try {
//     let model;
//     if (formType === 'student') {
//     } else {
//       return res.status(400).send('Invalid form type');
//     }
//     console.log(model)
//     const updateFields = {};
//     if (remarks !== undefined) updateFields.remarks = remarks;
//     if (status !== undefined) updateFields.status = status;
//     if (to !== undefined) updateFields.to = to;

//     // Construct history action string
//     let action = '';
//     if (status === 'forwarded' && Array.isArray(to)) {
//       // Find the last two roles in the 'to' array
//       const last = to[to.length - 1];
//       const prev = to[to.length - 2] || '';
//       action = `${formType} forwarded to ${last.toLowerCase()}`;
//       if (prev) action = `${prev.toLowerCase()} forwarded to ${last.toLowerCase()}`;
//     } else if (status) {
//       action = `${formType} status changed to ${status}`;
//     } else if (remarks) {
//       action = `${formType} remarks updated`;
//     }
//     const historyEntry = {
//       action,
//       by: by || 'system',
//       timestamp: new Date(),
//       remarks: remarks || ''
//     };

//     // Update with $push to history
//     const ret = await model.findByIdAndUpdate(
//       formId,
//       {
//         $set: updateFields,
//         $push: { history: historyEntry }
//       },
//       { new: true }
//     );
//     console.log(ret)
//     if (!updated) return res.status(404).send('Form not found');
//     res.send(ret);
//   } catch (error) {
//     res.status(500).send(error);
//   }
// });


app.put('/updateFormRemarksStatus', async (req, res) => {
  const { formId, formType, remarks, status, to, by, category, subject, subjectElaboration, department, details, attachments, others } = req.body;

  try {
    let model;
    // --- Correctly assign the model based on formType ---
    if (formType === 'student') {
      model = sFormModel;
    } else if (formType === 'faculty') {
      model = fFormModel;
    } else {
      // This now correctly handles any other invalid type
      return res.status(400).send({ message: `Invalid form type: ${formType}` });
    }

    // Fetch current form to enforce completion rules
    const currentForm = await model.findById(formId).lean();
    if (!currentForm) {
      return res.status(404).send({ message: 'Form not found with the provided formId.' });
    }
    if (['accepted', 'approved', 'rejected', 'not_approved', 'cancelled'].includes(currentForm.status)) {
      return res.status(400).send({ message: 'This form is already completed and cannot be modified.' });
    }

    const updateFields = {};
    if (remarks !== undefined) updateFields.remarks = remarks;
    if (status !== undefined) updateFields.status = status;
    if (to !== undefined) updateFields.to = to;
    if (category !== undefined) updateFields.category = category;
    if (subject !== undefined) updateFields.subject = subject;
    if (subjectElaboration !== undefined) updateFields.subjectElaboration = subjectElaboration;
    if (department !== undefined) updateFields.department = department;
    if (details !== undefined) updateFields.details = details;
    if (attachments !== undefined) updateFields.attachments = attachments;
    if (others !== undefined) updateFields.others = others;

    // Construct history action string
    let action = '';
    if (status === 'forwarded' && Array.isArray(to) && to.length > 1) {
      const last = to[to.length - 1];
      const prev = to[to.length - 2];
      action = `${prev.toLowerCase()} forwarded to ${last.toLowerCase()}`;
    } else if (status) {
      action = `${formType} status changed to ${status}`;
    } else if (remarks) {
      action = `Remarks updated`;
    }

    // --- FIX: Check if there's any actual update to perform ---
    // An update is only meaningful if we are changing a field OR if there's a descriptive action for the history.
    if (Object.keys(updateFields).length === 0 && !action) {
      return res.status(400).send({ message: 'No update data provided. Please provide remarks, status, or a new recipient.' });
    }

    const historyEntry = {
      action,
      by: by || 'system', // Default to 'system' if 'by' is not provided
      timestamp: new Date(),
      remarks: remarks || ''
    };

    // --- Add more detailed logging for debugging ---
    console.log(`Attempting to update formId: ${formId}`);
    console.log('Fields to $set:', JSON.stringify(updateFields, null, 2));
    console.log('Entry to $push to history:', JSON.stringify(historyEntry, null, 2));

    // Update with $set to update fields and $push to add to history
    const updatedForm = await model.findByIdAndUpdate(
      formId,
      {
        $set: updateFields,
        $push: { history: historyEntry }
      },
      { new: true, runValidators: true } // This returns the updated document and runs schema validators
    );
    console.log(updatedForm)
    // Check if the form was actually found and updated
    if (!updatedForm) {
      return res.status(404).send({ message: 'Form not found with the provided formId.' });
    }

    // Send Notification for Update (Forward/Return/Status Change)
    if (updatedForm) {
      // 1. Notify the original submitter of status change (if status changed)
      if (status && status !== currentForm.status) {
        createNotification(
          updatedForm.submittedBy,
          `Your form status has been updated to: ${status}`,
          updatedForm._id,
          formType
        );
      }

      // 2. Notify new recipient if forwarded
      if (to && to !== currentForm.to) {
        // If 'to' is an array (forward chain), get the last one
        const newRecipient = Array.isArray(to) ? to[to.length - 1] : to;

        // We need year/div context from form for FacultyAdvisor role
        const formYear = updatedForm.year; // might be undefined for faculty forms
        const formDiv = updatedForm.div;

        // Re-use the resolving logic? 
        // Since notifyRecipients is async and complex, let's call it or a similar logic.
        // For forwarding, it usually goes to a ROLE.
        notifyRecipients(updatedForm, formType, newRecipient, updatedForm.department)
          .catch(err => console.error("Error in background notifyRecipients:", err));
      }
    }

    console.log('Update successful. Returning updated form.');
    res.status(200).send(updatedForm);

  } catch (error) {
    console.error("Error in /updateFormRemarksStatus:", error);
    res.status(500).send({ message: 'An internal server error occurred.', error: error.message });
  }
});

// Endpoint to send a reminder notification
app.post('/sendReminder', async (req, res) => {
  const { formId, formType, submitterEmail, currentHandlerRoles, department } = req.body;

  if (!formId || !formType || !submitterEmail || !currentHandlerRoles) {
    return res.status(400).send({ message: 'Missing required parameters.' });
  }

  try {
    const rolesArray = Array.isArray(currentHandlerRoles) ? currentHandlerRoles : [currentHandlerRoles];
    const currentHandlerRole = rolesArray[rolesArray.length - 1]; // Notify the last one in the 'to' array

    // 1. Send notification to the current handler
    await notifyRecipients({ _id: formId }, formType, currentHandlerRole, department);

    // 2. Send notification to Managers (Higher Authority)
    await notifyRecipients({ _id: formId }, formType, 'Manager', undefined);

    res.status(200).send({ message: 'Reminders sent successfully.' });
  } catch (error) {
    console.error("Error sending reminders:", error);
    res.status(500).send({ message: 'Failed to send reminders.', error: error.message });
  }
});

// Helper to resolve recipients and send
async function notifyRecipients(form, formType, targetRole, department) {
  try {
    let recipientEmails = [];
    const isArray = Array.isArray(targetRole);
    const actualTarget = isArray ? targetRole[targetRole.length - 1] : targetRole;

    // Guard: if no target, nothing to notify
    if (!actualTarget) return;

    // Normalize
    const roleLower = actualTarget.toLowerCase();


    // 1. Find users with this role & department
    const query = {};

    if (roleLower === 'hod' || roleLower === 'facultyadvisor') {
      query.role = { $regex: new RegExp(`^${actualTarget}$`, 'i') }; // Case incentive match
      query.department = department; // HOD/Advisor is dept specific
      // For advisor, we technically need year/div too, but User model might not have strict year/div for Faculty users easily queryable 
      // akin to student forms. Often Advisors are assigned roughly.
      // If your system maps advisors in `fAdvisorModel`, we should use that. 
      // Let's stick to the Role-based User query for now as per `logmodel`.
    } else if (roleLower === 'principal' || roleLower === 'manager' || roleLower === 'admin') {
      query.role = { $regex: new RegExp(`^${actualTarget}$`, 'i') };
      // No dept filter
    } else if (roleLower === 'student' || roleLower === 'faculty') {
      // Direct user email? If targetRole is an email, use it.
      if (actualTarget.includes('@')) {
        recipientEmails.push(actualTarget);
      }
    } else {
      // Fallback: Try to find any user with this role in the dept
      query.role = { $regex: new RegExp(`^${actualTarget}$`, 'i') };
      if (department) query.department = department;

      // Also check if it's a direct email
      if (actualTarget.includes('@')) {
        recipientEmails.push(actualTarget);
      }
    }

    if (Object.keys(query).length > 0) {
      const users = await logmodel.find(query);

      // Filter Advisors if needed (logic can be complex, simplifying to all advisors of dept for now or specific logic)
      // If the role is FacultyAdvisor, we might want to check the advisor mapping?
      // For now, notify ALL users with that Role in that Dept to be safe/ensure delivery.

      users.forEach(u => recipientEmails.push(u.email));
    }

    // Dedupe
    recipientEmails = [...new Set(recipientEmails)];

    // Send concurrently
    await Promise.all(recipientEmails.map(email => 
      createNotification(
        email,
        `New ${formType} form waiting for your action.`,
        form._id,
        formType
      )
    ));

  } catch (e) {
    console.error("Error notifying recipients:", e);
  }
}


// Delete form endpoint - allows deletion of forms with 'awaiting' status by authorized users
app.delete('/deleteForm', async (req, res) => {
  const { formId, formType, userEmail, userRole } = req.body;

  console.log('Delete request received:', { formId, formType, userEmail, userRole });

  // Input validation
  if (!formId || !formType || !userEmail || !userRole) {
    return res.status(400).send({ message: 'Missing required parameters: formId, formType, userEmail, userRole' });
  }

  // Validate formId is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(formId)) {
    return res.status(400).send({ message: 'Invalid form ID format' });
  }

  try {
    let model;
    if (formType === 'student') {
      model = sFormModel;
    } else if (formType === 'faculty') {
      model = fFormModel;
    } else {
      return res.status(400).send({ message: `Invalid form type: ${formType}. Must be 'student' or 'faculty'` });
    }

    // Find the form first
    const form = await model.findById(formId).lean();
    if (!form) {
      return res.status(404).send({ message: 'Form not found' });
    }

    console.log('Form found:', { status: form.status, submittedBy: form.submittedBy });

    // Check if form status allows deletion (only 'awaiting' or 'edit' status)
    if (form.status !== 'awaiting' && form.status !== 'edit') {
      return res.status(400).send({ message: `Only forms with "awaiting" or "edit" status can be deleted. Current status: ${form.status}` });
    }

    // Check authorization:
    // 1. User can delete forms they submitted
    // 2. Admin can delete any form
    const canDelete = form.submittedBy === userEmail || isValidReceiver(form, userEmail, userRole);

    console.log('Auth check:', { canDelete, submittedBy: form.submittedBy, userEmail, userRole });

    if (!canDelete) {
      return res.status(403).send({ message: 'You are not authorized to delete this form' });
    }

    // Delete the form
    await model.findByIdAndDelete(formId);

    console.log(`Form ${formId} deleted successfully by ${userEmail}`);
    res.status(200).send({ message: 'Form deleted successfully' });

  } catch (error) {
    console.error('Error deleting form - Name:', error.name, '| Message:', error.message);
    res.status(500).send({ message: 'An error occurred while deleting the form', error: error.message });
  }
});

app.delete('/clearAllForms', async (req, res) => {
  try {
    await sFormModel.deleteMany({});
    await fFormModel.deleteMany({});
    
    // reset counters
    const Counter = mongoose.model('Counter');
    if (Counter) {
      await Counter.deleteMany({ id: { $in: ['studentFormId', 'facultyFormId', 'formId'] } });
    }
    
    res.status(200).send({ message: 'Successfully cleared all form history.' });
  } catch (error) {
    console.error('Error clearing forms:', error);
    res.status(500).send({ message: 'Error clearing all forms.', error: error.message });
  }
});

// Helper function to check if user is a valid receiver for a form
function isValidReceiver(form, userEmail, userRole) {
  // Admin can delete any form (except in some cases)
  if (isRole(userRole, ROLES.ADMIN)) {
    return true;
  }

  // Students cannot delete received forms (they only submit)
  if (isRole(userRole, ROLES.STUDENT)) {
    return false;
  }

  // Check if user's role is in the "to" field
  const toArray = Array.isArray(form.to) ? form.to : [form.to];
  return toArray.includes(userRole);
}

// Get forwarded forms for a user (forms they submitted that have been forwarded)
app.get('/getForwardedFormsForUser', async (req, res) => {
  const { email, role } = req.query;

  console.log('Fetching forwarded forms for:', { email, role });

  if (!email || !role) {
    return res.status(400).send({ message: 'Missing required parameters: email, role' });
  }

  try {
    // Get forms submitted by this user from both student and faculty models
    const [studentForms, facultyForms] = await Promise.all([
      sFormModel.find({ submittedBy: email }).select('-attachment -attachments'),
      fFormModel.find({ submittedBy: email }).select('-attachment -attachments')
    ]);

    // Combine and filter forms that have been forwarded (status is not 'awaiting')
    const allForms = [...studentForms, ...facultyForms];
    const forwardedForms = allForms.filter(form =>
      form.status && form.status !== 'awaiting'
    );

    console.log(`Found ${forwardedForms.length} forwarded forms for ${email}`);

    // Sort by most recent first
    forwardedForms.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).send(forwardedForms);

  } catch (error) {
    console.error('Error fetching forwarded forms:', error);
    res.status(500).send({ message: 'An error occurred while fetching forwarded forms', error: error.message });
  }
});

// Get aggregated dashboard stats
app.get('/api/stats/dashboard', async (req, res) => {
  const { role, email } = req.query;
  try {
    const totalUsers = await logmodel.countDocuments();
    
    // Get forms
    const studentForms = await sFormModel.find().select('-attachment -attachments');
    const facultyForms = await fFormModel.find().select('-attachment -attachments');
    const allForms = [...studentForms, ...facultyForms];
    
    // Calculate forms by status
    const statusCounts = {};
    allForms.forEach(form => {
      const s = form.status || 'unknown';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });
    const formsByStatus = Object.keys(statusCounts).map(s => ({ name: s.toUpperCase(), value: statusCounts[s] }));
    
    // Calculate forms by department
    const deptCounts = {};
    allForms.forEach(form => {
      const d = form.department || 'Unknown';
      deptCounts[d] = (deptCounts[d] || 0) + 1;
    });
    const formsByDepartment = Object.keys(deptCounts).map(d => ({ name: d, value: deptCounts[d] }));
    
    // Recent forms (last 5)
    allForms.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const recentForms = allForms.slice(0, 5).map(f => ({
      _id: f._id,
      subject: f.subject || f.purpose,
      status: f.status,
      date: f.createdAt,
      type: f.studentId ? 'Student' : 'Faculty'
    }));

    res.send({
      totalUsers,
      formsByStatus,
      formsByDepartment,
      recentForms
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).send({ error: "Failed to fetch stats" });
  }
});

app.get("/health", async (req, res) => {
  const start = Date.now();

  try {
    const dbConnected = mongoose.connection.readyState === 1;

    res.status(200).json({
      reachable: true,
      status_code: 200,
      response_time_ms: Date.now() - start,
      mongodb_connected: dbConnected,
      uptime_seconds: process.uptime(),
      timestamp: new Date().toISOString(),
      error: null
    });

  } catch (err) {
    res.status(500).json({
      reachable: false,
      status_code: 500,
      response_time_ms: Date.now() - start,
      error: err.message
    });
  }
});

app.get("/version-backend", (req, res) => {
  res.json({ commit: process.env.COMMIT_SHA || "unknown" });
});