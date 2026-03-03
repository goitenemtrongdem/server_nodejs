const authService = require("../services/auth.service");
// const response = require("../utils/response");
// const authService = require("../services/auth.service");
const { admin , db } = require("../config/firebase");
// ================= SAVE AUTH NOTIFICATION =================
 // ================= SAVE AUTH NOTIFICATION =================
async function saveAuthNotification(userId, title, content) {
  await db
    .collection("user-notifications")
    .doc(userId)
    .collection("items")
    .add({
      title,
      content,
      type: 4,
      status: 1,
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  console.log("🔐 Auth notification saved:", title);
}
const signupRequest = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return response.error(res, "Missing email or password");
    }

    await authService.signupRequest({ email, password });

    return response.success(
      res,
      null,
      "Verification email sent"
    );
  } catch (err) {
    return response.error(res, err.message);
  }
};


const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    await authService.verifyEmail(token);

    return res.send("✅ Email verified. You can close this tab.");
  } catch (err) {
    return res.status(400).send(err.message);
  }
};

const afterVerify = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "Missing idToken" });
    }

    const result = await authService.saveUserAfterVerify(idToken);

// ===== SAVE SIGNUP NOTIFICATION =====
await saveAuthNotification(
  result.uid,
  "signup",
  "Account created successfully"
);

    res.status(200).json({
      message: "User saved to database",
      ...result
    });
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
};
/* ================= SIGN IN ================= */
const signIn = async (req, res) => {
  try {
    const { email, password, fcmToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing email or password"
      });
    }

    const data = await authService.signIn({
      email, 
      password,
      fcmToken
    });
await saveAuthNotification(
  data.uid,
  "signin",
  "User signed in successfully"
);
    return res.status(200).json({
      success: true,
      message: "Sign in successful",
      uid: data.uid,
      email: data.email,
      firebaseCustomToken: data.firebaseCustomToken,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn
    });

  } catch (err) {
    console.log("🔥 signIn error:", err.message);

    return res.status(401).json({
      success: false,
      message: err.message
    });
  }
};

module.exports = {
  signupRequest,
  verifyEmail,
  afterVerify,
  signIn
};