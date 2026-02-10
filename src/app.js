
const express = require("express");
const cors = require("cors");
require("./mqtt/gps.subscriber"); // PHẢI có
const app = express();

app.use(cors({
  origin: "*", // dev
}));

app.use(express.json());

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

module.exports = app;




 
