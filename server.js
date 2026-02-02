/* ================= IMPORT ================= */

const mqtt = require("mqtt");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");


/* ================= FIREBASE ================= */

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://iot-chong-trom-xe-may-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

const rtdb = admin.database();


/* ================= MQTT ================= */

const MQTT_BROKER = "mqtt://10.37.4.44:1883";
const TOPIC = "duong/gps/data";

const client = mqtt.connect(MQTT_BROKER);


/* ================= CONNECT ================= */

client.on("connect", () => {

  console.log("✅ MQTT Connected");

  client.subscribe(TOPIC, err => {
    if (!err) {
      console.log("📡 Subscribed", TOPIC);
    }
  });

});


/* ================= RECEIVE ================= */

client.on("message", async (topic, message) => {

  try {

    const data = JSON.parse(message.toString());

    console.log("📥 Data:", data);

    /* ESP32 gửi field deviceID */
    const deviceID = data.deviceID;
    const lat = data.lat;
    const lng = data.lng;
    const time = data.time;

    if (!deviceID || !lat || !lng) {
      console.log("⚠️ Missing field");
      return;
    }


    /* ================= SAVE TO RTDB ================= */

    await rtdb.ref(`locations/${deviceID}`).set({

      latitude: lat,
      longitude: lng,
      time: time,

      updatedAt: admin.database.ServerValue.TIMESTAMP
    });


    console.log("✅ Saved to Firebase:", deviceID);


  } catch (err) {

    console.error("🔥 Error:", err.message);

  }

});


/* ================= ERROR ================= */

client.on("error", err => {

  console.error("❌ MQTT Error:", err.message);

});
