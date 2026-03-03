
const express = require("express");
const cors = require("cors");
const notificationRoutes = require("./routes/notification.routes");
const userRoutes = require("./routes/user.routes");
const notificationRoute = require("./routes/notification.routes");
require("./mqtt/gps.subscriber"); // PHẢI có
const app = express();

app.use(cors({
  origin: "*", // dev
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(express.json());

app.use("/auth", require("./routes/auth.routes"));
app.use("/auth", require("./routes/auth.routes"));
app.use("/users", require("./routes/user.routes"));
app.use("/auth", require("./routes/auth.routes"));
app.use("/api/devices", require("./routes/device.routes"));
app.get("/", (req, res) => {
  res.send("🚀 Backend is running");
});
const deviceRoutes = require("./routes/device.routes");
app.use("/devices", deviceRoutes);
app.use("/devices", require("./routes/device.routes"));
app.use("/devices", require("./routes/device.routes"));
app.use("/devices", deviceRoutes);
app.use("/users", require("./routes/user.routes"));
app.use("/api", notificationRoutes);
app.use("/user", userRoutes);
app.use("/api/device", deviceRoutes);
app.use("/api/user", userRoutes);
app.use("/api/device", deviceRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/user", userRoutes);
app.use("/api/user", userRoutes);
app.use("/api/device", deviceRoutes);
module.exports = app;




 
