const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const notificationController = require("../controllers/notification.controller");

router.get("/notifications", verifyToken, notificationController.getUserNotifications);
router.post(
  "/mark-all-as-read",
  notificationController.markAllNotificationsAsRead
);

module.exports = router;