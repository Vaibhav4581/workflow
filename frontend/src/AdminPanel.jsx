import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import './AdminPanel.css';
import GlobalSettings from './components/admin/GlobalSettings';
import DashboardBuilder from './components/admin/DashboardBuilder';
import AccessControl from './components/admin/AccessControl';
import BulkUserImport from './components/admin/BulkUserImport';
import DepartmentManagement from './components/admin/DepartmentManagement';
import { isNoDeptRole } from './utils/roles';

function AdminPanel() {
  const [section, setSection] = useState('dashboard');
  const [siteTitle, setSiteTitle] = useState('SNGCE Workflow');

  // Load real users from backend
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dynamicRoles, setDynamicRoles] = useState([]);
  const [dynamicDepartments, setDynamicDepartments] = useState([]);
  
  // User Filters
  const [userFilters, setUserFilters] = useState({ search: '', role: '', department: '', year: '', div: '' });

  useEffect(() => {
    if (section === 'users') {
      const fetchConfigs = async () => {
        try {
          const [resRole, resDept] = await Promise.all([
            axios.get(`/api/settings/configs?type=role`),
            axios.get(`/api/departments`)
          ]);
          if (Array.isArray(resRole.data)) {
            setDynamicRoles(resRole.data.map(r => r.value));
          }
          if (Array.isArray(resDept.data)) {
            setDynamicDepartments(resDept.data);
          }
        } catch (err) {
          console.error("Failed to fetch dynamic configs", err);
        }
      };
      fetchConfigs();
    }
  }, [section]);
  const fetchUsers = async () => {
    try {
      const res = await axios.get('/getAllUsers');
      setUsers(res.data || []);
    } catch (err) {
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Load real forms from backend
  const [facultyForms, setFacultyForms] = useState([]);
  const [studentForms, setStudentForms] = useState([]);
  const [loadingForms, setLoadingForms] = useState(true);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const [facultyRes, studentRes] = await Promise.all([
          axios.get('/getAllFForms'),
          axios.get('/getAllSForms')
        ]);
        
        const facultyWithType = facultyRes.data.map(form => ({ ...form, type: 'faculty' }));
        const studentWithType = studentRes.data.map(form => ({ ...form, type: 'student' }));
        
        setFacultyForms(facultyWithType);
        setStudentForms(studentWithType);
      } catch (err) {
        console.error('Error fetching forms:', err);
        setFacultyForms([]);
        setStudentForms([]);
      } finally {
        setLoadingForms(false);
      }
    };
    fetchForms();
  }, []);

  // Combine all forms for display
  const allForms = [...facultyForms, ...studentForms];

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });

  // Add User form state
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    fName: '',
    lName: '',
    email: '',
    password: '',
    role: 'Student',
    department: 'CSE',
    year: '',
    div: ''
  });

  // Bulk Selection State
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedForms, setSelectedForms] = useState([]);

  // Users Bulk Handlers
  const handleSelectAllUsers = (e) => {
    if (e.target.checked) {
      setSelectedUsers(users.filter(u => u.role !== 'Admin').map(u => u.email));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (email) => {
    setSelectedUsers(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleBulkDeleteUsers = async () => {
    if (selectedUsers.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      message: `Are you sure you want to delete ${selectedUsers.length} users?`,
      onConfirm: async () => {
        let successCount = 0;
        for (const email of selectedUsers) {
          try {
            await axios.delete(`/deleteUser/${email}`);
            successCount++;
          } catch (err) {
            console.error(`Failed to delete ${email}`);
          }
        }
        alert(`Successfully deleted ${successCount} out of ${selectedUsers.length} users.`);
        setSelectedUsers([]);
        fetchUsers();
      }
    });
  };

  // Forms Bulk Handlers
  const handleSelectAllForms = (e) => {
    if (e.target.checked) {
      setSelectedForms(allForms.map(f => ({ id: f._id, type: f.type })));
    } else {
      setSelectedForms([]);
    }
  };

  const handleSelectForm = (id, type) => {
    setSelectedForms(prev => {
      const exists = prev.some(f => f.id === id);
      if (exists) return prev.filter(f => f.id !== id);
      return [...prev, { id, type }];
    });
  };

  const handleBulkDeleteForms = async () => {
    if (selectedForms.length === 0) return;
    
    setConfirmDialog({
      isOpen: true,
      message: `Are you sure you want to delete ${selectedForms.length} forms?`,
      onConfirm: async () => {
        try {
          const token = jwtDecode(localStorage.getItem('token'));
          let successCount = 0;
          
          for (const { id, type } of selectedForms) {
            try {
              await axios.delete('/deleteForm', {
                data: { formId: id, formType: type, userEmail: token.email, userRole: token.role }
              });
              successCount++;
            } catch (err) {
              console.error(`Failed to delete form ${id}`);
            }
          }
          
          alert(`Successfully deleted ${successCount} out of ${selectedForms.length} forms.`);
          
          // Update state
          setFacultyForms(prev => prev.filter(f => !selectedForms.some(s => s.id === f._id && s.type === 'faculty')));
          setStudentForms(prev => prev.filter(f => !selectedForms.some(s => s.id === f._id && s.type === 'student')));
          setSelectedForms([]);
        } catch (err) {
          alert('Failed bulk deletion.');
        }
      }
    });
  };

  const handleClearAllHistory = async () => {
    setConfirmDialog({
      isOpen: true,
      message: 'Are you absolutely sure you want to clear all form history? This action CANNOT be undone and will delete every submission.',
      onConfirm: async () => {
        try {
          await axios.delete('/clearAllForms');
          setFacultyForms([]);
          setStudentForms([]);
          setSelectedForms([]);
          alert('All form history cleared successfully!');
        } catch (error) {
          console.error('Error clearing history:', error);
          alert('Failed to clear history.');
        }
      }
    });
  };

  // User management actions
  const handleDeleteUser = async (email) => {
    setConfirmDialog({
      isOpen: true,
      message: 'Are you sure you want to delete this user?',
      onConfirm: async () => {
        try {
          await axios.delete(`/deleteUser/${email}`);
          const updated = users.filter(u => u.email !== email);
          setUsers(updated);
        } catch (err) {
          console.error('Failed to delete user:', err);
          alert('Failed to delete user');
        }
      }
    });
  };

  // Edit User state and actions
  const [editingEmail, setEditingEmail] = useState(null);
  const [editValues, setEditValues] = useState({ fName: '', lName: '', role: '', department: '', year: '', div: '', password: '' });

  const startEditUser = (user) => {
    setEditingEmail(user.email);
    setEditValues({
      fName: user.fName || '',
      lName: user.lName || '',
      role: user.role || 'Student',
      department: user.department || 'CSE',
      year: user.year ?? '',
      div: user.div || '',
      password: ''
    });
  };

  const cancelEditUser = () => {
    setEditingEmail(null);
    setEditValues({ fName: '', lName: '', role: 'Student', department: 'CSE', year: '', div: '', password: '' });
  };

  // Reset a single user's password to default
  const handleResetUserPassword = async (email) => {
    try {
      await axios.put('/updateUser', { email, updates: { password: 'Sngce@123' } });
      alert(`Password for ${email} reset to Sngce@123`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset password');
    }
  };

  // Reset ALL non-admin users' passwords to Sngce@123
  const handleResetAllPasswords = async () => {
    setConfirmDialog({
      isOpen: true,
      message: `Are you sure you want to reset ALL user passwords to "Sngce@123"? This cannot be undone.`,
      onConfirm: async () => {
        const nonAdmins = users.filter(u => (u.role || '').toLowerCase() !== 'admin');
        let success = 0;
        for (const u of nonAdmins) {
          try {
            await axios.put('/updateUser', { email: u.email, updates: { password: 'Sngce@123' } });
            success++;
          } catch (e) {
            console.error('Failed to reset password for', u.email);
          }
        }
        alert(`Successfully reset passwords for ${success} of ${nonAdmins.length} users.`);
      }
    });
  };

  const saveEditUser = async (email) => {
    try {
      const payload = { email, updates: { ...editValues } };
      // Convert empty year to undefined
      if (payload.updates.year === '') delete payload.updates.year;
      // Only send password if a new one was entered
      if (!payload.updates.password || payload.updates.password.trim() === '') {
        delete payload.updates.password;
      }
      const res = await axios.put('/updateUser', payload);
      const updated = res.data;
      setUsers(prev => prev.map(u => (u.email === email ? { ...u, ...updated } : u)));
      cancelEditUser();
      alert('User updated');
    } catch (err) {
      console.error('Failed updating user', err);
      alert(err.response?.data?.message || 'Failed to update user');
    }
  };

  // Add User functionality
  const handleAddUser = async (e) => {
    e.preventDefault();
    
    // Validation
    const roleForCheck = (newUser.role || '').toLowerCase();
    const isDeptRequired = !isNoDeptRole(newUser.role);
    const requiresYearDiv = ['student', 'faculty advisor', 'facultyadvisor'].includes(roleForCheck);
    
    if (!newUser.fName || !newUser.lName || !newUser.email || !newUser.password || (isDeptRequired && !newUser.department)) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (requiresYearDiv && (!newUser.year || !newUser.div)) {
      alert('Please provide year and division for Student/Faculty Advisor roles.');
      return;
    }
    
    if (newUser.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      await axios.post('/createAccount', newUser);
      
      // Add to local state
      setUsers(prev => [...prev, { ...newUser, password: undefined }]);
      
      // Reset form
      setNewUser({
        fName: '',
        lName: '',
        email: '',
        password: '',
        role: 'Student',
        department: 'CSE'
      });
      
      setShowAddUserForm(false);
      alert('User added successfully!');
      
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to add user. Please try again.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };


  // Form management actions
  const handleDeleteForm = async (formId, formType) => {
    setConfirmDialog({
      isOpen: true,
      message: 'Are you sure you want to delete this form? This action cannot be undone.',
      onConfirm: async () => {
        try {
          // Get user info from localStorage
          const token = jwtDecode(localStorage.getItem('token'));
          const userEmail = token.email;
          const userRole = token.role;

          await axios.delete('/deleteForm', {
            data: { formId, formType, userEmail, userRole }
          });
          
          // Update local state after successful deletion
          if (formType === 'faculty') {
            setFacultyForms(prev => prev.filter(form => form._id !== formId));
          } else {
            setStudentForms(prev => prev.filter(form => form._id !== formId));
          }
          
          alert('Form deleted successfully!');
        } catch (error) {
          console.error('Error deleting form:', error);
          if (error.response?.status === 403) {
            alert('You can only delete your own forms.');
          } else if (error.response?.status === 400) {
            alert(error.response.data || 'Only forms with "awaiting" status can be deleted.');
          } else {
            alert('Failed to delete form. Please try again.');
          }
        }
      }
    });
  };

  // Admin settings actions
  const handleSiteTitleChange = (e) => setSiteTitle(e.target.value);



  return (
    <div className="admin-panel">
      <div className="admin-container">
        <div className="admin-header">
          <h1>{siteTitle} <span>(Admin)</span></h1>
          <p>Manage users, forms, and system settings</p>
        </div>
        <nav className="admin-tabs">
          <button className={`admin-tab ${section === 'dashboard' ? 'active' : ''}`} onClick={() => setSection('dashboard')}>Dashboard</button>
          <button className={`admin-tab ${section === 'users' ? 'active' : ''}`} onClick={() => setSection('users')}>User Management</button>
          <button className={`admin-tab ${section === 'submissions' ? 'active' : ''}`} onClick={() => setSection('submissions')}>Submissions</button>
          <button className={`admin-tab ${section === 'received' ? 'active' : ''}`} onClick={() => setSection('received')}>Received</button>
          <button className={`admin-tab ${section === 'settings' ? 'active' : ''}`} onClick={() => setSection('settings')}>Settings</button>
          <button className={`admin-tab ${section === 'global_settings' ? 'active' : ''}`} onClick={() => setSection('global_settings')}>Global Settings</button>
          <button className={`admin-tab ${section === 'dashboard_builder' ? 'active' : ''}`} onClick={() => setSection('dashboard_builder')}>Dashboard Builder</button>
          <button className={`admin-tab ${section === 'access_control' ? 'active' : ''}`} onClick={() => setSection('access_control')}>Access Control</button>
          <button className={`admin-tab ${section === 'departments' ? 'active' : ''}`} onClick={() => setSection('departments')}>Departments</button>
        </nav>
              <div className="admin-content">
          {section === 'dashboard' && (
            <div className="admin-section">
              <h2>Dashboard</h2>
              <div className="admin-stats">
                <div className="stat-card">
                  <h3>Users</h3>
                  <p>{users.length}</p>
                </div>
                <div className="stat-card">
                  <h3>Faculty Forms</h3>
                  <p>{facultyForms.length}</p>
                </div>
                <div className="stat-card">
                  <h3>Student Forms</h3>
                  <p>{studentForms.length}</p>
                </div>
              </div>
              <p>Welcome to the admin dashboard. Use the navigation above to manage the site.</p>
            </div>
          )}
                  {section === 'users' && (
              <div className="admin-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <h2>User Management</h2>
                  {selectedUsers.length > 0 && (
                    <button 
                      className="admin-btn" 
                      style={{ background: '#ef4444', color: 'white', padding: '6px 12px', fontSize: '0.85rem' }}
                      onClick={handleBulkDeleteUsers}
                    >
                      Delete Selected ({selectedUsers.length})
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button 
                    className="admin-btn" 
                    onClick={() => setShowAddUserForm(!showAddUserForm)}
                    style={{ background: '#22c55e', color: 'white' }}
                  >
                    {showAddUserForm ? 'Cancel' : '+ Add User'}
                  </button>
                </div>
              </div>
              

              {showAddUserForm && (
                <div style={{ 
                  background: '#f8fafc', 
                  padding: '24px', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0', 
                  marginBottom: '24px' 
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#374151' }}>Add New User</h3>
                  <form onSubmit={handleAddUser}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' }}>
                          First Name *
                        </label>
                        <input
                          type="text"
                          name="fName"
                          value={newUser.fName}
                          onChange={handleInputChange}
                          required
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' }}>
                          Last Name *
                        </label>
                        <input
                          type="text"
                          name="lName"
                          value={newUser.lName}
                          onChange={handleInputChange}
                          required
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' }}>
                          Email *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={newUser.email}
                          onChange={handleInputChange}
                          required
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' }}>
                          Password *
                        </label>
                        <input
                          type="password"
                          name="password"
                          value={newUser.password}
                          onChange={handleInputChange}
                          required
                          minLength="6"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' }}>
                          Role *
                        </label>
                        <select
                          name="role"
                          value={newUser.role}
                          onChange={handleInputChange}
                          required
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        >
                          <option value="Student">Student</option>
                          <option value="Faculty">Faculty</option>
                          <option value="FacultyAdvisor">Faculty Advisor</option>
                          <option value="HOD">HOD</option>
                          <option value="Principal">Principal</option>
                          <option value="JuniorSuperintendent">Junior Superintendent</option>
                          <option value="CFO">CFO</option>
                          <option value="Manager">Manager</option>
                          <option value="AO">Administrative Officer (AO)</option>
                          <option value="TransportinCharge">Transport in Charge</option>
                          <option value="VicePrincipal">Vice Principal</option>
                          <option value="CollegeCouncil">College Council</option>
                          <option value="MaintenanceSection">Maintenance Section</option>
                          <option value="AccountsSection">Accounts Section</option>
                          <option value="HRSection">HR Section</option>
                          <option value="Driver">Driver</option>
                          <option value="Staff">Staff</option>
                          <option value="Admin">Admin</option>
                          {dynamicRoles.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                      {!isNoDeptRole(newUser.role) && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' }}>
                          Department *
                        </label>
                        <select
                          name="department"
                          value={newUser.department}
                          onChange={handleInputChange}
                          required
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        >
                          <option value="">Select Department</option>
                          {dynamicDepartments.map(dept => (
                            <option key={dept._id} value={dept.shortName}>
                              {dept.name} ({dept.shortName})
                            </option>
                          ))}
                          {/* Show defaults that aren't in dynamicDepartments */}
                          {[
                            { v: "CSE", n: "Computer Science & Engineering" },
                            { v: "NASB", n: "NASB" },
                            { v: "ECE", n: "Electronics & Communication Engineering" },
                            { v: "EEE", n: "Electrical & Electronics Engineering" },
                            { v: "ME", n: "Mechanical Engineering" },
                            { v: "CE", n: "Civil Engineering" },
                            { v: "AI", n: "Artificial Intelligence" },
                            { v: "CS", n: "Computer Science" },
                            { v: "MCA", n: "Master of Computer Applications" }
                          ].filter(d => !dynamicDepartments.some(dyn => dyn.shortName === d.v)).map(d => (
                            <option key={d.v} value={d.v}>{d.n} ({d.v})</option>
                          ))}
                        </select>
                      </div>
                      )}
                    </div>
                    
                    {(['student', 'faculty advisor', 'facultyadvisor'].includes((newUser.role || '').toLowerCase())) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' }}>
                          Year *
                        </label>
                        <input
                          type="number"
                          name="year"
                          value={newUser.year}
                          onChange={handleInputChange}
                          required
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' }}>
                          Division *
                        </label>
                        <input
                          type="text"
                          name="div"
                          value={newUser.div}
                          onChange={handleInputChange}
                          required
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        type="submit" 
                        className="admin-btn"
                        style={{ background: '#3b82f6', color: 'white' }}
                      >
                        Create User
                      </button>
                      <button 
                        type="button" 
                        className="admin-btn"
                        style={{ background: '#6b7280', color: 'white' }}
                        onClick={() => setShowAddUserForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
              
              {/* User Filters UI */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <input 
                  type="text" 
                  placeholder="Search by name or email" 
                  value={userFilters.search}
                  onChange={(e) => setUserFilters({ ...userFilters, search: e.target.value })}
                  style={{ flex: '1 1 200px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
                <select 
                  value={userFilters.role} 
                  onChange={(e) => setUserFilters({ ...userFilters, role: e.target.value })}
                  style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                >
                  <option value="">All Roles</option>
                  {[...new Set(users.map(u => u.role))].filter(Boolean).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <select 
                  value={userFilters.department} 
                  onChange={(e) => setUserFilters({ ...userFilters, department: e.target.value })}
                  style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                >
                  <option value="">All Departments</option>
                  {[...new Set(users.map(u => u.department))].filter(Boolean).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input 
                  type="number" 
                  placeholder="Year" 
                  value={userFilters.year}
                  onChange={(e) => setUserFilters({ ...userFilters, year: e.target.value })}
                  style={{ width: '80px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
                <input 
                  type="text" 
                  placeholder="Div" 
                  value={userFilters.div}
                  onChange={(e) => setUserFilters({ ...userFilters, div: e.target.value })}
                  style={{ width: '80px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
                <button 
                  onClick={() => setUserFilters({ search: '', role: '', department: '', year: '', div: '' })}
                  className="admin-btn"
                  style={{ background: '#94a3b8', color: 'white' }}
                >
                  Clear Filters
                </button>
              </div>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input 
                        type="checkbox" 
                        onChange={handleSelectAllUsers}
                        checked={users.length > 0 && users.filter(u => u.role !== 'Admin').length === selectedUsers.length && selectedUsers.length > 0}
                      />
                    </th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Year</th>
                    <th>Div</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredUsers = users.filter(u => {
                      const searchMatch = !userFilters.search || 
                        ((u.fName || '') + ' ' + (u.lName || '')).toLowerCase().includes(userFilters.search.toLowerCase()) || 
                        (u.email || '').toLowerCase().includes(userFilters.search.toLowerCase());
                      const roleMatch = !userFilters.role || u.role === userFilters.role;
                      const deptMatch = !userFilters.department || u.department === userFilters.department;
                      const yearMatch = !userFilters.year || u.year?.toString() === userFilters.year;
                      const divMatch = !userFilters.div || u.div?.toLowerCase() === userFilters.div.toLowerCase();
                      
                      return searchMatch && roleMatch && deptMatch && yearMatch && divMatch;
                    });
                    
                    if (filteredUsers.length === 0) {
                      return <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>No users found matching filters.</td></tr>;
                    }
                    
                    return filteredUsers.map(u => (
                    <tr key={u.email} style={{ background: u.role === 'Admin' ? '#e0e7ef' : 'inherit' }}>
                      <td>
                        {u.role !== 'Admin' && (
                          <input 
                            type="checkbox" 
                            checked={selectedUsers.includes(u.email)}
                            onChange={() => handleSelectUser(u.email)}
                          />
                        )}
                      </td>
                      <td>{u.fName || '-'} {u.lName || ''}</td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>{u.department || 'N/A'}</td>
                      <td>{u.year ?? ''}</td>
                      <td>{u.div || ''}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button className="admin-btn" style={{ width: '80px' }} onClick={() => startEditUser(u)}>Edit</button>
                          {u.role !== 'Admin' && (
                            <button className="admin-btn admin-btn-danger" style={{ width: '80px' }} onClick={() => handleDeleteUser(u.email)}>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                    ));
                  })()}
                </tbody>
              </table>
              
              {/* Edit User Modal */}
              {editingEmail && (
                <div className="admin-modal-overlay">
                  <div className="admin-modal">
                    <h2>Edit User</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <label>First Name</label>
                          <input className="settings-input" value={editValues.fName} onChange={e => setEditValues(v => ({ ...v, fName: e.target.value }))} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label>Last Name</label>
                          <input className="settings-input" value={editValues.lName} onChange={e => setEditValues(v => ({ ...v, lName: e.target.value }))} />
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <label>Role</label>
                          <select className="settings-input" value={editValues.role} onChange={e => setEditValues(v => ({ ...v, role: e.target.value }))}>
                            <option value="Student">Student</option>
                            <option value="Faculty">Faculty</option>
                            <option value="FacultyAdvisor">Faculty Advisor</option>
                            <option value="HOD">HOD</option>
                            <option value="Principal">Principal</option>
                            <option value="JuniorSuperintendent">Junior Superintendent</option>
                            <option value="CFO">CFO</option>
                            <option value="Manager">Manager</option>
                            <option value="AO">Administrative Officer (AO)</option>
                            <option value="TransportinCharge">Transport in Charge</option>
                            <option value="VicePrincipal">Vice Principal</option>
                            <option value="CollegeCouncil">College Council</option>
                            <option value="MaintenanceSection">Maintenance Section</option>
                            <option value="AccountsSection">Accounts Section</option>
                            <option value="HRSection">HR Section</option>
                            <option value="Driver">Driver</option>
                            <option value="Staff">Staff</option>
                            <option value="Admin">Admin</option>
                            {dynamicRoles.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                        {!isNoDeptRole(editValues.role) && (
                        <div style={{ flex: 1 }}>
                          <label>Department</label>
                          <select className="settings-input" value={editValues.department} onChange={e => setEditValues(v => ({ ...v, department: e.target.value }))}>
                            <option value="CSE">CSE</option>
                            <option value="NASB">NASB</option>
                            <option value="ECE">ECE</option>
                            <option value="EEE">EEE</option>
                            <option value="ME">ME</option>
                            <option value="CE">CE</option>
                            <option value="AI">AI</option>
                            <option value="CS">CS</option>
                            <option value="MCA">MCA</option>
                          </select>
                        </div>
                        )}
                      </div>

                      {(['student', 'faculty advisor', 'facultyadvisor'].includes((editValues.role || '').toLowerCase())) && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <label>Year</label>
                          <input type="number" className="settings-input" value={editValues.year} onChange={e => setEditValues(v => ({ ...v, year: e.target.value }))} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label>Division</label>
                          <input className="settings-input" value={editValues.div} onChange={e => setEditValues(v => ({ ...v, div: e.target.value }))} />
                        </div>
                      </div>
                      )}

                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '13px', color: '#374151' }}>
                          🔑 New Password <span style={{ fontWeight: '400', color: '#6b7280', fontSize: '12px' }}>(leave blank to keep current)</span>
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="settings-input"
                            value={editValues.password}
                            onChange={e => setEditValues(v => ({ ...v, password: e.target.value }))}
                            placeholder="Enter new password"
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            className="admin-btn"
                            style={{ background: '#f59e0b', color: 'white', whiteSpace: 'nowrap', padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => setEditValues(v => ({ ...v, password: 'Sngce@123' }))}
                          >
                            Use Default
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="modal-actions" style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                      <button className="admin-btn" style={{ background: '#6b7280', color: 'white' }} onClick={cancelEditUser}>Cancel</button>
                      <button className="admin-btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => saveEditUser(editingEmail)}>Save Changes</button>
                    </div>
                  </div>
                </div>
              )}
              
              <div style={{ marginTop: '30px' }}>
                <BulkUserImport onImportSuccess={fetchUsers} />
              </div>
            </div>
          )}
                  {section === 'submissions' && (
            <div className="admin-section">
              <h2>All Forms Management</h2>
              {loadingForms ? (
                <div className="loading">Loading forms...</div>
              ) : (
                <>
                  <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ 
                      background: '#f1f5f9', 
                      padding: '4px 12px', 
                      borderRadius: '20px', 
                      fontSize: '0.9rem'
                    }}>
                      Total Forms: {allForms.length}
                    </span>
                    <span style={{ 
                      background: '#f1f5f9', 
                      padding: '4px 12px', 
                      borderRadius: '20px', 
                      fontSize: '0.9rem'
                    }}>
                      Faculty: {facultyForms.length}
                    </span>
                    <span style={{ 
                      background: '#f1f5f9', 
                      padding: '4px 12px', 
                      borderRadius: '20px', 
                      fontSize: '0.9rem'
                    }}>
                      Student: {studentForms.length}
                    </span>
                    {selectedForms.length > 0 && (
                      <button 
                        className="admin-btn" 
                        style={{ background: '#ef4444', color: 'white', padding: '6px 12px', fontSize: '0.85rem' }}
                        onClick={handleBulkDeleteForms}
                      >
                        Delete Selected ({selectedForms.length})
                      </button>
                    )}
                    {allForms.length > 0 && (
                      <button 
                        className="admin-btn" 
                        style={{ background: '#b91c1c', color: 'white', padding: '6px 12px', fontSize: '0.85rem', marginLeft: 'auto' }}
                        onClick={handleClearAllHistory}
                      >
                        Clear All History
                      </button>
                    )}
                  </div>
                  <div style={{ width: "100%", overflowX: "auto", borderRadius: "8px" }}><table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>
                          <input 
                            type="checkbox" 
                            onChange={handleSelectAllForms}
                            checked={allForms.length > 0 && selectedForms.length === allForms.length}
                          />
                        </th>
                        <th>Form No</th>
                        <th>Type</th>
                        <th>Category</th>
                        <th>Subject</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th>Submitted By</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allForms.map(form => (
                        <tr key={form._id}>
                          <td>
                            <input 
                              type="checkbox" 
                              checked={selectedForms.some(f => f.id === form._id)}
                              onChange={() => handleSelectForm(form._id, form.type)}
                            />
                          </td>
                          <td>#{form.formNo}</td>
                          <td>
                            <span style={{ 
                              background: form.type === 'faculty' ? '#3b82f6' : '#10b981', 
                              color: 'white', 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              fontSize: '0.8rem' 
                            }}>
                              {form.type === 'faculty' ? 'Faculty' : 'Student'}
                            </span>
                          </td>
                          <td>{form.category || '-'}</td>
                          <td>{form.subject}</td>
                          <td>{form.department || 'N/A'}</td>
                          <td>
                            <span style={{ 
                              background: form.status === 'accepted' ? '#22c55e' : 
                                         form.status === 'rejected' ? '#ef4444' : 
                                         form.status === 'not_approved' ? '#f97316' : 
                                         form.status === 'cancelled' ? '#6b7280' : 
                                         form.status === 'forwarded' ? '#3b82f6' : '#fbbf24', 
                              color: 'white', 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              fontSize: '0.8rem' 
                            }}>
                              {form.status}
                            </span>
                          </td>
                          <td>{form.submittedBy}</td>
                          <td>
                            {new Date(form.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <button 
                              className="admin-btn"
                              onClick={() => handleDeleteForm(form._id, form.type)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                  {allForms.length === 0 && (
                    <div className="no-data">
                      No forms found.
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {section === 'received' && (
            <div className="admin-section">
              <h2>Form Analytics</h2>
              <div className="admin-stats">
                <div className="stat-card">
                  <h3>Total Forms</h3>
                  <p>{allForms.length}</p>
                </div>
                <div className="stat-card">
                  <h3>Pending</h3>
                  <p>{allForms.filter(f => f.status === 'awaiting').length}</p>
                </div>
                <div className="stat-card">
                  <h3>Completed</h3>
                  <p>{allForms.filter(f => f.status === 'accepted' || f.status === 'rejected').length}</p>
                </div>
                <div className="stat-card">
                  <h3>In Progress</h3>
                  <p>{allForms.filter(f => f.status === 'forwarded').length}</p>
                </div>
              </div>
              <p className="no-data" style={{ textAlign: 'center' }}>
                Use the "Submissions" tab to manage individual forms and delete them if needed.
              </p>
            </div>
          )}
          {section === 'settings' && (
            <div className="admin-section" style={{ maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
              <h2>Admin Settings</h2>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontWeight: 600, fontSize: 16 }}>Site Title:</label>
                <input
                  type="text"
                  value={siteTitle}
                  onChange={handleSiteTitleChange}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    marginTop: 8,
                    fontSize: 16,
                    background: '#f1f5f9',
                    color: '#222',
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontWeight: 600, fontSize: 16 }}>Admin Email:</label>
                <input
                  type="text"
                  value="admin@sngce.ac.in"
                  readOnly
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    marginTop: 8,
                    fontSize: 16,
                    background: '#f1f5f9',
                    color: '#888',
                  }}
                />
              </div>
              <div style={{ color: '#888', fontSize: 14 }}>
                <b>Note:</b> These settings are for demo only and not persisted.
              </div>
            </div>
          )}
          {section === 'global_settings' && <GlobalSettings />}
          {section === 'dashboard_builder' && <DashboardBuilder />}
          {section === 'access_control' && <AccessControl />}
          {section === 'departments' && <DepartmentManagement />}
        </div>
      </div>
      
      {/* Custom Confirm Dialog Modal */}
      {confirmDialog.isOpen && (
        <div className="admin-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="admin-modal" style={{ maxWidth: '400px', textAlign: 'center', padding: '30px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#1f2937' }}>Confirm Action</h3>
            <p style={{ color: '#4b5563', marginBottom: '25px', lineHeight: '1.5' }}>{confirmDialog.message}</p>
            <div className="modal-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                className="admin-btn" 
                style={{ background: '#6b7280', color: '#ffffff', flex: 1, fontWeight: 'bold' }} 
                onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null })}
              >
                Cancel
              </button>
              <button 
                className="admin-btn" 
                style={{ background: '#ef4444', color: '#ffffff', flex: 1, fontWeight: 'bold' }}
                onClick={() => {
                  if(confirmDialog.onConfirm) confirmDialog.onConfirm();
                  setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel; 
