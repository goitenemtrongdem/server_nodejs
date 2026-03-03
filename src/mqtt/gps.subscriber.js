const mqtt = require("mqtt");
const { admin, rtdb } = require("../config/firebase");
const getDistanceInMeters = require("../utils/distance");
const axios = require("axios");
const db = admin.firestore();
const client = mqtt.connect("mqtt://192.168.1.172");

// ================= GLOBAL MEMORY =================
if (!global.deviceState) {
  global.deviceState = {};
}

// =================================================
// ================= MQTT CONNECT ==================
// =================================================
client.on("connect", () => {
  console.log("🔥 MQTT connected");
  client.subscribe("control/gps/+");
  console.log("👂 Waiting for GPS data...");
});

// =================================================
// =========== FIRESTORE LISTENER ==================
// =========== ANTI-THEFT TOGGLE ===================
// =================================================
db.collection("devices").onSnapshot(snapshot => {
  snapshot.docChanges().forEach(async change => {

    if (change.type !== "modified") return;

    const documentId = change.doc.id;
    const data = change.doc.data();

    const antiThief = data?.config?.antiThief;
    const previousAnti = data?.config?.previousAnti;

    if (antiThief === undefined) return;
    if (antiThief === previousAnti) return;

    const title = antiThief ? "ON_ANTI_THEFT" : "OFF_ANTI_THEFT";
    const content = antiThief
      ? "Anti-theft enabled"
      : "Anti-theft disabled";

    // cập nhật previousAnti
    await db.collection("devices").doc(documentId).update({
      "config.previousAnti": antiThief
    });

    await saveNotification(
      title,
      content,
      3,
      documentId,
      data.userId,
      data.fcmToken,
      data.id 
    );

    // reset baseline khi tắt
    if (!antiThief) {
      await rtdb.ref(`baseline/${documentId}`).remove();
    }

    console.log("✅ Anti-theft toggle saved");
  });
});

// =================================================
// ================= MQTT MESSAGE ==================
// =================================================
client.on("message", async (topic, message) => {
  try {

    const payload = JSON.parse(message.toString());
    const { id, lat, lng, realtime } = payload;

    if (!id || lat === undefined || lng === undefined) {
      console.log("❌ Invalid MQTT payload");
      return;
    }

    console.log("📡 MQTT Received ID:", id);

    // ===== TÌM DOCUMENT TRONG COLLECTION devices =====
    const deviceSnapshot = await db
      .collection("devices")
      .where("id", "==", id)
      .limit(1)
      .get();

    if (deviceSnapshot.empty) {
      console.log("❌ Không tìm thấy device với id:", id);
      return;
    }

    const deviceDoc = deviceSnapshot.docs[0];
    const docId = deviceDoc.id;

    console.log("✅ Found docId:", docId);

    const now = Date.now();

    // ===== LƯU VÀO REALTIME DATABASE =====
    await rtdb.ref(`locations/${docId}`).update({
      lat,
      lng,
      realtime: realtime || null,
      updatedAt: now
    });

    console.log("📍 Updated RTDB locations/", docId);

    const documentId = topic.split("/")[2];
    // const payload = JSON.parse(message.toString());
    // const { lat, lng } = payload;

    // const deviceDoc = await db.collection("devices").doc(documentId).get();
    if (!deviceDoc.exists) return;

    const deviceData = deviceDoc.data();
    const antiTheft = deviceData.config?.antiThief === true;

    const userId = deviceData.userId;
    const fcmToken = deviceData.fcmToken;

    // init memory
    if (!global.deviceState[documentId]) {
      global.deviceState[documentId] = {
        lastSent: 0,
        lastTitle: null,
      };
    }

    const state = global.deviceState[documentId];
    // const now = Date.now();

    // ===== SAVE LOCATION =====
    // await rtdb.ref(`locations/${documentId}`).set({
    //   lat,
    //   lng,
    //   updatedAt: now,
    // });

    if (!antiTheft) return;

    // ===== CALCULATE DISTANCE =====
    const baselineRef = rtdb.ref(`baseline/${documentId}`);
    const baselineSnap = await baselineRef.get();

    let distance = 0;

    if (!baselineSnap.exists()) {
      await baselineRef.set({ lat, lng });
      return;
    }

    const base = baselineSnap.val();
    distance = getDistanceInMeters(base.lat, base.lng, lat, lng);

    // ===== DETERMINE TYPE =====
    let title = "NONE";
    let content = "Normal state";
    let type = 1;

    if (distance > 200) {
      title = "SOS";
      content = "Critical movement detected (>200m)";
      type = 2;
    } else if (distance > 50) {
      title = "LOST2";
      content = "High theft risk detected (>50m)";
      type = 2;
    } else if (distance > 10) {
      title = "LOST1";
      content = "Medium theft risk detected (10-50m)";
      type = 2;
    }

    // ===== TYPE 1 =====
    if (type === 1) {
      if (state.lastTitle !== "NONE") {
        state.lastTitle = "NONE";
        await saveNotification(title, content, type, documentId, userId, fcmToken);
      }
      return;
    }

    // ===== TYPE 2 (30 GIÂY / LẦN) =====
    if (type === 2) {
      if (now - state.lastSent >= 30000) {
        state.lastSent = now;
        state.lastTitle = title;

        await saveNotification(title, content, type, documentId, userId, fcmToken);
      } else {
        console.log("⛔ Block duplicate type 2 within 30s");
      }
    }

  } catch (err) {
    console.error("❌ MQTT error:", err.message);
  }
});

