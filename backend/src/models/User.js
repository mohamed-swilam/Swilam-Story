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
  bio: {
    type: String,
    default: "",
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  lastSeenVisibility: {
    type: String,
    enum: ["everyone", "followers", "nobody"],
    default: "everyone",
  },
  readReceipts: {
    type: Boolean,
    default: true,
  },
  blockedUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  settings: {
    theme: { type: String, default: "dark" },
    accentColor: { type: String, default: "#a855f7" },
    fontSize: { type: String, default: "medium" },
    chatWallpaper: { type: String, default: "" },
  },
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  notificationSettings: {
    messages:       { type: Boolean, default: true },
    follows:        { type: Boolean, default: true },
    storyViews:     { type: Boolean, default: true },
    storyReplies:   { type: Boolean, default: true },
    storyReactions: { type: Boolean, default: true },
  },
  chatSettings: [
    {
      conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
      accentColor: String,
      fontSize: String,
      chatWallpaper: String,
    }
  ],
});

module.exports = mongoose.model("User", userSchema, "users");
