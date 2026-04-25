const mongoose = require("mongoose");
const storyViewSchema = mongoose.Schema({
  storyViewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  viewed_at: {
    type: Date,
    default: Date.now,
  },
  reaction: {
    type: String,
    default: null,
  },
  _id: false,
});

const storySchema = mongoose.Schema(
  {
    storyOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    media_url: {
      type: String,
      required: function() { return this.media_type === "image" || this.media_type === "video" || this.media_type === "voice"; }
    },
    media_type: {
      type: String,
      enum: ["image", "video", "text", "voice"],
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
      default: 5, // Default 5 seconds for text/image
    },
    public_id: {
      type: String,
      required: function() { return this.media_type === "image" || this.media_type === "video" || this.media_type === "voice"; }
    },
    content: {
      type: String, // For text stories
    },
    bg_color: {
      type: String, // For text stories
    },
    waveformData: {
      type: [Number], // For voice stories
    },
    viewers: {
      type: [storyViewSchema],
      default: [],
    },
  },
  { timestamps: true }
);
storySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 86400 }
);
module.exports = mongoose.model("Story", storySchema, "stories");
