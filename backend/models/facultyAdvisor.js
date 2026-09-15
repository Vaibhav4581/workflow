const mongoose = require('mongoose')
const FacultyAdvisorSchema = mongoose.Schema({
    year : {
        type : Number
    },
    div : {
      type : String,
    },
    department : {
        type : String
    },
    facultyNames: [
        {
          name: { type: String, required: true },
          email: { type: String, required: true }
        }
      ]
})

const facultyAdvisor = mongoose.model("FacultyAdvisor", FacultyAdvisorSchema);
module.exports = facultyAdvisor;