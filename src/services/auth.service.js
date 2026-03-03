const crypto = require("crypto");
const { admin, db } = require("../config/firebase");
const nodemailer = require("nodemailer");
const axios = require("axios");
/* ================= TEMP STORE ================= */
const tempUsers = new Map();
/*
 token => {
   email,
   password,
   expireAt
 }
*/

/* ================= MAIL ================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/* =====================================================
   1️⃣ SIGNUP REQUEST
===================================================== */
exports.signupRequest = async ({ email, password }) => {
  try {
    // Tạo Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: false,
    });

    // Tạo custom token cho frontend login ngay
    const customToken = await admin.auth().createCustomToken(
      userRecord.uid
    );

    // Tạo link verify email
    const actionCodeSettings = {
      url: process.env.BASE_URL + "/auth/after-verify",
      handleCodeInApp: false,
    };

    const verifyLink =
      await admin.auth().generateEmailVerificationLink(
        email,
        actionCodeSettings
      );

    // Gửi email
    await transporter.sendMail({
      from: `"My App" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Verify your email",
      html: `
        <h3>Verify your account</h3>
        <p>Please click below to verify:</p>
        <a href="${verifyLink}">Verify Email</a>
      `,
    });

    return {
      success: true,
      customToken,
    };
  } catch (error) {
    throw new Error(error.message);
  }
};
/* =====================================================
   2️⃣ AFTER VERIFY (Frontend gửi idToken lên)
===================================================== */
exports.afterVerify = async (req, res) => {
  try {

    const { idToken, fcmToken } = req.body;

    console.log("🔥 BODY =", req.body);

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Missing idToken",
      });
    }

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "Missing fcmToken",
      });
    }

    // Verify token
    const decoded = await admin.auth().verifyIdToken(idToken);

    const uid = decoded.uid;

    const user = await admin.auth().getUser(uid);

    if (!user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email not verified yet",
      });
    }

    // Save to Firestore
    await admin.firestore()
      .collection("users")
      .doc(uid)
      .set({
        uid,
        email: user.email,
        emailVerified: true,

        fcmToken: fcmToken, // 👈 LƯU Ở ĐÂY

        fullName: "",
        address: "",
        dateOfBirth: "",
        citizenNumber: "",
        phoneNumber: "",

        profileCompleted: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

    return res.json({
      success: true,
      uid,
    });

  } catch (err) {

    console.error("❌ AFTER VERIFY ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


/* ================= VERIFY EMAIL ================= */
exports.afterVerify = async (req, res) => {
  try {
    console.log("BODY =", req.body);

    const { idToken, fcmToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Missing idToken",
      });
    }

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "Missing fcmToken",
      });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const user = await admin.auth().getUser(uid);

    if (!user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email not verified",
      });
    }

    const userRef = admin.firestore().collection("users").doc(uid);

    await userRef.set(
      {
        uid,
        email: user.email,
        emailVerified: true,

        fcmToken,

        fullName: "",
        address: "",
        dateOfBirth: "",
        citizenNumber: "",
        phoneNumber: "",

        profileCompleted: false,

        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true } // ⭐ update nếu tồn tại
    );

    return res.json({
      success: true,
      uid,
    });

  } catch (err) {
    console.error("AFTER VERIFY ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
exports.saveUserAfterVerify = async (idToken) => {
  const decoded = await admin.auth().verifyIdToken(idToken);

  const uid = decoded.uid;
  const email = decoded.email;

  const userRef = admin.firestore().collection("users").doc(uid);
  const snap = await userRef.get();

  if (snap.exists) {
    return { uid, existed: true };
  }

  await userRef.set({
    uid,
    email,
    emailVerified: true,
    profileCompleted: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { uid, existed: false };
};


exports.signIn = async ({ email, password, fcmToken }) => {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;

  if (!apiKey) {
    throw new Error("Missing FIREBASE_WEB_API_KEY");
  }

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

  try {
    console.log("🔥 Firebase REST login:", email);

    // 1️⃣ Login Firebase bằng REST API
    const res = await axios.post(url, {
      email: email,
      password: password,
      returnSecureToken: true,
    });

    const { localId: uid, idToken, refreshToken, expiresIn } = res.data;

    console.log("✅ Firebase login success uid =", uid);

    // 2️⃣ Tạo custom token cho frontend login Firebase SDK
    const firebaseCustomToken = await admin.auth().createCustomToken(uid);

    // 3️⃣ Update Firestore (FCM token)
    if (fcmToken) {
      await admin.firestore().collection("users").doc(uid).set(
        {
          fcmTokens: admin.firestore.FieldValue.arrayUnion(fcmToken),
          lastSignIn: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    // 4️⃣ Return đầy đủ cho controller
    return {
      uid,
      email: res.data.email,
      idToken,
      refreshToken,
      expiresIn,
      firebaseCustomToken,
    };

  } catch (err) {
    console.log("🔥 Firebase REST ERROR FULL:", err.response?.data || err.message);

    const firebaseMessage =
      err.response?.data?.error?.message || "Login failed";

    throw new Error(firebaseMessage);
  }
};

