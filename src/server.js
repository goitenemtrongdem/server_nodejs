require("dotenv").config();
const app = require("./app");
require("./mqtt/gps.subscriber");
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
