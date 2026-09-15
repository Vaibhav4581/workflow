import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AVAILABLE_ROLES = ['Student', 'Faculty', 'Principal', 'Manager', 'HOD', 'FacultyAdvisor'];

const AVAILABLE_WIDGETS = [
  { type: 'StatCard', title: 'Total Users', dataSource: 'TotalUsers' },
  { type: 'PieChart', title: 'Forms by Status', dataSource: 'FormsByStatus' },
  { type: 'RecentForms', title: 'Recent Submissions', dataSource: 'RecentForms' },
  { type: 'BarChart', title: 'Forms by Department', dataSource: 'FormsByDepartment' }
];

function DashboardBuilder() {
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

  const [widgets, setWidgets] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchRoleConfig = async (role) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/admin/role-dashboard/${role}`);
      if (res.data) {
        setWidgets(res.data.dashboardWidgets || []);
        setPermissions(res.data.permissions || {});
      } else {
        setWidgets([]);
        setPermissions({});
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

  const handleAddWidget = (widgetTemplate) => {
    const newWidget = {
      id: `widget_${Date.now()}`,
      ...widgetTemplate
    };
    setWidgets([...widgets, newWidget]);
  };

  const handleRemoveWidget = (id) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  const handleSave = async () => {
    try {
      await axios.post(`/api/admin/role-dashboard`, {
        role: selectedRole,
        permissions, // preserve permissions
        dashboardWidgets: widgets
      });
      alert('Dashboard layout saved successfully!');
    } catch (err) {
      alert('Failed to save dashboard');
    }
  };

  return (
    <div className="admin-section" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <h2>Dashboard Builder</h2>
      <p style={{ color: '#666', marginBottom: 20 }}>Configure which widgets appear on the dashboard for each role.</p>

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

      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ flex: 1, background: '#f8fafc', padding: 20, borderRadius: 8 }}>
          <h3>Available Widgets</h3>
          <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
            {AVAILABLE_WIDGETS.map((w, idx) => (
              <div key={idx} style={{ padding: 15, border: '1px dashed #cbd5e1', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                <div>
                  <strong>{w.title}</strong>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Type: {w.type}</div>
                </div>
                <button className="admin-btn" style={{ background: '#3b82f6', color: 'white', padding: '5px 10px' }} onClick={() => handleAddWidget(w)}>
                  + Add
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 2, background: '#f1f5f9', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Current Dashboard Layout</h3>
            <button className="admin-btn" style={{ background: '#10b981', color: 'white' }} onClick={handleSave}>Save Layout</button>
          </div>
          
          {loading ? <p>Loading...</p> : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginTop: 15 }}>
              {widgets.length === 0 && <p style={{ color: '#94a3b8', gridColumn: 'span 2' }}>No widgets added yet. Add some from the left.</p>}
              {widgets.map((w) => (
                <div key={w.id} style={{ padding: 15, background: 'white', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', position: 'relative' }}>
                  <button 
                    onClick={() => handleRemoveWidget(w.id)}
                    style={{ position: 'absolute', top: 5, right: 5, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18 }}
                  >×</button>
                  <strong style={{ display: 'block', marginBottom: 5 }}>{w.title}</strong>
                  <span style={{ fontSize: 12, background: '#e2e8f0', padding: '2px 6px', borderRadius: 4 }}>{w.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardBuilder;
