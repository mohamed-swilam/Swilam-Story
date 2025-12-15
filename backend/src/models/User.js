const mongoose = require("mongoose");
const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  user_pic: {
    type: String,
    default: "",
  },
});

module.exports = mongoose.model("User", userSchema, "users");
