const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const deviceController = require("../controllers/device.controller");
const admin = require("firebase-admin");
const db = admin.firestore();
const { updateDevice } = require("../controllers/device.controller");
router.post("/", authMiddleware, deviceController.addDevice);
const verifyToken = require("../middlewares/verifyToken");
// router.post("/", verifyToken, deviceController.addDevice);
router.post("/anti-theft", async (req, res) => {
  try {
    const { deviceId, antiThief } = req.body;

    if (!deviceId) {
      return res.status(400).json({ message: "deviceId is required" });
    }

    // 🔎 1. Tìm document theo field id
const snapshot = await db
  .collection("devices")
  .where("id", "==", deviceId)   // ✅ đúng
  .limit(1)
  .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "Device not found" });
    }

    const doc = snapshot.docs[0];
    const documentId = doc.id;

    // 🔥 2. Update đúng field trong map config
    await db.collection("devices").doc(documentId).update({
      "config.antiThief": antiThief,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      message: "Anti-theft updated successfully",
      documentId,
    });

  } catch (err) {
    console.error("❌ Firestore update failed:", err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/get-fcm-token", async (req, res) => {
  try {
    const { deviceId } = req.body;

    const snapshot = await db
      .collection("devices")
      .where("id", "==", deviceId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "Device not found" });
    }

    const deviceData = snapshot.docs[0].data();
    const fcmToken = deviceData.fcmToken || null;

    return res.status(200).json({
      deviceId,
      fcmToken,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

 
router.get("/", verifyToken, deviceController.getAllDevices);
router.post("/find-doc-id", verifyToken, deviceController.getDocIdById);
router.post(
  "/get-device-id",
  verifyToken,
  deviceController.getDeviceIdByDocumentId
  
);
router.post(
  "/get-devices-by-user",
  verifyToken,
  deviceController.getDevicesByUserId
);

router.delete("/delete-device", deviceController.deleteDevice);
router.put("/update-device",  verifyToken, updateDevice);
module.exports = router;
