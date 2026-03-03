const deviceService = require("../services/device.service");
const { admin, db } = require("../config/firebase");
const { saveActionNotification } = require("../services/actionNotification.service");
const addDevice = async (req, res) => {
  try {
    const userId = req.user.uid;
    const deviceData = req.body;

    const {
      deviceId,
      verificationCode,
      brand,
      model,
      color,
      licensePlate
    } = req.body;

    if (!deviceId || !verificationCode) {
      return res.status(400).json({ message: "Missing deviceId or verificationCode" });
    }

    await deviceService.createDevice(userId, {
      deviceId,
      verificationCode,
      brand,
      model,
      color,
      licensePlate
    });
 // ===== LẤY DEVICE VỪA TẠO =====
const snapshot = await db
  .collection("devices")
  .where("userId", "==", userId)
  .where("id", "==", deviceId)
  .limit(1)
  .get();

if (!snapshot.empty) {
  const doc = snapshot.docs[0];
  const deviceData = doc.data();

  await saveActionNotification(
    "ADD_DEVICE",
    "New device added successfully",
    userId,
    doc.id,
    deviceData.id
  );
}
    res.status(201).json({
      message: "Device added successfully",
       
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const setAntiTheft = async (req, res) => {
  try {
    const { id, antiTheft } = req.body;

await deviceService.updateAntiTheft(req.user.uid, id, antiTheft);

    const userId = req.user.uid;

    // await deviceService.updateAntiTheft(deviceId, userId, antiTheft);

    res.json({
      message: "Anti-theft updated",
      antiTheft,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
const getAllDevices = async (req, res) => {
  try {
    const devices = await deviceService.getAllDevices();

    return res.status(200).json({
      success: true,
      count: devices.length,
      data: devices,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
const getDocIdById = async (req, res) => {
  try {
    const { id } = req.body;

    // 👇 thêm dòng này
    const userId = req.user.uid;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required",
      });
    }

    const docId = await deviceService.getDocumentIdByCustomId(id, userId);

    return res.status(200).json({
      success: true,
      docId,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


const getDeviceIdByDocumentId = async (req, res) => {
  try {
    const { documentId } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: "documentId is required",
      });
    }

    const deviceId = await deviceService.getDeviceInnerId(documentId);

    return res.status(200).json({
      success: true,
      deviceId: deviceId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const getDevicesByUserId = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing userId in request body"
      });
    }

    const devices = await deviceService.getDevicesByUserId(userId);

    return res.status(200).json({
      success: true,
      count: devices.length,
      data: devices
    });

  } catch (err) {
    console.error("❌ getDevicesByUserId error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

const { deleteDeviceByIdAndUid } = require("../services/device.service");
const deleteDevice = async (req, res) => {
  try {
    const idToken = req.headers.authorization?.split("Bearer ")[1];
    const { deviceID } = req.body;

    if (!idToken) {
      return res.status(401).json({ message: "Missing idToken" });
    }

    if (!deviceID) {
      return res.status(400).json({ message: "deviceID is required" });
    }

    // ✅ Verify token trước
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // ✅ Lấy uid từ token
    const uid = decodedToken.uid;

    // 🔎 LOG DEBUG
    console.log("========== DELETE DEVICE DEBUG ==========");
    console.log("UID từ token:", uid);
    console.log("DeviceID từ body:", deviceID);
    console.log("=========================================");
// ===== LẤY DEVICE TRƯỚC KHI XÓA =====
const snapshot = await db
  .collection("devices")
  .where("id", "==", deviceID)
  .where("userId", "==", uid)
  .limit(1)
  .get();

let docId = null;
let realDeviceId = null;

if (!snapshot.empty) {
  const doc = snapshot.docs[0];
  docId = doc.id;
  realDeviceId = doc.data().id;
}
    // ✅ Gọi service
    const result = await deleteDeviceByIdAndUid(deviceID, uid);

    if (result.error) {
      return res.status(404).json({ message: result.error });
    }
if (docId && realDeviceId) {
  await saveActionNotification(
    "DELETE_DEVICE",
    "Device removed from account",
    uid,
    docId,
    realDeviceId
  );
}
    return res.status(200).json({
      message: "Device deleted successfully"
    });

  } catch (error) {
    console.error("❌ deleteDevice error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};
const updateDevice = async (req, res) => {
  try {
    const uid = req.user.uid;

    const {
      id,
      brand,
      color,
      licensePlate,
      model,
      verificationCode
    } = req.body;

    if (!id || !verificationCode) {
      return res.status(400).json({
        message: "Device id and verificationCode are required"
      });
    }

    // 1️⃣ Tìm device theo id + owner
    const snapshot = await db
      .collection("devices")
      .where("id", "==", id)
      .where("userId", "==", uid)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({
        message: "Device not found or not owned by user"
      });
    }

    const doc = snapshot.docs[0];
    const deviceData = doc.data();

    // 2️⃣ Kiểm tra verificationCode
    if (deviceData.verificationCode !== verificationCode) {
      return res.status(403).json({
        message: "Invalid verification code"
      });
    }

    // 3️⃣ Nếu đúng mới update
    await doc.ref.update({
      "vehicle.brand": brand,
      "vehicle.color": color,
      "vehicle.licensePlate": licensePlate,
      "vehicle.model": model,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
await saveActionNotification(
  "UPDATE_DEVICE",
  "Device information updated",
  uid,
  doc.id,
  deviceData.id
);
    return res.status(200).json({
      message: "Device updated successfully"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};
module.exports = {
  deleteDevice,
  addDevice,
  setAntiTheft,
  getAllDevices,
  getDocIdById,
  getDeviceIdByDocumentId,
  getDevicesByUserId,
  updateDevice,

};