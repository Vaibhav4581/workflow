const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

const rolesToSeed = [
  'HOD',
  'Principal',
  'JuniorSuperintendent',
  'CFO',
  'Manager',
  'AO',
  'TransportinCharge',
  'VicePrincipal',
  'CollegeCouncil',
  'MaintenanceSection',
  'FacultyAdvisor',
  'AccountsSection',
  'HRSection',
  'Driver',
  'Staff'
];

async function seed() {
  try {
    // Connect to DB (assuming the URL is the same as in index.js)
    // Note: If you use dotenv in index.js, we need to load it
    require('dotenv').config();
    const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017/workflow'; // fallback if not set
    await mongoose.connect(mongoURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to DB');

    const defaultPassword = await bcrypt.hash('Sngce@123', 10);

    for (const role of rolesToSeed) {
      // Check if user with this role already exists
      const existingUser = await User.findOne({ role: role });
      
      if (!existingUser) {
        // Create dummy user
        const dummyEmail = `${role.toLowerCase()}@example.com`;
        
        // Ensure email doesn't clash with an existing user of another role
        const emailExists = await User.findOne({ email: dummyEmail });
        
        if (!emailExists) {
          const newUser = new User({
            fName: 'Dummy',
            lName: role,
            email: dummyEmail,
            password: defaultPassword,
            role: role,
            department: 'CSE', // Just a dummy department
          });
          
          await newUser.save();
          console.log(`Created dummy user for role: ${role} (${dummyEmail})`);
        } else {
          console.log(`Could not create ${role}: email ${dummyEmail} already in use.`);
        }
      } else {
        console.log(`Role ${role} already exists.`);
      }
    }
    
    console.log('Seeding complete.');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    mongoose.connection.close();
  }
}

seed();
