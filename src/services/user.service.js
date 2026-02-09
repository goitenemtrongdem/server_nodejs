const admin = require("firebase-admin");
const db = admin.firestore();

exports.updateProfile = async (idToken, data) => {
  // 1️⃣ Verify token
  const decoded = await admin.auth().verifyIdToken(idToken);
  const uid = decoded.uid;

  // 2️⃣ Ref user document
  const userRef = admin.firestore().collection("users").doc(uid);

  // 3️⃣ Update dữ liệu
  await userRef.set(
    {
      ...data,
      profileCompleted: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
};
