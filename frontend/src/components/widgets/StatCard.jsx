import React from 'react';
import { Users } from 'lucide-react';

export default function StatCard({ title, value }) {
  return (
    <div style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', padding: 24, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.4)' }}>
      <div>
        <p style={{ margin: 0, color: '#64748b', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</p>
        <h2 style={{ margin: '8px 0 0', color: '#0f172a', fontSize: 36, fontWeight: 700 }}>{value}</h2>
      </div>
      <div style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', padding: 16, borderRadius: '50%', color: 'white', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }}>
        <Users size={28} />
      </div>
    </div>
  );
}
