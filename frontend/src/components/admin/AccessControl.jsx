import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AVAILABLE_ROLES = ['Student', 'Faculty', 'Principal', 'Manager', 'HOD', 'FacultyAdvisor'];

function AccessControl() {
  const [selectedRole, setSelectedRole] = useState(AVAILABLE_ROLES[0]);
  const [dynamicRoles, setDynamicRoles] = useState([]);
  
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const resRole = await axios.get(`/api/settings/configs?type=role`);
        if (Array.isArray(resRole.data)) {
          setDynamicRoles(resRole.data.map(r => r.value));
        }
      } catch (err) {
        console.error("Failed to fetch dynamic roles", err);
      }
    };
    fetchConfigs();
  }, []);

  const allRoles = [...AVAILABLE_ROLES, ...dynamicRoles];

  const [permissions, setPermissions] = useState({
    canViewReceived: true,
    canViewSubmissions: true,
    canApprove: false,
    canDeleteUsers: false
  });
  const [loading, setLoading] = useState(false);

  const fetchRoleConfig = async (role) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/admin/role-dashboard/${role}`);
      if (res.data && res.data.permissions) {
        setPermissions(res.data.permissions);
      } else {
        // defaults
        setPermissions({
          canViewReceived: true,
          canViewSubmissions: true,
          canApprove: false,
          canDeleteUsers: false
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoleConfig(selectedRole);
  }, [selectedRole]);

  const handleSave = async () => {
    try {
      // First fetch to get existing widgets so we don't overwrite them
      const res = await axios.get(`/api/admin/role-dashboard/${selectedRole}`);
      const existingWidgets = res.data?.dashboardWidgets || [];

      await axios.post(`/api/admin/role-dashboard`, {
        role: selectedRole,
        permissions,
        dashboardWidgets: existingWidgets
      });
      alert('Permissions saved successfully!');
    } catch (err) {
      alert('Failed to save permissions');
    }
  };

  return (
    <div className="admin-section" style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2>Access Control (RBAC)</h2>
      <p style={{ color: '#666', marginBottom: 20 }}>Configure what each role can see and do within the application.</p>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 'bold', marginRight: 10 }}>Select Role to Edit:</label>
        <select 
          value={selectedRole} 
          onChange={(e) => setSelectedRole(e.target.value)}
          style={{ padding: 10, borderRadius: 6, border: '1px solid #ccc', minWidth: 200 }}
        >
          {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {loading ? <p>Loading...</p> : (
        <div style={{ background: '#f8fafc', padding: 20, borderRadius: 8 }}>
          <div style={{ display: 'grid', gap: 15 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={permissions.canViewReceived} 
                onChange={(e) => setPermissions({...permissions, canViewReceived: e.target.checked})} 
              />
              <span>Can View Received Forms Tab</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={permissions.canViewSubmissions} 
                onChange={(e) => setPermissions({...permissions, canViewSubmissions: e.target.checked})} 
              />
              <span>Can View My Submissions Tab</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={permissions.canApprove} 
                onChange={(e) => setPermissions({...permissions, canApprove: e.target.checked})} 
              />
              <span>Can Approve/Reject Forms</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={permissions.canDeleteUsers} 
                onChange={(e) => setPermissions({...permissions, canDeleteUsers: e.target.checked})} 
              />
              <span>Can Delete Users (Admin override)</span>
            </label>
          </div>
          
          <button className="admin-btn" style={{ background: '#10b981', marginTop: 20 }} onClick={handleSave}>
            Save Permissions
          </button>
        </div>
      )}
    </div>
  );
}

export default AccessControl;
