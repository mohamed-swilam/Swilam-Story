const jwt = require("jsonwebtoken");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const redis = require("../utils/redis");
const { uploadToCloudinary } = require("../services/cloudinaryUpload");
const AppError = require("../utils/appError");
const { createAndEmitNotification } = require("../socket");


const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      throw new AppError("Invalid Credintial", 401);
    }
    const matchedPassword = await bcrypt.compare(password, user.password);
    if (!matchedPassword) {
      throw new AppError("Invalid Credintial", 401);
    }
    const token = jwt.sign(
      {
        username: user.username,
        id: user._id,
        user_pic: user.user_pic,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.status(200).json({ token });
  } catch (err) {
    next(err);
  }
};

const register = async (req, res, next) => {
  try {
    const { username, password, confirmPassword } = req.body;
    const user = await User.findOne({ username });
    if (user) {
      throw new AppError("User Exist", 401);
    }
    if (password !== confirmPassword) {
      throw new AppError("Confirmation password incorrect", 401);
    }
    const passwordHashing = await bcrypt.hash(password, 10);
    if (!req.file) {
      throw new AppError("Please select file...", 401);
    }
    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      folder: "users",
      resource_type: "image",
    });
    const newUser = new User({
      username,
      user_pic: uploadResult.secure_url,
      password: passwordHashing,
    });
    await newUser.save();
    res.status(201).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    await redis.set(`blacklist:${token}`, "1", {
      EX: 60 * 60,
    });
    res.json({ msg: "logout successfully" });
  } catch (err) {
    next(err);
  }
};

const authtest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("-password").lean();
    if (!user) throw new AppError("User not found", 404);

    const token = req.headers.authorization;
    res.status(200).json({
      message: "USER AUTHORIZED",
      token,
      user: {
        id: user._id,
        username: user.username,
        user_pic: user.user_pic,
        bio: user.bio || "",
        followers: user.followers || [],
        following: user.following || [],
        isPrivate: user.isPrivate,
        lastSeenVisibility: user.lastSeenVisibility || "everyone",
        readReceipts: user.readReceipts,
        blockedUsers: user.blockedUsers,
        settings: user.settings,
        chatSettings: user.chatSettings || [],
        notificationSettings: user.notificationSettings || { messages: true, follows: true, storyViews: true },
      },
    });
  } catch (err) {
    next(err);
  }
};

const getOnlineStatus = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { ids } = req.query;
    if (!ids) {
      return res.json({});
    }

    const userIds = ids.split(",").filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } }).select("lastSeenVisibility followers").lean();
    const statusMap = {};

    await Promise.all(
      users.map(async (user) => {
        const userId = user._id.toString();
        const visibility = user.lastSeenVisibility || "everyone"; // Default to everyone if missing

        let canSee = false;
        if (visibility === "everyone") {
          canSee = true;
        } else if (visibility === "followers") {
          canSee = user.followers?.some(id => id.toString() === currentUserId);
        }

        if (canSee) {
          const online = await redis.get(`user:${userId}:online`);
          statusMap[userId] = online === "1";
        } else {
          statusMap[userId] = false;
        }
      })
    );

    res.json(statusMap);
  } catch (err) {
    next(err);
  }
};

const followUser = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { userId: targetUserId } = req.params;

    if (currentUserId === targetUserId) {
      throw new AppError("Cannot follow yourself", 400);
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) throw new AppError("User not found", 404);

    const currentUser = await User.findById(currentUserId);
    const isFollowing = currentUser.following.includes(targetUserId);

    if (isFollowing) {
      // Unfollow
      await User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUserId } });
      await User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUserId } });
      res.json({ following: false, followersCount: (targetUser.followers?.length || 1) - 1 });
    } else {
      // Follow
      await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetUserId } });
      await User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: currentUserId } });
      res.json({ following: true, followersCount: (targetUser.followers?.length || 0) + 1 });

      // Emit follow notification (fire-and-forget, don't await to avoid blocking response)
      const io = req.app.get("io");
      if (io) {
        createAndEmitNotification(io, {
          recipient: targetUserId,
          sender: currentUserId,
          type: "follow",
        });
      }
    }
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { userId } = req.params;

    const user = await User.findById(userId).select("-password").lean();
    if (!user) throw new AppError("User not found", 404);

    const currentUser = await User.findById(currentUserId).lean();
    const isFollowing = currentUser.following?.some(id => id.toString() === userId) || false;
    const isBlocked = currentUser.blockedUsers?.some(id => id.toString() === userId) || false;
    const followsMe = user.following?.some(id => id.toString() === currentUserId) || false;

    const amIBlocked = user.blockedUsers?.some(id => id.toString() === currentUserId) || false;

    res.json({
      _id: user._id,
      username: user.username,
      user_pic: user.user_pic,
      bio: user.bio || "",
      followersCount: user.followers?.length || 0,
      followingCount: user.following?.length || 0,
      isFollowing,
      isBlocked,
      amIBlocked,
      isPrivate: user.isPrivate || false,
      followsMe
    });
  } catch (err) {
    next(err);
  }
};

const getFollowers = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;

    const user = await User.findById(userId)
      .populate({
        path: "followers",
        select: "username user_pic _id",
        options: { skip: (page - 1) * limit, limit }
      })
      .lean();

    if (!user) throw new AppError("User not found", 404);
    res.json(user.followers || []);
  } catch (err) {
    next(err);
  }
};

