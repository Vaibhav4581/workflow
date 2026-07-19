const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);
const Counter = require('./Counter');

const studentFormSchema = new mongoose.Schema({
    formNo: {
        type: Number,
        unique: true
    },
    date: {
        type: Date,
        required: true
    },
    to: {
        type: [String],
        required: true
    },
    category: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    subjectElaboration: {
        type: String
    },
    others: {
        type: String
    },
    department: {
        type: String,
        required : true
    },
    details: {
        type: String
    },
    attachment: {
        file: { type: Buffer},
        filename: { type: String},
        mimetype: { type: String}
    },
    attachments: [{
        file: { type: Buffer},
        filename: { type: String},
        mimetype: { type: String}
    }],
    status: {
        type: String,
        enum : ['awaiting', 'forwarded', 'accepted', 'approved', 'rejected', 'edit', 'not_approved', 'cancelled'],
        default: 'awaiting',
    },
    submittedBy : {
        type : String,
        required : true
    },
    year : {
        type: Number,
    },
    div : {
        type: String,
    },
    history: [
    {
        action: {
            type: String, // e.g., r'submitted', 'forwarded to principal', 'accepted by principal'
        },
        by: {
            type: String, // could be name, email, or role
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        remarks: {
            type : String
        }
    }
    ],
    currentHandler: {
        type: String // Optional: Who currently has the form (e.g., 'hod@college.edu')
    },
    remarks: {
        type: String
    }
}, { timestamps: true });

// Indexes for fast dashboard queries
studentFormSchema.index({ submittedBy: 1 });
studentFormSchema.index({ currentHandler: 1, status: 1 });
studentFormSchema.index({ department: 1, status: 1 });
studentFormSchema.index({ status: 1 });
studentFormSchema.index({ year: 1, div: 1 }); // For FacultyAdvisor lookups

studentFormSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const now = new Date();
      const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const currentFY = `${currentYear}-${currentYear + 1}`;

      const counter = await Counter.findOneAndUpdate(
        { _id: "globalFormId" },
        {},
        { new: true, upsert: true }
      );

      if (counter.financialYear !== currentFY) {
        counter.financialYear = currentFY;
        counter.seq = 1;
      } else {
        counter.seq += 1;
      }
      await counter.save();

      this.formNo = counter.seq;
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

// studentFormSchema.plugin(AutoIncrement, { inc_field: 'studentFormNo' });

const studentForm = mongoose.model("StudentForm", studentFormSchema);
module.exports = studentForm;