import React from 'react';
import { Clock } from 'lucide-react';

export default function RecentFormsWidget({ forms }) {
  if (!forms || forms.length === 0) return <div style={{padding: 20}}>No recent forms</div>;

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'approved': return { bg: '#d1fae5', text: '#059669' };
      case 'rejected': return { bg: '#fee2e2', text: '#dc2626' };
      case 'awaiting': return { bg: '#fef3c7', text: '#d97706' };
      default: return { bg: '#e0e7ff', text: '#4f46e5' };
    }
  };

  return (
    <div style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', padding: 24, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: 350, display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 20px', color: '#1e293b', fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Clock size={20} color="#64748b" />
        Recent Submissions
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
        {forms.map(form => {
          const colors = getStatusColor(form.status);
          return (
            <div key={form._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: '#334155' }}>{form.subject || 'Submission'}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>{new Date(form.date).toLocaleDateString()} • {form.type}</p>
              </div>
              <div style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: colors.bg, color: colors.text }}>
                {form.status || 'UNKNOWN'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
