const admin = require("../config/firebase");
// const admin = require("firebase-admin");
const db = admin.firestore();

exports.createDevice = async (userId, data) => {
  const {
    deviceId,
    verificationCode,
    brand,
    model,
    color,
    licensePlate
  } = data;

  await db.collection("devices").add({
    id: deviceId,
    userId: userId,
    verificationCode: verificationCode,
    status: 1,

    config: {
      antiThief: false
    },

    vehicle: {
      brand,
      model,
      color,
      licensePlate
    },

    properties: {
      lastMakeCallTime: null,
      lastSendSmsTime: null,
      lastPushNotificationTime: null
    },

    locations: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
};
exports.updateAntiTheft = async (userId, deviceId, antiTheft) => {
  const deviceRef = db.collection("devices").doc(deviceId);
  const snap = await deviceRef.get();

  if (!snap.exists) {
    throw new Error("Device not found");
  }

  if (snap.data().userId !== userId) {
    throw new Error("Permission denied");
  }

  await deviceRef.update({
    antiTheft,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
};