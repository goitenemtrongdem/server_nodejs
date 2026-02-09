const crypto = require("crypto");
const admin = require("../config/firebase");
const nodemailer = require("nodemailer");

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

/* ================= SIGNUP REQUEST ================= */
exports.signupRequest = async ({ email, password }) => {
  // 1. check email exists
  try {
    await admin.auth().getUserByEmail(email);
    throw new Error("Email already exists");
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
  }

  // 2. generate verify token
  const token = crypto.randomBytes(32).toString("hex");

  tempUsers.set(token, {
    email,
    password,
    expireAt: Date.now() + 5 * 60 * 1000,
  });

  const verifyLink = `${process.env.BASE_URL}/auth/verify-email?token=${token}`;

  // 3. send mail
  await transporter.sendMail({
    from: `"My App" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Verify your email",
    html: `
      <h3>Verify your account</h3>
      <p>Click link below to verify:</p>
      <a href="${verifyLink}">${verifyLink}</a>
      <p>Expire in 5 minutes</p>
    `,
  });
};

/* ================= VERIFY EMAIL ================= */
exports.verifyEmail = async (token) => {
  const tempUser = tempUsers.get(token);
  if (!tempUser) throw new Error("Invalid token");

  if (Date.now() > tempUser.expireAt) {
    tempUsers.delete(token);
    throw new Error("Token expired");
  }

  // 1. create firebase auth user
  const userRecord = await admin.auth().createUser({
    email: tempUser.email,
    password: tempUser.password,
    emailVerified: true,
  });

  const uid = userRecord.uid;

  // 2. save user to firestore
  await admin.firestore().collection("users").doc(uid).set({
    uid,
    email: tempUser.email,
    emailVerified: true,

    // profile (chưa nhập)
    fullName: "",
    address: "",
    dateOfBirth: "",
    citizenNumber: "",

    profileCompleted: false,

    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // 3. create custom token (frontend login)
  const customToken = await admin.auth().createCustomToken(uid);

  // 4. cleanup
  tempUsers.delete(token);

  return {
    uid,
    email: tempUser.email,
    customToken,
  };
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
