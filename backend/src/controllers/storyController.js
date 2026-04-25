const Story = require("../models/Story");
const { uploadToCloudinary } = require("../services/cloudinaryUpload");
const AppError = require("../utils/appError");
const cloudinary = require("../utils/cloudinary");
const { createAndEmitNotification } = require("../socket");

const getAllStories = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const User = require("../models/User");
    const currentUser = await User.findById(userId).select("following blockedUsers").lean();

    if (!currentUser.following || currentUser.following.length === 0) {
      return res.json([]);
    }

    // Filter out blocked users from the following list
    const filteredFollowing = currentUser.following.filter(id => 
      !currentUser.blockedUsers?.some(blockedId => blockedId.toString() === id.toString())
    );

    if (filteredFollowing.length === 0) {
      return res.json([]);
    }

    let stories = await Story.find({ storyOwner: { $in: filteredFollowing } })
      .populate("storyOwner", "username user_pic isPrivate following")
      .lean();

    // Apply strict privacy filter: If owner is private, they must follow current user
    stories = stories.filter(story => {
      if (!story.storyOwner.isPrivate) return true;
      return story.storyOwner.following?.some(id => id.toString() === userId.toString());
    });
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
    const User = require("../models/User");
    
    const owner = await User.findById(ownerId).select("blockedUsers isPrivate following");
    if (!owner) throw new AppError("User not found", 404);

    // 1. Check if requester is blocked by owner
    if (owner.blockedUsers?.some(id => id.toString() === user_id.toString())) {
      return res.status(403).json({ message: "You are blocked by this user" });
    }

    // 2. Check strict privacy (Only users I follow can see my stories)
    const isOwnProfile = user_id.toString() === ownerId.toString();
    if (owner.isPrivate && !isOwnProfile) {
      const ownerFollowsRequester = owner.following?.some(id => id.toString() === user_id.toString());
      if (!ownerFollowsRequester) {
        return res.status(403).json({ message: "This account is private. Only users followed by the owner can view stories." });
      }
    }

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

    if (isOwnProfile) {
      // Owner sees full viewer list
    } else {
      // Non-owner: hide viewers list and mark as not mine
      stories = stories.map((story) => {
        delete story.viewers;
        return { ...story, mine: false };
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
    const User = require("../models/User");
    
    const story = await Story.findOne({ _id: story_id }).populate("storyOwner");
    if (!story) {
      throw new AppError("Story Not Found", 404);
    }

    const owner = story.storyOwner;

    // 1. Check if viewer is blocked by owner
    if (owner.blockedUsers?.some(id => id.toString() === storyViewer.toString())) {
      return res.status(403).json({ message: "You are blocked by this user" });
    }

    // 2. Check strict privacy
    const isOwnStory = owner._id.toString() === storyViewer;
    if (owner.isPrivate && !isOwnStory) {
      const ownerFollowsRequester = owner.following?.some(id => id.toString() === storyViewer.toString());
      if (!ownerFollowsRequester) {
        return res.status(403).json({ message: "This account is private. Only users followed by the owner can view stories." });
      }
    }

    if (!isOwnStory) {
      const isViewed = story.viewers.some(
        (user) => user.storyViewer.toString() === storyViewer
      );
      if (!isViewed) {
        story.viewers.push({ storyViewer });
        await story.save();

        const io = req.app.get("io");
        if (io) {
          io.to(`user:${owner._id}`).emit("story_viewed", {
            storyId: story._id,
            viewer: {
              _id: storyViewer,
              username: req.user.username,
              user_pic: req.user.user_pic,
            },
            viewedAt: new Date(),
          });

          // Story view notification
          createAndEmitNotification(io, {
            recipient: owner._id,
            sender: storyViewer,
            type: "story_view",
            storyId: story._id,
          });
        }
      }
    }
    res.json({
      success: true,
      message: "Story viewed successfully",
    });
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

    // Notify owner and followers via socket
    const io = req.app.get("io");
    if (io) {
      const User = require("../models/User");
      const owner = await User.findById(req.user.id).select("followers username user_pic");
      
      // Emit to owner's room
      io.to(`user:${req.user.id}`).emit("new_story", {
        storyOwner: req.user.id,
        username: owner.username,
        user_pic: owner.user_pic,
        story: newStory
      });

      if (owner && owner.followers) {
        owner.followers.forEach(followerId => {
          // Double check: don't notify if they are blocked (unfollow should handle this, but just in case)
          if (!owner.blockedUsers?.some(id => id.toString() === followerId.toString())) {
            io.to(`user:${followerId}`).emit("new_story", {
              storyOwner: req.user.id,
              username: owner.username,
              user_pic: owner.user_pic,
              story: newStory
            });
          }
        });
      }
    }

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
    // Delete media from Cloudinary before removing from DB
    const isVideo = story.media_type === "video";
    await cloudinary.uploader.destroy(story.public_id, {
      resource_type: isVideo ? "video" : "image",
    });
    await story.deleteOne();

    // Notify owner and followers that story was deleted
    const io = req.app.get("io");
    if (io) {
      const User = require("../models/User");
      const owner = await User.findById(req.user.id).select("followers");

      // Emit to owner's room
      io.to(`user:${req.user.id}`).emit("story_deleted", {
        storyId: story._id,
        storyOwner: req.user.id
      });

      if (owner && owner.followers) {
        owner.followers.forEach(followerId => {
          io.to(`user:${followerId}`).emit("story_deleted", {
            storyId: story._id,
            storyOwner: req.user.id
          });
        });
      }
    }

    res
      .status(200)
      .json({ success: true, message: "Story deleted Successfully" });
  } catch (err) {
    next(err);
  }
};

const checkStoryExists = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.story_id).select('_id');
    res.json({ exists: !!story });
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
  checkStoryExists,
};
