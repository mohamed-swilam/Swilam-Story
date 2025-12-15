require("dotenv").config({ quiet: true });
require("./config/db");
const express = require("express");
const cors = require("cors");
const storyRoutes = require("./routes/storyRoute");
const userRoutes = require("./routes/userRoute");
const bodyParser = require("body-parser");
const app = express();

app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/user", userRoutes);
app.use("/stories", storyRoutes);

app.use((req, res, next) => {
  res.status(404).json({ data: "Page Not Found" });
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ success: false,  message: err.message });
});

app.listen(process.env.SERVER_PORT, (err) => {
  console.log(`server running on port ${3000}`);
});
