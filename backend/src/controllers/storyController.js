const Story = require("../models/Story");
const { uploadToCloudinary } = require("../services/cloudinaryUpload");
const AppError = require("../utils/appError");

const getAllStories = async (req, res,next) => {
  try {
    
    const userId = req.user.id;
    let stories = await Story.find({ storyOwner: { $ne: userId } })
    .populate("storyOwner", "username user_pic")
    .lean();
    const feed = new Map();
    for (const story of stories) {
      const storyOwner = story.storyOwner._id.toString();
      const isViewed = story.viewers.some(
      (v) => v.storyViewer.toString() === userId
    );
    if (!feed.has(storyOwner)) {
      feed.set(storyOwner, {
        storyOwner,
        hasNewStory: !isViewed,
        username: story.storyOwner.username,
        user_pic: story.storyOwner.user_pic,
        latestStoryDate: story.createdAt,
      });
    } else {
      const feedItem = feed.get(storyOwner);
      feedItem.hasNewStory = feedItem.hasNewStory || !isViewed;
      if (new Date(story.createdAt) > new Date(feedItem.latestStoryDate)) {
        feedItem.latestStoryDate = story.createdAt;
      }
      feed.set(storyOwner, feedItem);
    }
  }
  const feedArray = [...feed.values()].sort((a, b) => {
    if (a.hasNewStory === b.hasNewStory) {
      return new Date(b.latestStoryDate) - new Date(a.latestStoryDate);
    }
    return b.hasNewStory - a.hasNewStory;
  });

  res.json(feedArray);
} catch (err) {
  next(err);
}
};

const getAllUserStories = async (req, res, next) => {
  try {
    
    const user_id = req.user.id;
    const ownerId = req.params.user_id;
    let stories = await Story.find({ storyOwner: ownerId })
    .sort({ createdAt: 1 })
    .populate("storyOwner", "username user_pic")
    .populate({
      path: "viewers.storyViewer",
      select: "username user_pic",
    })
    .lean();
    
    stories = stories.map((story) => {
    if (story.viewers && story.viewers.length > 0) {
      story.viewers.sort(
        (a, b) => new Date(a.viewed_at) - new Date(b.viewed_at)
      );
    }
    return {
      ...story,
      viewersCount: story.viewers?.length || 0,
    };
  });

  if (user_id.toString() !== ownerId.toString()) {
    stories = stories.map((story) => {
      delete story.viewers;
      return { ...story, mine: true };
    });
  }
  
  res.json(stories);
} catch (err) {
  next(err);
}
};

const storyView = async (req, res, next) => {
  try {
    const storyViewer = req.user.id;
    const { story_id } = req.params;
    const story = await Story.findOne({ _id: story_id });
    if (!story) {
      throw new AppError("Story Not Found", 404);
    }
    if (story.storyOwner.toString() !== storyViewer) {
      const isViewed = story.viewers.some(
        (user) => user.storyViewer.toString() === storyViewer
      );
      if (!isViewed) {
        story.viewers.push({ storyViewer });
        await story.save();
      }
    }
    res.json(story);
  } catch (err) {
    next(err);
  }
};

const newStory = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError("Please select file...", 401);
    }
    const isVideo = req.file.mimetype.startsWith("video");
    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      folder: "stories",
      resource_type: isVideo ? "video" : "image",
    });
    const newStory = new Story({
      storyOwner: req.user.id,
      media_url: uploadResult.secure_url,
      duration: isVideo ? uploadResult.duration : 3,
      media_type: uploadResult.resource_type,
      public_id: uploadResult.public_id,
    });

    await newStory.save();
    res.status(201).json(newStory);
  } catch (err) {
    next(err);
  }
};

const deleteStory = async (req, res, next) => {
  try {
    const { story_id } = req.params;
    const story = await Story.findById({ _id: story_id });
    if (!story) {
      throw new AppError("Invalid Story ID", 404);
    }
    if (story.storyOwner.toString() !== req.user.id.toString()) {
      throw new AppError("Unauthenticated", 403);
    }
    await story.deleteOne();
    res
      .status(200)
      .json({ success: true, message: "Story deleted Successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllStories,
  getAllUserStories,
  newStory,
  storyView,
  deleteStory,
};
