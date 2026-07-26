require('./connection');
const fFormModel = require('./models/facultyForm');
setTimeout(async () => {
  await fFormModel.updateMany({ category: /VehicleRelated/i, to: { $size: 0 } }, { $set: { to: ['TransportinCharge'] } });
  console.log('Updated');
  process.exit(0);
}, 2000);
