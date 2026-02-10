const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(
  path.join(__dirname, "../../serviceAccountKey.json")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://iot-chong-trom-xe-may-default-rtdb.asia-southeast1.firebasedatabase.app",
});

const rtdb = admin.database();

console.log("🔥 Firebase RTDB initialized");

module.exports = { rtdb };
module.exports = admin;
