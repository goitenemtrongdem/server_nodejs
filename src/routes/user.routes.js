const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const userController = require("../controllers/user.controller");
const verifyToken = require("../middlewares/verifyToken");
router.post("/fill-info", userController.fillInformation);
router.post(
  "/save-fcm-token",
  authMiddleware,
  userController.saveFcmToken
);
router.post(
  "/update-profile",
  verifyToken,
  userController.updateProfile
);
router.post("/update-fcm", verifyToken, userController.updateFcmToken);
router.get("/profile", authMiddleware, userController.getUserProfile);
router.post("/get-profile", userController.getUserProfile);
router.post("/update-profile", userController.updateUserProfile);

module.exports = router;


 


