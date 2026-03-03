const admin = require("firebase-admin");
const db = admin.firestore();
const updateProfile = async (idToken, data) => {
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

// const updateUserProfile = async (uid, data) => {
//   const userRef = db.collection("users").doc(uid);

//   await userRef.update({
//     address: data.address || "",
//     citizenNumber: data.citizenNumber || "",
//     dateOfBirth: data.dateOfBirth || "",
//     fullName: data.fullName || "",
//     phoneNumber: data.phoneNumber || "",
//     profileCompleted: true,
//     updatedAt: new Date()
//   });
// };
const getUserProfileById = async (userId) => {
  const doc = await db.collection("users").doc(userId).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data();

  return {
    address: data.address || null,
    dateOfBirth: data.dateOfBirth || null,
    citizenNumber: data.citizenNumber || null,
    phoneNumber: data.phoneNumber || null,
    fullName: data.fullName || null,
  };
};
const updateUserProfile = async (uid, updateData) => {
  const userRef = db.collection("users").doc(uid);

  await userRef.update({
    ...updateData,
    updatedAt: new Date()
  });

  return true;
};
module.exports = {
  getUserProfileById,
  updateProfile,
  updateUserProfile,
  updateUserProfile,
};
