const mongoose = require('mongoose');

const roleDashboardConfigSchema = mongoose.Schema({
  role: {
    type: String, // e.g., 'Principal', 'HOD', 'Student', 'Faculty'
    required: true,
    unique: true,
  },
  permissions: {
    canViewReceived: { type: Boolean, default: true },
    canViewSubmissions: { type: Boolean, default: true },
    canApprove: { type: Boolean, default: false },
    canDeleteUsers: { type: Boolean, default: false },
  },
  dashboardWidgets: [{
    id: { type: String, required: true },
    type: { type: String, required: true }, // e.g. 'PieChart', 'StatCard', 'RecentForms'
    title: { type: String, required: true },
    dataSource: { type: String }, // e.g. 'FormsByStatus', 'TotalUsers'
    gridArea: { type: String }, // optional layout string
    config: { type: mongoose.Schema.Types.Mixed } // Flexible JSON for specific widget needs
  }]
}, { timestamps: true });

const RoleDashboardConfig = mongoose.model('RoleDashboardConfig', roleDashboardConfigSchema);
module.exports = RoleDashboardConfig;
