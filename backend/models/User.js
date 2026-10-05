var mongoose = require('mongoose');
const userSchema = mongoose.Schema({
  fName :{
    type : String,
    required : true,
  },
  lName :{
    type : String,
    required : true,
  },
  department :{
    type: String
  },
  email: {
    type: String, 
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String, 
    required: true
  },
  div : {
    type: String
  },
  year : {
    type: Number
  },
  // TEMPORARY: User-defined username for login. Will be removed later.
  username: {
    type: String,
    unique: true,
    sparse: true, // allows multiple users to have no username (null)
    trim: true,
  },
}, { timestamps: true });

// Index for role-based queries (admin dashboards)
userSchema.index({ role: 1 });
userSchema.index({ email: 1 }); // email is already unique, this makes it explicit

var User=mongoose.model("User",userSchema);
module.exports=User;