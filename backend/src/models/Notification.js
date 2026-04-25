const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["follow", "story_view", "story_reply"],
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    storyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },
    messagePreview: {
      type: String,
    },
  },
  { timestamps: true }
);

// Auto-delete after 7 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

// Compound index to prevent spam (same recipient+sender+type)
notificationSchema.index({ recipient: 1, sender: 1, type: 1, read: 1 });

module.exports = mongoose.model("Notification", notificationSchema, "notifications");
