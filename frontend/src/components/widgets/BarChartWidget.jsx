import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function BarChartWidget({ data }) {
  if (!data || data.length === 0) return <div style={{padding: 20}}>No data available</div>;

  return (
    <div style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', padding: 24, borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: 350, display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 16px', color: '#1e293b', fontSize: 18 }}>Forms by Department</h3>
      <div style={{ flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} />
            <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
