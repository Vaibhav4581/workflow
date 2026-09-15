import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function PageBuilder() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPage, setNewPage] = useState({ slug: '', title: '', roles: '', layout: '' });

  const fetchPages = async () => {
    try {
      const res = await axios.get('/api/pages');
      setPages(res.data);
    } catch (err) {
      console.error('Failed to fetch pages', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPage(prev => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const payload = {
      slug: newPage.slug.trim(),
      title: newPage.title.trim(),
      roles: newPage.roles ? newPage.roles.split(',').map(r => r.trim()) : [],
      layout: newPage.layout ? JSON.parse(newPage.layout) : []
    };
    try {
      await axios.post('/api/pages', payload);
      setNewPage({ slug: '', title: '', roles: '', layout: '' });
      fetchPages();
    } catch (err) {
      alert('Failed to create page');
      console.error(err);
    }
  };

  if (loading) return <p>Loading pages...</p>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2>Custom Page Builder</h2>
      <form onSubmit={handleCreate} style={{ marginBottom: '24px', background: '#f8fafc', padding: '20px', borderRadius: '8px' }}>
        <div style={{ marginBottom: '12px' }}>
          <label>Slug (URL) *</label><br />
          <input name="slug" value={newPage.slug} onChange={handleInputChange} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label>Title *</label><br />
          <input name="title" value={newPage.title} onChange={handleInputChange} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label>Roles (comma separated) *</label><br />
          <input name="roles" value={newPage.roles} onChange={handleInputChange} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label>Layout (JSON array)</label><br />
          <textarea name="layout" value={newPage.layout} onChange={handleInputChange} rows={4} style={{ width: '100%' }} placeholder='[{"type":"StatCard","props":{},"colSpan":1}]' />
        </div>
        <button type="submit" className="admin-btn" style={{ background: '#3b82f6', color: 'white' }}>Create Page</button>
      </form>

      <h3>Existing Pages</h3>
      <table className="admin-table">
        <thead>
          <tr><th>Slug</th><th>Title</th><th>Roles</th><th>Layout</th></tr>
        </thead>
        <tbody>
          {pages.map(p => (
            <tr key={p._id}>
              <td>{p.slug}</td>
              <td>{p.title}</td>
              <td>{p.roles && p.roles.join(', ')}</td>
              <td><pre style={{ maxHeight: '80px', overflow: 'auto' }}>{JSON.stringify(p.layout, null, 2)}</pre></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
