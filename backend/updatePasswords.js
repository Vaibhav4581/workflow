const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

const rolesToSeed = [
  'Principal',
  'JuniorSuperintendent',
  'CFO',
  'Manager',
  'AO',
  'TransportinCharge',
  'VicePrincipal',
  'CollegeCouncil',
  'MaintenanceSection',
];

async function updatePasswords() {
  try {
    require('dotenv').config();
    const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017/workflow';
    await mongoose.connect(mongoURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to DB');

    const newPasswordHash = await bcrypt.hash('Sngce@123', 10);

    for (const role of rolesToSeed) {
      const dummyEmail = `${role.toLowerCase()}@example.com`;
      const user = await User.findOne({ email: dummyEmail });
      
      if (user) {
        user.password = newPasswordHash;
        await user.save();
        console.log(`Updated password for ${dummyEmail}`);
      }
    }
    
    console.log('Password update complete.');
  } catch (error) {
    console.error('Error during password update:', error);
  } finally {
    mongoose.connection.close();
  }
}

updatePasswords();
