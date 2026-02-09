const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const userController = require("../controllers/user.controller");

router.post("/fill-info", userController.fillInformation);
router.post(
  "/save-fcm-token",
  authMiddleware,
  userController.saveFcmToken
);
module.exports = router;


 


