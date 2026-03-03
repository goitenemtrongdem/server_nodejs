require("dotenv").config();
const app = require("./app");
require("./mqtt/gps.subscriber");

const http = require("http");
const { initSocket } = require("./socket/notification.socket");

const PORT = process.env.PORT || 3000;

// 🔥 tạo server http từ app
const server = http.createServer(app);

// 🔥 init websocket
initSocket(server);

// 🔥 thay app.listen bằng server.listen
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});