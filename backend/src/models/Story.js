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
      required: true,
    },
    media_type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    public_id: {
      type: String,
      required: true,
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
