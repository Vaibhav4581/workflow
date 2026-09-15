const mongoose = require("mongoose");

const counterSchema = mongoose.Schema({
  _id: { type: String, required: true }, // e.g., 'formId'
  seq: { type: Number, default: 0 },
  financialYear: { type: String, default: "" }
});

const Counter = mongoose.model("Counter", counterSchema);

module.exports = Counter