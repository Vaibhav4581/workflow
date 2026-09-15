import { ROLES, isRole } from '../utils/roles';
                  import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import './MySubmission.css';

function MySubmission() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Load received messages from localStorage
  const [receivedMessages, setReceivedMessages] = useState(
    JSON.parse(localStorage.getItem('receivedMessages') || '[]')
  );
  // Load remarks/actions from localStorage (object keyed by message id)
  const [remarks, setRemarks] = useState(
    JSON.parse(localStorage.getItem('receivedRemarks') || '{}')
  );

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    let decoded;
    try {
      decoded = jwtDecode(token);
    } catch (err) {
      setError('Invalid token');
      setLoading(false);
      return;
    }
    const email = decoded.email;
    const role = decoded.role;
    const fetchSubmissions = async () => {
      try {
        let url = '';
        if (isRole(role, ROLES.STUDENT)) {
          url = `/getSFormsByUser?email=${encodeURIComponent(email)}`;
        } else {
          url = `/getFFormsByUser?email=${encodeURIComponent(email)}`;
        }
        const res = await axios.get(url);
        setSubmissions(res.data || []);
      } catch (err) {
        setError('Failed to fetch submissions');
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [navigate]);

  // Handle input changes for remarks and actions
  const handleInputChange = (id, field, value) => {
    setRemarks(prev => {
      const updated = { ...prev, [id]: { ...prev[id], [field]: value } };
      return updated;
    });
  };

  // Save remarks/actions to localStorage
  const handleSave = (id) => {
    localStorage.setItem('receivedRemarks', JSON.stringify(remarks));
    alert('Saved!');
  };

  if (loading) {
    return <div className="loading">Loading submissions...</div>;
  }
  if (error) {
    return <div className="error">{error}</div>;
  }
  if (!submissions.length && !receivedMessages.length) {
    return <div className="no-data">No submissions or received messages found.</div>;
  }

  return (
    <div className="my-submission-container">
      <div className="my-submission-header">
        <h2>My Submissions</h2>
      </div>
              {submissions.length > 0 && (
          <table className="my-submission-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Department</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(sub => (
                <tr key={sub._id}>
                  <td>{sub.subject}</td>
                  <td>{sub.department}</td>
                  <td>{sub.createdAt ? new Date(sub.createdAt).toLocaleString() : (sub.date ? new Date(sub.date).toLocaleDateString() : '')}</td>
                  <td>
                    <button className="view-print-btn" onClick={() => alert('View/Print not implemented in demo')}>View/Print</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      <div className="received-messages-section">
        <h3>Received Messages</h3>
        {receivedMessages.length === 0 ? (
          <div className="no-data">No received messages found.</div>
        ) : (
          receivedMessages.map(msg => (
            <div key={msg.id} className="message-card">
              <div className="message-header">
                <div className="message-subject">{msg.subject}</div>
                <div className="message-date">{msg.date}</div>
              </div>
              <div className="message-content">
                <strong>From:</strong> {msg.from || '-'}
              </div>
              <div className="remarks-section">
                <h4>Remarks:</h4>
                <textarea
                  className="remarks-input"
                  value={remarks[msg.id]?.remarks || ''}
                  onChange={e => handleInputChange(msg.id, 'remarks', e.target.value)}
                  placeholder="Add your remarks here..."
                />
                <h4>Action Taken:</h4>
                <textarea
                  className="remarks-input"
                  value={remarks[msg.id]?.action || ''}
                  onChange={e => handleInputChange(msg.id, 'action', e.target.value)}
                  placeholder="Describe action taken..."
                />
                <button className="save-btn" onClick={() => handleSave(msg.id)}>Save</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default MySubmission; 
