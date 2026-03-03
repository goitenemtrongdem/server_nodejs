const { Server } = require("socket.io");
const admin = require("firebase-admin");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);

    socket.on("join", (userId) => {
      console.log("👤 User joined room:", userId);

      socket.join(userId);

      // log số client trong room
      const roomSize = io.sockets.adapter.rooms.get(userId)?.size || 0;
      console.log(`📦 Room ${userId} has ${roomSize} client(s)`);
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });

    // TEST emit thủ công
    socket.on("test_notification", () => {
      console.log("🧪 Test emit triggered");

      socket.emit("new_notification", {
        id: "test123",
        title: "Test Notification",
        content: "Socket is working",
        type: 1,
        isRead: false,
        deviceId: "DEV_TEST",
        createdAt: new Date().toISOString(),
      });
    });
  });

  listenFirestore();
}

function listenFirestore() {
  const db = admin.firestore();

  console.log("👂 Listening Firestore user-notifications...");

  db.collection("user-notifications").onSnapshot(
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        console.log("📄 Change type:", change.type);

        if (change.type === "added") {
          const data = change.doc.data();

          console.log("🔥 New notification from Firestore:", data);

          const payload = {
            id: change.doc.id,
            ...data,
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate().toISOString()
              : new Date().toISOString(),
          };

          if (!io) {
            console.log("❌ IO not initialized");
            return;
          }

          if (!data.userId) {
            console.log("❌ Notification missing userId");
            return;
          }

          const roomSize =
            io.sockets.adapter.rooms.get(data.userId)?.size || 0;

          console.log(
            `📤 Emit new_notification to userId=${data.userId}, clients=${roomSize}`
          );

          io.to(data.userId).emit("new_notification", payload);
        }
      });
    },
    (error) => {
      console.log("❌ Firestore listener error:", error);
    }
  );
}

module.exports = { initSocket };


















