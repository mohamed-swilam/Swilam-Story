require("dotenv").config({ quiet: true });
require("./config/db");
const http = require("http");
const express = require("express");
const cors = require("cors");
const storyRoutes = require("./routes/storyRoute");
const userRoutes = require("./routes/userRoute");
const conversationRoutes = require("./routes/conversationRoute");
const bodyParser = require("body-parser");
const { initSocket } = require("./socket");

const app = express();
const httpServer = http.createServer(app);

// Attach Socket.io to the same HTTP server
const io = initSocket(httpServer);
app.set("io", io);

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Existing routes
app.use("/user", userRoutes);
app.use("/stories", storyRoutes);

const groupRoutes = require("./routes/groupRoute");
const notificationRoutes = require("./routes/notificationRoute");

// DM routes
app.use("/api/conversations", conversationRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((req, res, next) => {
  res.status(404).json({ data: "Page Not Found" });
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ success: false, message: err.message });
});

const PORT = process.env.SERVER_PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
