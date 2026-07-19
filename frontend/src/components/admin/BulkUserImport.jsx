import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import './BulkUserImport.css';

const BulkUserImport = ({ onImportSuccess }) => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [importedUsers, setImportedUsers] = useState(null);
  const [errors, setErrors] = useState(null);

  const handleFileChange = e => {
    setFile(e.target.files[0]);
    setStatus('');
    setImportedUsers(null);
    setErrors(null);
  };

  const parseFile = async (blob) => {
    const fileExt = file.name.split('.').pop().toLowerCase();

    if (fileExt === 'csv') {
      return new Promise((resolve, reject) => {
        Papa.parse(blob, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => resolve(res.data),
          error: (err) => reject(err),
        });
      });
    }

    if (['xlsx', 'xls', 'xlsm'].includes(fileExt)) {
      const data = await blob.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json(ws, { defval: '' });
    }

    throw new Error('Unsupported file type');
  };

  const handleUpload = async () => {
    if (!file) return setStatus('⚠️ Choose a file first');

    setLoading(true);
    setStatus('Processing...');
    
    try {
      const rows = await parseFile(file);
      if (!rows.length) {
        setLoading(false);
        return setStatus('⚠️ File appears empty');
      }

      const res = await axios.post('/api/users/bulk', { users: rows });
      
      setStatus(`✅ ${res.data.created} created, ${res.data.updated} updated successfully.`);
      if (res.data.createdDetails && res.data.createdDetails.length > 0) {
        setImportedUsers(res.data.createdDetails);
      }
      if (res.data.errors && res.data.errors.length > 0) {
        setErrors(res.data.errors);
      }
      
      if ((res.data.created > 0 || res.data.updated > 0) && onImportSuccess) {
        onImportSuccess();
      }

    } catch (e) {
      console.error(e);
      setStatus(`❌ ${e.response?.data?.error || e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      { fName: 'John', lName: 'Doe', email: 'john@example.com', department: 'CSE', role: 'Student', year: 2024, div: 'A', password: 'optional_password' }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    XLSX.writeFile(wb, 'User_Import_Template.xlsx');
  };

  return (
    <div className="bulk-import">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Bulk User Import (CSV / Excel)</h3>
        <button className="admin-btn" style={{ background: '#4b5563', color: 'white' }} onClick={downloadTemplate}>Download Template</button>
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <input 
          type="file"
          accept=".csv,.xlsx,.xls,.xlsm"
          onChange={handleFileChange}
          style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', flex: 1 }}
        />
        <button 
          className="admin-btn" 
          onClick={handleUpload}
          disabled={loading || !file}
          style={{ background: '#3b82f6', color: 'white', opacity: (loading || !file) ? 0.6 : 1 }}
        >
          {loading ? 'Uploading...' : 'Upload & Create'}
        </button>
      </div>
      
      {status && <p className="status" style={{ marginTop: '1rem', fontWeight: 'bold' }}>{status}</p>}

      {importedUsers && (
        <div style={{ marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#1f2937' }}>
          <h4>Generated Accounts & Passwords</h4>
          <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Please save these temporary passwords and share them with the users.</p>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '4px', borderBottom: '1px solid #cbd5e1' }}>Email</th>
                  <th style={{ padding: '4px', borderBottom: '1px solid #cbd5e1' }}>Temp Password</th>
                </tr>
              </thead>
              <tbody>
                {importedUsers.map((u, i) => (
                  <tr key={i}>
                    <td style={{ padding: '4px', borderBottom: '1px solid #e2e8f0' }}>{u.email}</td>
                    <td style={{ padding: '4px', borderBottom: '1px solid #e2e8f0', fontFamily: 'monospace' }}>{u.tempPassword || '***'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {errors && (
        <div style={{ marginTop: '1rem', background: '#fef2f2', padding: '1rem', borderRadius: '8px', border: '1px solid #fca5a5', color: '#991b1b' }}>
          <h4>Errors encountered</h4>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
            {errors.map((e, i) => (
              <li key={i}><strong>{e.email || 'Unknown'}</strong>: {e.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BulkUserImport;
