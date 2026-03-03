const { admin } = require("../config/firebase");  
// const admin = require("firebase-admin");
const { db } = require("../config/firebase");

const createDevice = async (userId, data) => {
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
const updateAntiTheft = async (userId, deviceId, antiTheft) => {
  // 🔍 Tìm document có field id === deviceId
  const snapshot = await db
    .collection("devices")
    .where("id", "==", deviceId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new Error("Device not found");
  }

  const deviceDoc = snapshot.docs[0];
  const deviceData = deviceDoc.data();

  // 🔐 Check chủ sở hữu
  if (deviceData.userId !== userId) {
    throw new Error("Permission denied");
  }

  // ✅ Update
  await deviceDoc.ref.update({
    "config.antiTheft": antiTheft,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    message: "Anti-theft updated successfully",
  };
};
const getAllDevices = async () => {
  const snapshot = await db.collection("devices").get();

  if (snapshot.empty) {
    return [];
  }

  const devices = [];

  snapshot.forEach((doc) => {
    devices.push({
      docId: doc.id,   // document ID
      ...doc.data(),   // fields bên trong document
    });
  });

  return devices;
};
const getDocumentIdByCustomId = async (customId, userId) => {
  const snapshot = await db
    .collection("devices")
    .where("id", "==", customId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new Error("Device not found");
  }

  return snapshot.docs[0].id;
};


const getDeviceInnerId = async (documentId) =>  {
  const docRef = db.collection("devices").doc(documentId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    throw new Error("Device not found");
  }

  const data = docSnap.data();
  return data.id;
}
const getDevicesByUserId = async (userId) => {
  const snapshot = await db
    .collection("devices")
    .where("userId", "==", userId)
    .get();

  if (snapshot.empty) return [];

  const devices = snapshot.docs.map(doc => {
    const data = doc.data();

    return {
      id: data.id || doc.id,
      antiThief: data.config?.antiThief || false,
      brand: data.vehicle?.brand || "",
      color: data.vehicle?.color || "",
      licensePlate: data.vehicle?.licensePlate || "",
      model: data.vehicle?.model || ""
    };
  });

  return devices;
};

const deleteDeviceByIdAndUid = async (deviceID, uid) => {

  const snapshot = await db
    .collection("devices")
    .where("id", "==", deviceID)
    .where("userId", "==", uid)   // 🔥 đổi uid -> userID
    .get();

  if (snapshot.empty) {
    return { error: "Device not found or not owned by user" };
  }

  const batch = db.batch();

  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  return { success: true };
};

module.exports = {
    createDevice,
  updateAntiTheft,
  getAllDevices,
  getDocumentIdByCustomId,
  getDeviceInnerId,
  getDevicesByUserId,
  // deleteDeviceById,
  // deleteDeviceByFieldId,
  deleteDeviceByIdAndUid,
};