const { db } = require("../config/firebase");

const markAllAsRead = async (userId) => {
  const snapshot = await db
    .collection("user-notifications")
    .doc(userId)
    .collection("items")
    .get();

  if (snapshot.empty) {
    return 0;
  }

  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { isRead: true });
  });

  await batch.commit();

  return snapshot.size;
};

module.exports = {
  markAllAsRead,
};

module.exports = {
  markAllAsRead,
};