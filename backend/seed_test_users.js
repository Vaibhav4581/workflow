const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const mongoUrl = process.env.MONGO_URI || "mongodb://Adisankar:CB1E9r7mjPV5YLpq@ac-irtrr2z-shard-00-00.3nnx8jj.mongodb.net:27017,ac-irtrr2z-shard-00-01.3nnx8jj.mongodb.net:27017,ac-irtrr2z-shard-00-02.3nnx8jj.mongodb.net:27017/?ssl=true&replicaSet=atlas-czuifj-shard-0&authSource=admin&appName=Cluster0";

const logmodel = require('./models/User');

const ROLES = [
  'Student', 'FacultyAdvisor', 'HOD', 'JuniorSuperintendent', 'AO', 
  'VicePrincipal', 'Principal', 'CFO', 'Manager', 'AccountsSection', 
  'Driver', 'TransportinCharge', 'HRSection', 'MaintenanceSection', 'Faculty', 'Staff',
  'CollegeCouncil' // Not a real user usually, but just in case
];

async function seed() {
  await mongoose.connect(mongoUrl);
  console.log('Connected to DB');
  
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  for (const role of ROLES) {
    const email = `test_${role.toLowerCase()}@sngce.ac.in`;
    
    // Check if exists
    const existing = await logmodel.findOne({ email });
    if (!existing) {
      await new logmodel({
        name: `Test ${role}`,
        fName: 'Test',
        lName: role,
        email,
        password: hashedPassword,
        role: role,
        department: 'CSE' // Using CSE so FacultyAdvisor/HOD matches
      }).save();
      console.log(`Created ${role}`);
    } else {
      // Ensure department is CSE and password is correct for our tests
      existing.department = 'CSE';
      existing.password = hashedPassword;
      await existing.save();
      console.log(`Updated ${role}`);
    }
  }
  
  // Also create a test FacultyAdvisor assignment
  const fAdvisorModel = require('./models/facultyAdvisor');
  const faEmail = 'test_facultyadvisor@sngce.ac.in';
  
  const existingFa = await fAdvisorModel.findOne({ department: 'CSE', year: '3', div: 'A' });
  if (!existingFa) {
    await new fAdvisorModel({
      department: 'CSE',
      year: '3',
      div: 'A',
      facultyNames: [{ name: 'Test FacultyAdvisor', email: faEmail }]
    }).save();
    console.log('Created FacultyAdvisor assignment');
  } else {
    // Update it
    existingFa.facultyNames = [{ name: 'Test FacultyAdvisor', email: faEmail }];
    await existingFa.save();
    console.log('Updated FacultyAdvisor assignment');
  }

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
