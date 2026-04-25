const mongoose = require("mongoose");

const messageSchema = mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      enum: ["text", "image", "video", "file", "voice"],
      default: "text",
    },
    fileUrl: {
      type: String,
      default: "",
    },
    fileName: {
      type: String,
      default: "",
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    voiceMessage: {
      url: { type: String },
      duration: { type: Number },
      publicId: { type: String },
      waveformData: { type: [Number], default: [] },
    },
    storyReply: {
      storyId: { type: mongoose.Schema.Types.ObjectId, ref: "Story" },
      mediaUrl: { type: String },
      mediaType: { type: String, enum: ["image", "video", "text", "voice"] },
      storyOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      content: { type: String },
      bg_color: { type: String },
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
      },
    ],
    replyTo: {
      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null,
      },
      content: { type: String, default: "" },
      senderUsername: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

// Paginated message fetching by conversation, newest first
messageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema, "messages");
