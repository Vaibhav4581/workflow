require('dotenv').config();
const mongoose = require('mongoose');
const StudentForm = require('./models/studentForm');
const FacultyForm = require('./models/facultyForm');
const Counter = require('./models/Counter'); // Assuming there is a counter model

const mongo_url = process.env.mongo_url;

async function clearForms() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongo_url);
    console.log('Connected.');
    
    console.log('Deleting student forms...');
    const result1 = await StudentForm.deleteMany({});
    console.log(`Deleted ${result1.deletedCount} student forms.`);
    
    console.log('Deleting faculty forms...');
    const result2 = await FacultyForm.deleteMany({});
    console.log(`Deleted ${result2.deletedCount} faculty forms.`);

    if (Counter) {
      console.log('Resetting form counters...');
      await Counter.deleteMany({ id: { $in: ['studentFormId', 'facultyFormId', 'formId'] } });
      console.log('Counters reset.');
    }

    console.log('Successfully cleared all forms.');
  } catch (err) {
    console.error('Error clearing forms:', err);
  } finally {
    mongoose.connection.close();
  }
}

clearForms();
