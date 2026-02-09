const userService = require("../services/user.service");
const admin = require("../config/firebase"); 
exports.fillInformation = async (req, res) => {
  try {
    const { idToken, fullname, address, birthday, citizenNumber, fcmToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "Missing idToken" });
    }

    await userService.updateProfile(idToken, {
      fullname,
      address,
      birthday,
      citizenNumber,
       fcmToken
    });

    res.status(200).json({
      message: "Profile saved successfully"
    });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
};;

exports.saveFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const uid = req.user.uid; // từ authMiddleware

    if (!fcmToken) {
      return res.status(400).json({
        message: "Missing fcmToken",
      });
    }

    await admin.firestore().collection("users").doc(uid).set(
      {
        fcmToken,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.json({
      message: "FCM token saved successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Save FCM token failed",
    });
  }
};