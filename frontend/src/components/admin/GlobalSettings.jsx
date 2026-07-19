import React, { useState, useEffect } from 'react';
import axios from 'axios';

function GlobalSettings() {
  const [subjects, setSubjects] = useState([]);
  const [roles, setRoles] = useState([]);
  
  const [newSubject, setNewSubject] = useState('');
  const [hodAcceptable, setHodAcceptable] = useState(false);
  const [newRole, setNewRole] = useState('');
  
  const [loading, setLoading] = useState(true);

  const fetchConfigs = async () => {
    try {
      const resSubj = await axios.get(`/api/settings/configs?type=subject`);
      const resRole = await axios.get(`/api/settings/configs?type=role`);
      
      if (Array.isArray(resSubj.data)) setSubjects(resSubj.data);
      if (Array.isArray(resRole.data)) setRoles(resRole.data);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubject.trim()) return;
    try {
      await axios.post(`/api/settings/configs`, {
        configType: 'subject',
        value: newSubject.trim(),
        canBeAcceptedAtHodLevel: hodAcceptable
      });
      setNewSubject('');
      setHodAcceptable(false);
      fetchConfigs();
    } catch (err) {
      alert(`Failed to add subject`);
    }
  };

  const handleAddRole = async (e) => {
    e.preventDefault();
    if (!newRole.trim()) return;
    try {
      await axios.post(`/api/settings/configs`, {
        configType: 'role',
        value: newRole.trim()
      });
      setNewRole('');
      fetchConfigs();
    } catch (err) {
      alert(`Failed to add role`);
    }
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm(`Delete this ${type}?`)) return;
    try {
      await axios.delete(`/api/settings/configs/${id}`);
      fetchConfigs();
    } catch (err) {
      alert(`Failed to delete ${type}`);
    }
  };

  const toggleHodAcceptance = async (config) => {
    try {
      await axios.post(`/api/settings/configs`, {
        ...config,
        canBeAcceptedAtHodLevel: !config.canBeAcceptedAtHodLevel
      });
      fetchConfigs();
    } catch (err) {
      alert("Failed to update subject");
    }
  }

  if (loading) return <p>Loading settings...</p>;

  return (
    <div className="admin-section" style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Subjects Section */}
      <div>
        <h2>Dynamic Subjects</h2>
        <div style={{ background: '#f8fafc', padding: 20, borderRadius: 8, marginBottom: 20 }}>
          <form onSubmit={handleAddSubject} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <input 
                type="text" 
                value={newSubject} 
                onChange={(e) => setNewSubject(e.target.value)} 
                placeholder="E.g., Condonation, Fee Payment..."
                style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
              />
              <button type="submit" className="admin-btn" style={{ background: '#3b82f6', color: 'white' }}>Add Subject</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input 
                type="checkbox" 
                id="hodAcceptable"
                checked={hodAcceptable} 
                onChange={(e) => setHodAcceptable(e.target.checked)} 
              />
              <label htmlFor="hodAcceptable" style={{ fontSize: '0.9rem', color: '#4b5563' }}>
                Can be accepted at HOD level (skip Principal/Manager)
              </label>
            </div>
          </form>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Subject Name</th>
              <th>HOD Acceptable</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map(c => (
              <tr key={c._id}>
                <td>{c.value}</td>
                <td>
                  <button 
                    className="admin-btn" 
                    style={{ background: c.canBeAcceptedAtHodLevel ? '#22c55e' : '#6b7280', minWidth: 80 }}
                    onClick={() => toggleHodAcceptance(c)}
                  >
                    {c.canBeAcceptedAtHodLevel ? '✅ Yes' : '❌ No'}
                  </button>
                </td>
                <td>
                  <button className="admin-btn" style={{ background: '#ef4444' }} onClick={() => handleDelete(c._id, 'subject')}>Delete</button>
                </td>
              </tr>
            ))}
            {subjects.length === 0 && (
              <tr><td colSpan="3" style={{textAlign: 'center'}}>No dynamic subjects found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Roles Section */}
      <div>
        <h2>Dynamic Roles</h2>
        <div style={{ background: '#f8fafc', padding: 20, borderRadius: 8, marginBottom: 20 }}>
          <form onSubmit={handleAddRole} style={{ display: 'flex', gap: 10 }}>
            <input 
              type="text" 
              value={newRole} 
              onChange={(e) => setNewRole(e.target.value)} 
              placeholder="E.g., Vice Principal, Lab Assistant..."
              style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
            />
            <button type="submit" className="admin-btn" style={{ background: '#3b82f6', color: 'white' }}>Add Role</button>
          </form>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Role Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(c => (
              <tr key={c._id}>
                <td>{c.value}</td>
                <td>
                  <button className="admin-btn" style={{ background: '#ef4444', color: 'white' }} onClick={() => handleDelete(c._id, 'role')}>Delete</button>
                </td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr><td colSpan="2" style={{textAlign: 'center'}}>No dynamic roles found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

export default GlobalSettings;
