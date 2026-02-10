const deviceService = require("../services/device.service");
// const admin = require("firebase-admin");
// const db = admin.firestore();
exports.addDevice = async (req, res) => {
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
 
    res.status(201).json({
      message: "Device added successfully",
       
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.setAntiTheft = async (req, res) => {
  try {
    const { deviceId, antiTheft } = req.body;
    const userId = req.user.uid;

    await deviceService.updateAntiTheft(deviceId, userId, antiTheft);

    res.json({
      message: "Anti-theft updated",
      antiTheft,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