// =================================================
// =============== SAVE NOTIFICATION ===============
// =================================================
async function saveNotification(
  title,
  content,
  type,
  documentId,
  userId,
  fcmToken,
  realDeviceId
) {
  // ===== SAVE TO FIRESTORE =====
  const notiRef = await db
    .collection("user-notifications")
    .doc(userId)
    .collection("items")
    .add({
      title,
      content,
      type,
      status: 1,
      isRead: false,
      deviceId: realDeviceId, // ✅ id thật
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  console.log("📥 Saved:", notiRef.id);

  // ===== GIỮ TỐI ĐA 15 THÔNG BÁO =====
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
    console.log("🗑 Oldest notification deleted");
  }

  // ===== PUSH FCM =====
  if (fcmToken) {
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title,
        body: content,
      },
      data: {
        type: type.toString(),
        deviceId: realDeviceId, // ✅ gửi id thật
      },
    });
  }
}







// const mqtt = require("mqtt");
// const { admin, rtdb } = require("../config/firebase");
// const getDistanceInMeters = require("../utils/distance");
// const db = admin.firestore();
// const client = mqtt.connect("mqtt://192.168.1.172");

// client.on("connect", () => {
//   console.log("🔥 MQTT connected");
//   client.subscribe("control/gps/+");
//   console.log("👂 Waiting for GPS data...");
// });

// client.on("message", async (topic, message) => {
//   try {
//     const id = topic.split("/")[2];
//     const payload = JSON.parse(message.toString());
//     const { lat, lng, sos } = payload;

//     const snapshot = await db
//       .collection("devices")
//       .where("id", "==", id)
//       .limit(1)
//       .get();

//     if (snapshot.empty) return;

//     const doc = snapshot.docs[0];
    
//     // ===== DEVICE STATE MEMORY =====
// if (!global.deviceState) global.deviceState = {};
// if (!global.deviceState[documentId]) {
//   global.deviceState[documentId] = {
//     lastSent: 0,
//     lastTitle: null
//   };
// }
//     const state = global.deviceState[documentId];
//     const now = Date.now();
//     const deviceData = doc.data();

//     const userId = deviceData.userId;
//     const fcmToken = deviceData.fcmToken;

//     const antiTheif = deviceData.config?.antiThief === true;
//   const previousAnti = deviceData.config?.previousAnti ?? antiTheif;
//     let distance = 0;

//     // Save location
//     await rtdb.ref(`locations/${documentId}`).set({
//       lat,
//       lng,
//       updatedAt: Date.now(),
//     });

