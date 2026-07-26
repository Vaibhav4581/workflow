const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  fName: String,
  lName: String,
  email: String,
  password: String,
  role: String,
  department: String,
  year: Number,
  div: String,
});

const User = mongoose.model('User', userSchema, 'users');

async function run() {
  await mongoose.connect(process.env.mongo_url);
  console.log('Connected');

  const users = await User.find({ role: { $not: /^admin$/i } });
  console.log(`Found ${users.length} non-admin users`);

  const hashed = await bcrypt.hash('Sngce@123', 10);
  const result = await User.updateMany(
    { role: { $not: /^admin$/i } },
    { $set: { password: hashed } }
  );

  console.log(`Updated ${result.modifiedCount} users to password: Sngce@123`);
  await mongoose.disconnect();
}

run().catch(console.error);
