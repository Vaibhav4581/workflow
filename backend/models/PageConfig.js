const mongoose = require('mongoose');

const pageConfigSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  roles: [{ type: String }], // roles that can view this page
  layout: [{
    type: { type: String, required: true }, // widget type e.g., 'StatCard', 'PieChart'
    props: { type: Object, default: {} }, // widget specific props
    colSpan: { type: Number, default: 1 }, // grid column span
    rowSpan: { type: Number, default: 1 }, // grid row span
    order: { type: Number, default: 0 }
  }]
}, { timestamps: true });

module.exports = mongoose.model('PageConfig', pageConfigSchema);
