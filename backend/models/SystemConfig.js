const mongoose = require('mongoose');

const systemConfigSchema = mongoose.Schema({
  configType: {
    type: String, // e.g., 'subject', 'category', 'generalSettings'
    required: true,
  },
  value: {
    type: String, // The actual subject name or category name
    required: true,
  },
  department: {
    type: String, // Optional: if a subject belongs to a specific department
  },
  isActive: {
    type: Boolean,
    default: true
  },
  canBeAcceptedAtHodLevel: {
    type: Boolean,
    default: false
  }
} , { timestamps: true });

const SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);
module.exports = SystemConfig;