const getFollowing = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;

    const user = await User.findById(userId)
      .populate({
        path: "following",
        select: "username user_pic _id",
        options: { skip: (page - 1) * limit, limit }
      })
      .lean();

    if (!user) throw new AppError("User not found", 404);
    res.json(user.following || []);
  } catch (err) {
    next(err);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { page = 1, search } = req.query;
    const limit = 20;
    const skip = (parseInt(page) - 1) * limit;

    const query = { _id: { $ne: currentUserId } };
    
    // Explicitly handle search to ensure it's a non-empty string
    const searchStr = (Array.isArray(search) ? search[0] : search)?.toString().trim();
    
    if (searchStr && searchStr !== "" && searchStr !== "undefined") {
      query.username = { $regex: new RegExp(searchStr, "i") };
    }

    const users = await User.find(query)
      .select("username user_pic followers")
      .skip(skip)
      .limit(limit)
      .lean();

    const currentUser = await User.findById(currentUserId).lean();

    const formattedUsers = users.map(u => ({
      _id: u._id,
      username: u.username,
      user_pic: u.user_pic,
      followersCount: u.followers?.length || 0,
      isFollowing: currentUser.following?.some(id => id.toString() === u._id.toString()) || false
    }));

    res.json(formattedUsers);
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { username, bio } = req.body;
    const updateData = {};

    if (username) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, {
        folder: "users",
        resource_type: "image",
      });
      updateData.user_pic = uploadResult.secure_url;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true }).select("-password");
    
    // Notify all connected clients about the profile update
    const io = req.app.get("io");
    if (io) {
      io.emit("profile_update", {
        userId: updatedUser._id,
        username: updatedUser.username,
        user_pic: updatedUser.user_pic,
        bio: updatedUser.bio
      });
    }

    // Create new token with updated data
    const token = jwt.sign(
      {
        username: updatedUser.username,
        id: updatedUser._id,
        user_pic: updatedUser.user_pic,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({ success: true, user: updatedUser, token });
  } catch (err) {
    next(err);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { isPrivate, lastSeenVisibility, readReceipts, settings, notificationSettings } = req.body;
    const updateData = {};

    if (isPrivate !== undefined) updateData.isPrivate = isPrivate;
    if (lastSeenVisibility) updateData.lastSeenVisibility = lastSeenVisibility;
    if (readReceipts !== undefined) updateData.readReceipts = readReceipts;
    if (settings) {
      updateData.settings = { ...(req.user.settings || {}), ...settings };
    }
    if (notificationSettings) {
      updateData.notificationSettings = notificationSettings;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true }).select("-password");
    res.json({ success: true, user: updatedUser });
  } catch (err) {
    next(err);
  }
};

const blockUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.params;
    const io = req.app.get("io");

    if (userId === targetUserId) throw new AppError("Cannot block yourself", 400);

    await User.findByIdAndUpdate(userId, { $addToSet: { blockedUsers: targetUserId } });
    // Also unfollow automatically when blocking
    await User.findByIdAndUpdate(userId, { $pull: { following: targetUserId } });
    await User.findByIdAndUpdate(targetUserId, { $pull: { followers: userId } });

    // Notify both users via socket
    if (io) {
      io.to(`user:${userId}`).emit("block_update", { targetUserId, blocked: true });
      io.to(`user:${targetUserId}`).emit("block_update", { blockerId: userId, blocked: true });
    }

    res.json({ success: true, message: "User blocked" });
  } catch (err) {
    next(err);
  }
};

const unblockUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.params;
    const io = req.app.get("io");

    await User.findByIdAndUpdate(userId, { $pull: { blockedUsers: targetUserId } });

    // Notify both users via socket
    if (io) {
      io.to(`user:${userId}`).emit("block_update", { targetUserId, blocked: false });
      io.to(`user:${targetUserId}`).emit("block_update", { blockerId: userId, blocked: false });
    }

    res.json({ success: true, message: "User unblocked" });
  } catch (err) {
    next(err);
  }
};

const getBlockedUsers = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate("blockedUsers", "username user_pic").lean();
    res.json(user.blockedUsers || []);
  } catch (err) {
    next(err);
  }
};

const updateChatSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId, accentColor, fontSize, reset } = req.body;
    let { chatWallpaper } = req.body;

    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, {
        folder: "wallpapers",
        resource_type: "image",
      });
      chatWallpaper = uploadResult.secure_url;
    }

    if (!user.chatSettings) user.chatSettings = [];

    if (reset) {
      user.chatSettings = user.chatSettings.filter(
        (s) => s.conversationId?.toString() !== conversationId
      );
    } else {
      const index = user.chatSettings.findIndex(
        (s) => s.conversationId?.toString() === conversationId
      );

      const settingsData = { conversationId };
      if (accentColor !== undefined) settingsData.accentColor = accentColor;
      if (fontSize !== undefined) settingsData.fontSize = fontSize;
      if (chatWallpaper !== undefined) settingsData.chatWallpaper = chatWallpaper;

      if (index > -1) {
        user.chatSettings[index] = { ...user.chatSettings[index], ...settingsData };
      } else {
        user.chatSettings.push(settingsData);
      }
    }

    await user.save();
    res.json({ success: true, chatSettings: user.chatSettings });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  register,
  logout,
  authtest,
  getOnlineStatus,
  followUser,
  getProfile,
  getFollowers,
  getFollowing,
  getAllUsers,
  updateProfile,
  updateSettings,
  updateChatSettings,
  blockUser,
  unblockUser,
  getBlockedUsers,
};
