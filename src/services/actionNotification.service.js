const { admin, db } = require("../config/firebase");

async function saveActionNotification(
  title,
  content,
  userId,
  deviceDocId,
  realDeviceId
) {
  const notiRef = await db
    .collection("user-notifications")
    .doc(userId)
    .collection("items")
    .add({
      title,
      content,
      type: 5,
      status: 1,
      isRead: false,
      deviceId: realDeviceId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  console.log("📌 Action notification saved:", notiRef.id);

  // Giữ tối đa 15
  const snapshot = await db
    .collection("user-notifications")
    .doc(userId)
    .collection("items")
    .orderBy("createdAt", "asc")
    .limit(16)
    .get();

  if (snapshot.size > 15) {
    const batch = db.batch();
    batch.delete(snapshot.docs[0].ref);
    await batch.commit();
  }
}

module.exports = {
  saveActionNotification,
};