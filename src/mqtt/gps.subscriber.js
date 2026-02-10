const mqtt = require("mqtt");
const { rtdb } = require("../config/firebase");

// ===== MQTT CONFIG =====
const MQTT_URL = "mqtt://192.168.1.189:1883"; // IP máy bạn
const TOPIC = "control/gps/+";

console.log("🚀 MQTT GPS Service starting...");

const client = mqtt.connect(MQTT_URL);

// ===== CONNECT =====
client.on("connect", () => {
  console.log("✅ MQTT connected to", MQTT_URL);

  client.subscribe(TOPIC, (err) => {
    if (err) {
      console.error("❌ Subscribe error:", err.message);
    } else {
      console.log("📡 Subscribed to topic:", TOPIC);
    }
  });
});

// ===== MESSAGE =====
client.on("message", async (topic, message) => {
  console.log("📥 MQTT MESSAGE RECEIVED");
  console.log("📌 Topic:", topic);
  console.log("📦 Raw:", message.toString());

  try {
    const payload = JSON.parse(message.toString());

    // topic: control/gps/{deviceId}
    const parts = topic.split("/");
    const deviceId = parts[2];

    const { lat, lng } = payload;

    if (!deviceId || lat == null || lng == null) {
      console.warn("⚠️ Invalid GPS data");
      return;
    }

    const ref = rtdb.ref(`locations/${deviceId}`);

    await ref.set({
      latitude: lat,
      longitude: lng,
      updatedAt: Date.now(),
    });

    console.log(`📍 GPS updated → device ${deviceId}`);
  } catch (err) {
    console.error("❌ MQTT GPS error:", err.message);
  }
});
