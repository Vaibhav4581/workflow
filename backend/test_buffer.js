const mongoose = require('mongoose');
require('dotenv').config();

const schema = new mongoose.Schema({
  file: { type: Buffer }
});
const TestModel = mongoose.model('TestAttachment', schema);

async function test() {
  await mongoose.connect(process.env.mongo_url);
  console.log('Connected');
  
  const base64str = Buffer.from('Hello world this is a test file').toString('base64');
  console.log('Original base64:', base64str);

  const doc = new TestModel({ file: base64str });
  await doc.save();
  console.log('Saved to DB');

  const retrieved = await TestModel.findById(doc._id);
  console.log('Retrieved type of file:', typeof retrieved.file);
  console.log('Retrieved isBuffer:', Buffer.isBuffer(retrieved.file));
  
  const toObj = retrieved.toObject();
  const json = JSON.stringify(toObj);
  console.log('JSON.stringify output:', json);
  
  await TestModel.deleteOne({ _id: doc._id });
  mongoose.connection.close();
}

test().catch(console.error);
