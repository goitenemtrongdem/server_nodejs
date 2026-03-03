// src/controllers/notification.controller.js
const { admin } = require("../config/firebase");
const notificationService = require("../services/notification.service");
const getUserNotifications = async (req, res) => {
  try {
    const uid = req.user.uid;

    const snapshot = await db
      .collection("user-notifications")
      .where("userId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({
      success: true,
      data: notifications,
    });

  } catch (error) {
    console.error("getUserNotifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};



const markAllNotificationsAsRead = async (req, res) => {
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

    const updatedCount =
      await notificationService.markAllAsRead(userId);

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      updated: updatedCount,
    });
  } catch (error) {
    console.error("Mark all notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  markAllNotificationsAsRead,
  getUserNotifications,
};