const Story = require("../models/Story");
const { uploadToCloudinary } = require("../services/cloudinaryUpload");
const AppError = require("../utils/appError");
const cloudinary = require("../utils/cloudinary");
const { createAndEmitNotification } = require("../socket");

const ALLOWED_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👏", "🔥", "🎉"];

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
      .sort({ createdAt: -1 })
      .lean();

    // Apply strict privacy filter: If owner is private, they must follow current user
    stories = stories.filter(story => {
      if (!story.storyOwner.isPrivate) return true;
      return story.storyOwner.following?.some(id => id.toString() === userId.toString());
    });

    const feedMap = new Map();
    
    stories.forEach(story => {
      const ownerId = story.storyOwner._id.toString();
      const isViewed = story.viewers.some(v => v.storyViewer.toString() === userId.toString());
      
      if (!feedMap.has(ownerId)) {
        feedMap.set(ownerId, {
          storyOwner: ownerId,
          hasNewStory: !isViewed,
          username: story.storyOwner.username,
          user_pic: story.storyOwner.user_pic,
          latestStoryDate: story.createdAt,
        });
      } else {
        const existing = feedMap.get(ownerId);
        // If we already found an unviewed story for this owner, keep it true
        if (!isViewed) {
          existing.hasNewStory = true;
        }
        // latestStoryDate is already set by the first (newest) story due to sort
      }
    });

    const feedArray = Array.from(feedMap.values()).sort((a, b) => {
      if (a.hasNewStory !== b.hasNewStory) {
        return b.hasNewStory ? 1 : -1;
      }
      return new Date(b.latestStoryDate).getTime() - new Date(a.latestStoryDate).getTime();
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
      const isViewed = story.viewers?.some(
        (v) => (v.storyViewer._id || v.storyViewer).toString() === user_id.toString()
      );

      if (story.viewers && story.viewers.length > 0) {
        story.viewers.sort(
          (a, b) => new Date(a.viewed_at) - new Date(b.viewed_at)
        );
      }
      return {
        ...story,
        isViewed,
        viewersCount: story.viewers?.length || 0,
      };
    });

    if (isOwnProfile) {
      // Owner sees full viewer list and mark as mine
      stories = stories.map((story) => ({ ...story, mine: true }));
    } else {
      // Non-owner: hide other viewers but keep current user's entry for reaction status
      stories = stories.map((story) => {
        const myEntry = story.viewers?.find(
          (v) => (v.storyViewer._id || v.storyViewer).toString() === user_id.toString()
        );
        return { 
          ...story, 
          mine: false,
          viewers: myEntry ? [myEntry] : [] // Only return my own entry
        };
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
        story.viewers.push({ storyViewer, viewed_at: new Date() });
        await story.save();

        const io = req.app.get("io");
        if (io) {
          io.to(`user:${owner._id.toString()}`).emit("new_viewer", {
            storyId: story._id.toString(),
            viewer: {
              userId: storyViewer.toString(),
              username: req.user.username,
              user_pic: req.user.user_pic,
              viewed_at: new Date().toISOString(),
              reaction: null
            }
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
    const { media_type, content, bg_color, duration, waveformData } = req.body;
    let storyData = {
      storyOwner: req.user.id,
      media_type: media_type || "image", // Default for legacy clients
      duration: duration ? parseInt(duration) : 5,
    };

    if (media_type === "text") {
      if (!content) throw new AppError("Text content is required for text stories", 400);
      storyData.content = content;
      storyData.bg_color = bg_color || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
    } else {
      if (!req.file) throw new AppError("Please select a file...", 401);
      
      const isVideo = req.file.mimetype.startsWith("video");
      const isAudio = req.file.mimetype.startsWith("audio") || media_type === "voice";
      
      const uploadResult = await uploadToCloudinary(req.file.buffer, {
        folder: "stories",
        resource_type: isVideo || isAudio ? "video" : "image",
      });
      
      storyData.media_url = uploadResult.secure_url;
      storyData.public_id = uploadResult.public_id;
      storyData.media_type = isAudio ? "voice" : isVideo ? "video" : "image";
      
      if (isVideo || isAudio) {
        storyData.duration = duration ? parseInt(duration) : Math.max(1, Math.round(uploadResult.duration || 5));
      }
      
      if (isAudio && waveformData) {
        try {
          storyData.waveformData = JSON.parse(waveformData);
        } catch(e) {
          storyData.waveformData = [];
        }
      }
    }

    const newStory = new Story(storyData);
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
    // Delete media from Cloudinary before removing from DB (if public_id exists)
    if (story.public_id) {
      const isVideo = story.media_type === "video";
      await cloudinary.uploader.destroy(story.public_id, {
        resource_type: isVideo ? "video" : "image",
      });
    }
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

const addReaction = async (req, res, next) => {
  try {
    const { emoji } = req.body;
    const userId = req.user.id;

    if (!ALLOWED_REACTIONS.includes(emoji)) {
      return next(new AppError("Invalid reaction", 400));
    }

    const story = await Story.findById(req.params.story_id);
    if (!story) return next(new AppError("Story not found", 404));

    const viewerEntry = story.viewers.find(
      (v) => v.storyViewer.toString() === userId
    );

    let finalReaction;
    if (viewerEntry) {
      // Toggle: same emoji removes, different replaces
      viewerEntry.reaction = viewerEntry.reaction === emoji ? null : emoji;
      finalReaction = viewerEntry.reaction;
    } else {
      // User hasn't viewed yet — add entry with reaction
      story.viewers.push({ storyViewer: userId, viewed_at: new Date(), reaction: emoji });
      finalReaction = emoji;
    }

    await story.save();

    // Get io instance
    const io = req.app.get("io");

    // Emit real-time reaction to story owner
    if (io) {
      io.to(`user:${story.storyOwner.toString()}`).emit("story_reaction", {
        storyId: story._id.toString(),
        viewer: {
          userId: req.user.id.toString(),
          username: req.user.username,
          user_pic: req.user.user_pic,
          reaction: viewerEntry?.reaction || null,
        },
      });
    }

    // Fire notification only when reaction is set (not removed) and not own story
    if (finalReaction && story.storyOwner.toString() !== userId) {
      if (io) {
        await createAndEmitNotification(io, {
          recipient: story.storyOwner,
          sender: userId,
          type: "story_reaction",
          storyId: story._id,
          reaction: finalReaction,
        });
      }
    }

    res.json({ success: true, reaction: finalReaction });
  } catch (err) {
    next(err);
  }
};

const getExploreStories = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const User = require("../models/User");
    
    // Get current user to see who they follow/block
    const currentUser = await User.findById(userId).select("following blockedUsers").lean();
    const following = currentUser.following || [];
    const blocked = currentUser.blockedUsers || [];

    // 1. Find non-private users that I don't follow and didn't block
    const publicUsers = await User.find({
      _id: { $nin: [...following, ...blocked, userId] },
      isPrivate: false
    }).select("_id").lean();

    const publicUserIds = publicUsers.map(u => u._id);

    // 2. Find stories from these users in the last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stories = await Story.find({
      storyOwner: { $in: publicUserIds },
      createdAt: { $gte: oneDayAgo }
    })
    .sort({ createdAt: -1 })
    .limit(40)
    .populate("storyOwner", "username user_pic")
    .lean();

    // 3. Optional: Group by user to show only one story per user in Explore grid
    // Or just show all? Instagram shows a grid of media. 
    // Let's return all, the frontend will render them as thumbnails.

    res.json(stories);
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
  addReaction,
  getExploreStories,
};
