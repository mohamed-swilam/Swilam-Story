const mongoose = require("mongoose");

const conversationSchema = mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    groupName: {
      type: String,
      trim: true,
    },
    groupPhoto: {
      type: String,
    },
    groupPhotoPublicId: {
      type: String,
    },
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

// Fast lookup by participant
conversationSchema.index({ participants: 1 });

// Prevent duplicate DM conversations between the same two users
conversationSchema.index({ participants: 1, updatedAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema, "conversations");