//     if (antiTheif) {
//       const baselineRef = rtdb.ref(`baseline/${documentId}`);
//       const baselineSnap = await baselineRef.get();

//       if (!baselineSnap.exists()) {
//         await baselineRef.set({ lat, lng });
//       } else {
//         const base = baselineSnap.val();
//         distance = getDistanceInMeters(base.lat, base.lng, lat, lng);
//       }
//     }

// // ===== NEW LOGIC TITLE + TYPE =====
// let title = "NONE";
// let content = "Normal state";
// let type = 1; // mặc định NONE là type 1

// if (distance > 200) {
//   title = "SOS";
//   content = "Critical movement detected (>200m)";
//   type = 2;
// } else if (distance > 50) {
//   title = "LOST2";
//   content = "High theft risk detected (>50m)";
//   type = 2;
// } else if (distance > 10) {
//   title = "LOST1";
//   content = "Medium theft risk detected (10-50m)";
//   type = 2;
// }

// // Anti theft toggle (type 3)
// if (previousAnti !== antiTheif) {
//   title = antiTheif ? "ON_ANTI_THEFT" : "OFF_ANTI_THEFT";
//   content = antiTheif
//     ? "Anti-theft enabled"
//     : "Anti-theft disabled";
//   type = 3;

//  await db.collection("devices").doc(documentId).update({
//   "config.previousAnti": antiTheif,
// });

//   await saveNotification();
//   state.lastTitle = title; // thêm dòng này
//   return;
// }
// if (!antiTheif && (type === 1 || type === 2)) {
//   return;
// }
 
// // ===== TYPE 1 (NONE) chỉ lưu khi thay đổi =====
// if (type === 1) {
//   if (state.lastTitle !== "NONE") {
//     state.lastTitle = "NONE";
//     await saveNotification();
//   }
//   return;
// }
// // ===== TYPE 2 (LOST / SOS) mỗi 1 giây =====
// if (type === 2) {
//   if (now - state.lastSent >= 30000) {
//     state.lastSent = now;
//     state.lastTitle = title;
//     await saveNotification();
//   }
//   return;
// }

// async function saveNotification(customTitle, customContent, customType) {

//   const finalTitle = customTitle || title;
//   const finalContent = customContent || content;
//   const finalType = customType || type;
// // CHỈ áp dụng cho type 2
// // CHỈ áp dụng cho type 2
// if (finalType === 2) {
//   const deviceRef = db.collection("devices").doc(documentId);
//   const deviceSnap = await deviceRef.get();

//   const now = Date.now();
//   const lastPushTime =
//     deviceSnap.data()?.properties?.lastPushNotificationTime || 0;

//   if (now - lastPushTime < 30000) {
//     console.log("⛔ Block duplicate type 2 within 1s");
//     return;
//   }

//   await deviceRef.update({
//     "properties.lastPushNotificationTime": now,
//   });
// }
//   const notiRef = await db
//     .collection("user-notifications")
//     .doc(userId)
//     .collection("items")
//     .add({
//       title: finalTitle,
//       content: finalContent,
//       type: finalType,
//       status: 1,
//       isRead: false,
//       deviceId: documentId,
//       createdAt: admin.firestore.FieldValue.serverTimestamp(),
//     });

//   console.log("📥 Saved:", notiRef.id);

//   // ===== GIỮ TỐI ĐA 15 DOCUMENT =====
// const snapshot = await db
//   .collection("user-notifications")
//   .doc(userId)
//   .collection("items")
//   .orderBy("createdAt", "asc")
//   .limit(16)
//   .get();

// if (snapshot.size > 15) {

//    const batch = db.batch();
//   batch.delete(snapshot.docs[0].ref);
//   await batch.commit();
//   console.log("🗑 Oldest notification deleted");
// }
// if (fcmToken) {
//   await admin.messaging().send({
//     token: fcmToken,
//     notification: { title: finalTitle, body: finalContent },
//     data: { type: finalType.toString(), deviceId: documentId },
//   });
// }
// }
//   } catch (err) {
//     console.error("❌ MQTT error:", err.message);
//   }
// });
