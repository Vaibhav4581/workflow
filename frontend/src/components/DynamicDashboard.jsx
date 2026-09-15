import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// Import newly created widgets
import StatCard from './widgets/StatCard';
import PieChartWidget from './widgets/PieChartWidget';
import BarChartWidget from './widgets/BarChartWidget';
import RecentFormsWidget from './widgets/RecentFormsWidget';

export default function DynamicDashboard({ children }) {
  const [widgets, setWidgets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfigAndStats = async () => {
      try {
        const tokenString = localStorage.getItem('token');
        if (!tokenString) return;
        const decoded = jwtDecode(tokenString);
        
        // Fetch dashboard config for the role
        const resConfig = await axios.get(`/api/admin/role-dashboard/${decoded.role}`);
        if (resConfig.data && resConfig.data.dashboardWidgets && resConfig.data.dashboardWidgets.length > 0) {
          setWidgets(resConfig.data.dashboardWidgets);
        }

        // Fetch actual stats
        const resStats = await axios.get(`/api/stats/dashboard?role=${decoded.role}&email=${decoded.email}`);
        setStats(resStats.data);
      } catch (err) {
        console.error("Failed to load dashboard config or stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfigAndStats();
  }, []);

  // Helper to render the correct widget based on config type
  const renderWidget = (widget) => {
    if (!stats) return null;

    switch (widget.type) {
      case 'StatCard':
        return <StatCard title={widget.title} value={stats.totalUsers || 0} />;
      case 'PieChart':
        return <PieChartWidget data={stats.formsByStatus} />;
      case 'BarChart':
        return <BarChartWidget data={stats.formsByDepartment} />;
      case 'RecentForms':
        return <RecentFormsWidget forms={stats.recentForms} />;
      default:
        return (
          <div style={{ padding: 20, background: '#f1f5f9', borderRadius: 8 }}>
            Unknown Widget Type: {widget.type}
          </div>
        );
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading your dashboard...</div>;
  }

  // If no dynamic widgets, just return the standard dashboard (fallback)
  if (widgets.length === 0) {
    return children;
  }

  // Render the Dynamic Layout
  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      <h2 style={{ margin: '0 0 24px', color: '#1e293b', fontSize: 24, fontWeight: 700 }}>
        Dashboard Overview
      </h2>
      
      {/* Dynamic Widgets Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
        gap: '24px',
        marginBottom: '40px'
      }}>
        {widgets.map((w, index) => (
          <div key={index} style={{ height: '100%' }}>
            {renderWidget(w)}
          </div>
        ))}
      </div>

      {/* Legacy Standard Dashboard (Below the dynamic widgets) */}
      <div style={{ 
        background: 'white', 
        padding: '24px', 
        borderRadius: '16px', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        border: '1px solid #f1f5f9'
      }}>
        <h3 style={{ margin: '0 0 16px', color: '#64748b', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
          Standard View
        </h3>
        {children}
      </div>
    </div>
  );
}
