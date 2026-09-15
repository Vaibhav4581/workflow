const mongoose = require("mongoose");
require("dotenv").config();

const mongourl = process.env.mongo_url;
const mongoDirect = process.env.mongo_url_direct; // Use when SRV DNS is blocked (e.g. querySrv ECONNREFUSED)

const opts = { serverSelectionTimeoutMS: 10000 };

function tryConnect(url) {
  return mongoose.connect(url, opts).then(() => {
    console.log("Connected to DB");
  });
}

function onFail(error, usedDirect) {
  const srvBlocked = /querySrv|ECONNREFUSED|ENOTFOUND/.test(error.message);
  console.error("MongoDB connection failed:", error.message);
  if (srvBlocked && !usedDirect && !mongoDirect) {
    console.error(
      "SRV may be blocked (firewall/school network). In Atlas: Connect → Drivers → copy the 'Standard' (non-SRV) connection string, then in .env add: mongo_url_direct=<that string>"
    );
  } else {
    console.error("Check: 1) Internet  2) Atlas cluster running  3) IP in Atlas Network Access  4) Correct URL in .env");
  }
}

if (mongoDirect) {
  tryConnect(mongoDirect).catch((err) => onFail(err, true));
} else if (mongourl) {
  tryConnect(mongourl).catch((err) => onFail(err, false));
} else {
  console.warn("Warning: mongo_url not set in .env. Database features will not work.");
}