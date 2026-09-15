const mongoose = require('mongoose');
require('./connection');
const Department = require('./models/Department');

async function test() {
  try {
    const depts = await Department.find();
    console.log("Depts:", depts);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

test();
