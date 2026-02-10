const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const deviceController = require("../controllers/device.controller");
const admin = require("firebase-admin");
const db = admin.firestore();
router.post("/", authMiddleware, deviceController.addDevice);
router.post("/anti-theft", async (req, res) => {
  try {
    const { idToken, deviceId, antiTheft } = req.body;

    if (!idToken || !deviceId || typeof antiTheft !== "boolean") {
      return res.status(400).json({ message: "Missing or invalid data" });
    }

    // ✅ Verify idToken
    const decoded = await admin.auth().verifyIdToken(idToken);
    const userId = decoded.uid;

    // ✅ Lấy device theo documentId
    const deviceRef = db.collection("devices").doc(deviceId);
    const deviceSnap = await deviceRef.get();

    if (!deviceSnap.exists) {
      return res.status(404).json({ message: "Device not found" });
    }

    // ✅ Check quyền sở hữu
    if (deviceSnap.data().userId !== userId) {
      return res.status(403).json({ message: "Not your device" });
    }

    // ✅ Update anti-theft
    await deviceRef.update({
      "config.antiThief": antiTheft,
      "properties.lastMakeCallTime": admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({
      message: "Anti-theft updated",
      antiTheft,
    });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: err.message });
  }
});

module.exports = router;
