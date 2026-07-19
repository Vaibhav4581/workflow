import React, { useState, useEffect } from 'react';
import axios from 'axios';

function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDept, setNewDept] = useState({ name: '', shortName: '' });

  const fetchDepartments = async () => {
    try {
      const res = await axios.get('/api/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error('Failed to fetch departments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/departments', newDept);
      setNewDept({ name: '', shortName: '' });
      fetchDepartments();
    } catch (err) {
      alert('Failed to create department');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      await axios.delete(`/api/departments/${id}`);
      fetchDepartments();
    } catch (err) {
      alert('Failed to delete department');
    }
  };

  if (loading) return <p>Loading departments...</p>;

  return (
    <div className="admin-section" style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2>Department Management</h2>
      <p style={{ color: '#666', marginBottom: 20 }}>Add or remove academic departments from the system.</p>

      <form onSubmit={handleCreate} style={{ marginBottom: '24px', background: '#f8fafc', padding: '20px', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        <div style={{ flex: 2 }}>
          <label style={{ display: 'block', marginBottom: 5, fontSize: 14 }}>Department Name (e.g. Computer Science)</label>
          <input 
            value={newDept.name} 
            onChange={(e) => setNewDept({...newDept, name: e.target.value})} 
            required 
            placeholder="Full Name"
            style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid #ddd' }} 
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 5, fontSize: 14 }}>Short Name (e.g. CSE)</label>
          <input 
            value={newDept.shortName} 
            onChange={(e) => setNewDept({...newDept, shortName: e.target.value})} 
            required 
            placeholder="Short Name"
            style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid #ddd' }} 
          />
        </div>
        <button type="submit" className="admin-btn" style={{ background: '#3b82f6', color: 'white', height: '42px' }}>Add Department</button>
      </form>

      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ textAlign: 'left', padding: '12px 20px' }}>Short Name</th>
              <th style={{ textAlign: 'left', padding: '12px 20px' }}>Full Department Name</th>
              <th style={{ textAlign: 'center', padding: '12px 20px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map(dept => (
              <tr key={dept._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 20px' }}><strong>{dept.shortName}</strong></td>
                <td style={{ padding: '12px 20px' }}>{dept.name}</td>
                <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                  <button 
                    onClick={() => handleDelete(dept._id)}
                    style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DepartmentManagement;
