const userService = require("../services/user.service");
// const admin = require("../config/firebase"); 
const { admin, db } = require("../config/firebase");
const { saveActionNotification } = require("../services/actionNotification.service");
const fillInformation = async (req, res) => {
  try {
    // Lấy idToken từ Header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(400).json({ message: "Missing Authorization token" });
    }

    const idToken = authHeader.split(" ")[1];

    const {
      fullname,
      address,
      birthday,
      citizenNumber,
      fcmToken
    } = req.body;

    await userService.updateProfile(idToken, {
      fullname,
      address,
      birthday,
      citizenNumber,
      phoneNmber, // giữ nguyên theo code bạn
      fcmToken
    });
const decoded = await admin.auth().verifyIdToken(idToken);
const userId = decoded.uid;

// Lấy 1 device của user
const snapshot = await db
  .collection("devices")
  .where("userId", "==", userId)
  .limit(1)
  .get();

if (!snapshot.empty) {
  const doc = snapshot.docs[0];
  const deviceData = doc.data();

  await saveActionNotification(
    "FILL_INFORMATION",
    "User completed profile information",
    userId,
    doc.id,
    deviceData.id
  );
}
    res.status(200).json({
      message: "Profile saved successfully"
    });

  } catch (err) {
    res.status(401).json({ message: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const uid = req.user.uid; // lấy từ middleware

    const {
      address,
      citizenNumber,
      dateOfBirth,
      fullName,
      phoneNumber
    } = req.body;

    if (
      !address ||
      !citizenNumber ||
      !dateOfBirth ||
      !fullName ||
      !phoneNumber
    ) {
      return res.status(400).json({
        message: "Missing required fields"
      });
    }

    await userService.updateUserProfile(uid, {
      address,
      citizenNumber,
      dateOfBirth,
      fullName,
      phoneNumber
    });
const snapshot = await db
  .collection("devices")
  .where("userId", "==", uid)
  .limit(1)
  .get();

if (!snapshot.empty) {
  const doc = snapshot.docs[0];
  const deviceData = doc.data();

  await saveActionNotification(
    "UPDATE_PROFILE",
    "User profile updated successfully",
    uid,
    doc.id,
    deviceData.id
  );
}
    res.status(200).json({
      message: "Update profile successfully"
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message
    });
  }
};

const saveFcmToken = async (req, res) => {
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
const updateFcmToken = async (req, res) => {
  try {
    const uid = req.user.uid; // lấy từ verifyToken
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ message: "fcmToken is required" });
    }

    // Update document user theo UID
    await db.collection("users").doc(uid).set(
      {
        fcmToken: fcmToken,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.status(200).json({
      message: "FCM token updated successfully",
      uid,
      fcmToken,
    });

  } catch (error) {
    console.error("Update FCM failed:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};
// const getUserProfile = async (req, res) => {
//   try {
//     const { uid } = req.body;

//     if (!uid) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing uid in request body",
//       });
//     }

//     // users/{uid}
//     const userDoc = await db.collection("users").doc(uid).get();

//     if (!userDoc.exists) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     const userData = userDoc.data();

//     return res.status(200).json({
//       success: true,
//       data: {
//         name: userData.name || "",
//         dob: userData.dob || "",
//         address: userData.address || "",
//         phoneNumber: userData.phoneNumber || "",
//         citizenId: userData.citizenId || "",
//       },
//     });
//   } catch (err) {
//     console.error("❌ getUserProfile error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };
const getUserProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Missing or invalid token",
      });
    }

    const idToken = authHeader.split("Bearer ")[1];

    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    if (decodedToken.uid !== userId) {
      return res.status(403).json({
        success: false,
        message: "userId does not match token",
      });
    }

    const userData = await userService.getUserProfileById(userId);

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: userData,
    });

  } catch (error) {
    console.error("Get user profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
const updateUserProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Missing or invalid token",
      });
    }

    const idToken = authHeader.split("Bearer ")[1];

    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const {
      uid,
      address,
      citizenNumber,
      dateOfBirth,
      fullName,
      phoneNumber
    } = req.body;

    if (!uid) {
      return res.status(400).json({
        success: false,
        message: "uid is required",
      });
    }

    // 🔐 Check token khớp uid
    if (decodedToken.uid !== uid) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: uid does not match token",
      });
    }

    const updateData = {
      address,
      citizenNumber,
      dateOfBirth,
      fullName,
      phoneNumber
    };

    await userService.updateUserProfile(uid, updateData);
const snapshot = await db
  .collection("devices")
  .where("userId", "==", uid)
  .limit(1)
  .get();

if (!snapshot.empty) {
  const doc = snapshot.docs[0];
  const deviceData = doc.data();

  await saveActionNotification(
    "UPDATE_PROFILE",
    "User profile updated",
    uid,
    doc.id,
    deviceData.id
  );
}
    return res.status(200).json({
      success: true,
      message: "User profile updated successfully",
    });

  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
module.exports = {
  getUserProfile,
  updateProfile,
  saveFcmToken,
  updateFcmToken,
  fillInformation,
  updateUserProfile,
};