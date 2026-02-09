
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: "*", // dev
}));

app.use(express.json());

app.use("/auth", require("./routes/auth.routes"));
app.use("/auth", require("./routes/auth.routes"));
app.use("/users", require("./routes/user.routes"));

app.get("/", (req, res) => {
  res.send("🚀 Backend is running");
});

module.exports = app;




 
