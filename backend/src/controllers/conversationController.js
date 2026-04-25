const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const AppError = require("../utils/appError");
const { uploadToCloudinary } = require("../services/cloudinaryUpload");
const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const currentUser = await User.findById(userId).select("blockedUsers").lean();
    const myBlockedList = currentUser?.blockedUsers?.map(id => id.toString()) || [];

    const conversations = await Conversation.find({ 
      participants: userId,
      deletedFor: { $ne: userId },
      $or: [
        { isGroup: true },
        { lastMessage: { $ne: null } }
      ]
    })
      .populate("participants", "username user_pic isPrivate following blockedUsers")
      .populate({
        path: "lastMessage",
        select: "content sender createdAt readBy",
      })
      .sort({ updatedAt: -1 })
      .lean();

    // Reshape: expose the "other" participant and compute unread count
    const result = await Promise.all(
      conversations.map(async (conv) => {
        const otherParticipantRaw = conv.participants.find(
          (p) => p._id.toString() !== userId
        );

        let otherParticipant = null;
        if (otherParticipantRaw) {
          otherParticipant = {
            _id: otherParticipantRaw._id,
            username: otherParticipantRaw.username,
            user_pic: otherParticipantRaw.user_pic,
            isPrivate: otherParticipantRaw.isPrivate || false,
            followsMe: otherParticipantRaw.following?.some(id => id.toString() === userId) || false,
            isBlocked: myBlockedList.includes(otherParticipantRaw._id.toString()),
            amIBlocked: otherParticipantRaw.blockedUsers?.some(id => id.toString() === userId) || false
          };
        }

        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          readBy: { $ne: new mongoose.Types.ObjectId(userId) },
          sender: { $ne: new mongoose.Types.ObjectId(userId) },
        });

        return {
          _id: conv._id,
          isGroup: conv.isGroup,
          groupName: conv.groupName,
          groupPhoto: conv.groupPhoto,
          groupAdmin: conv.groupAdmin,
          participants: conv.isGroup ? conv.participants : undefined,
          participant: conv.isGroup ? null : otherParticipant,
          lastMessage: conv.lastMessage,
          unreadCount,
          updatedAt: conv.updatedAt,
        };
      })
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const { id: conversationId } = req.params;
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Ensure user is a participant in this conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });
    if (!conversation) {
      throw new AppError("Conversation not found", 404);
    }

    const messages = await Message.find({ 
      conversationId,
      deletedFor: { $ne: new mongoose.Types.ObjectId(userId) }
    })
      .populate("sender", "username user_pic")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Fetch users in this conversation who have read receipts DISABLED
    const hiddenReceiptUsers = await User.find({
      _id: { $in: conversation.participants },
      readReceipts: false
    }).select("_id").lean();
    const hiddenIds = hiddenReceiptUsers.map(u => u._id.toString());

    // Map through messages and filter readBy based on privacy settings
    const processedMessages = messages.map(msg => {
      if (!msg.sender) return msg;
      const isRequesterSender = (msg.sender._id || msg.sender).toString() === userId;
      
      if (isRequesterSender && msg.readBy) {
        // If I am the sender, I should only see readBy IDs for users who have receipts ENABLED
        // (unless it's myself, e.g. in a group where I read my own message from another device)
        msg.readBy = msg.readBy.filter(id => {
          const idStr = id.toString();
          return !hiddenIds.includes(idStr) || idStr === userId;
        });
      }
      return msg;
    });

    const total = await Message.countDocuments({ 
      conversationId,
      deletedFor: { $ne: userId }
    });

    res.json({
      messages: processedMessages,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    });
  } catch (err) {
    next(err);
  }
};

const getConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: conversationId } = req.params;

    let conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    }).populate("participants", "username user_pic isPrivate following blockedUsers");

    if (!conversation) {
      throw new AppError("Conversation not found", 404);
    }

    // If conversation was deleted for this user, restore it
    if (conversation.deletedFor.includes(userId)) {
      conversation.deletedFor = conversation.deletedFor.filter(id => id.toString() !== userId.toString());
      await conversation.save();
    }

    // Find other participant
    const otherParticipantRaw = conversation.participants.find(
      (p) => p._id.toString() !== userId
    );

    let otherParticipant = null;
    if (otherParticipantRaw) {
      const User = require("../models/User");
      const currentUserData = await User.findById(userId).select("blockedUsers");
      const myBlockedList = currentUserData?.blockedUsers?.map(id => id.toString()) || [];

      otherParticipant = {
        _id: otherParticipantRaw._id,
        username: otherParticipantRaw.username,
        user_pic: otherParticipantRaw.user_pic,
        isPrivate: otherParticipantRaw.isPrivate || false,
        followsMe: otherParticipantRaw.following?.some(id => id.toString() === userId) || false,
        isBlocked: myBlockedList.includes(otherParticipantRaw._id.toString()),
        amIBlocked: otherParticipantRaw.blockedUsers?.some(id => id.toString() === userId) || false
      };
    }

    res.json({
      _id: conversation._id,
      isGroup: conversation.isGroup,
      groupName: conversation.groupName,
      groupPhoto: conversation.groupPhoto,
      participants: conversation.participants,
      participant: otherParticipant,
    });
  } catch (err) {
    next(err);
  }
};

const createOrGetConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { participantId } = req.body;
    const User = require("../models/User");

    if (!participantId) {
      throw new AppError("participantId is required", 400);
    }

    if (userId === participantId) {
      throw new AppError("Cannot create a conversation with yourself", 400);
    }

    const participant = await User.findById(participantId).select("isPrivate following");
    if (!participant) throw new AppError("User not found", 404);

    // Strict Privacy Check: If private, only people I follow can message me
    if (participant.isPrivate) {
      const isFollowing = participant.following?.some(id => id.toString() === userId.toString());
      if (!isFollowing) {
        throw new AppError("This account is private. You can only message them if they follow you.", 403);
      }
    }

    // Look for an existing DM conversation between exactly these two users
    let existing = await Conversation.findOne({
      participants: { $all: [userId, participantId], $size: 2 },
      isGroup: { $ne: true },
    });

    if (existing) {
      // If conversation was deleted for this user, restore it
      if (existing.deletedFor.includes(userId)) {
        existing.deletedFor = existing.deletedFor.filter(id => id.toString() !== userId.toString());
        await existing.save();
      }
      
      await existing.populate("participants", "username user_pic isPrivate following blockedUsers");
      return res.json(existing);
    }

    const newConversation = new Conversation({
      participants: [userId, participantId],
    });
    await newConversation.save();
    await newConversation.populate("participants", "username user_pic");

    res.status(201).json(newConversation);
  } catch (err) {
    next(err);
  }
};

const createGroup = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let { participants, groupName } = req.body;
    if (!groupName) throw new AppError("Group name is required", 400);

    if (typeof participants === "string") {
      try {
        participants = JSON.parse(participants);
      } catch (e) {
        participants = participants.split(",");
      }
    }
    
    if (!Array.isArray(participants)) {
      throw new AppError("Participants must be an array", 400);
    }

    const uniqueParticipants = [...new Set([userId, ...participants])];
    if (uniqueParticipants.length < 3) {
      throw new AppError("A group must have at least 3 members (you + 2 others)", 400);
    }

    for (const pId of participants) {
      if (pId === userId) continue;
      const dm = await Conversation.findOne({
        participants: { $all: [userId, pId], $size: 2 },
        isGroup: { $ne: true }
      });
      if (!dm) {
        throw new AppError(`Cannot add user - you do not have a direct conversation with them`, 403);
      }
    }

    let groupPhoto = null;
    let groupPhotoPublicId = null;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, {
        folder: "groups",
        resource_type: "image",
      });
      groupPhoto = uploadResult.secure_url;
      groupPhotoPublicId = uploadResult.public_id;
    }

    const newGroup = new Conversation({
      isGroup: true,
      groupName,
      groupPhoto,
      groupPhotoPublicId,
      groupAdmin: userId,
      participants: uniqueParticipants,
    });
    await newGroup.save();
    await newGroup.populate("participants", "username user_pic");

    res.status(201).json(newGroup);
  } catch (err) {
    next(err);
  }
};

const addParticipant = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: conversationId } = req.params;
    const { userId: newParticipantId } = req.body;

    if (!newParticipantId) throw new AppError("userId is required", 400);

    const group = await Conversation.findOne({ _id: conversationId, isGroup: true });
    if (!group) throw new AppError("Group not found", 404);
    if (group.groupAdmin.toString() !== userId) throw new AppError("Only the admin can add participants", 403);

    const dm = await Conversation.findOne({
      participants: { $all: [userId, newParticipantId], $size: 2 },
      isGroup: { $ne: true }
    });
    if (!dm) throw new AppError("You must have a direct conversation with the user to add them", 403);

    if (!group.participants.includes(newParticipantId)) {
      group.participants.push(newParticipantId);
      await group.save();
    }

    await group.populate("participants", "username user_pic");
    res.json(group);
  } catch (err) {
    next(err);
  }
};

const removeParticipant = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: conversationId, userId: targetUserId } = req.params;

    const group = await Conversation.findOne({ _id: conversationId, isGroup: true });
    if (!group) throw new AppError("Group not found", 404);
    if (group.groupAdmin.toString() !== userId) throw new AppError("Only the admin can remove participants", 403);
    if (targetUserId === userId) throw new AppError("Admin cannot remove themselves", 400);

    group.participants = group.participants.filter(pId => pId.toString() !== targetUserId);
    await group.save();

    await group.populate("participants", "username user_pic");
    res.json(group);
  } catch (err) {
    next(err);
  }
};

const leaveGroup = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: conversationId } = req.params;

    const group = await Conversation.findOne({ _id: conversationId, isGroup: true, participants: userId });
    if (!group) throw new AppError("Group not found or you are not a participant", 404);

    group.participants = group.participants.filter(pId => pId.toString() !== userId);

    if (group.participants.length === 0) {
      await Conversation.findByIdAndDelete(group._id);
      return res.json({ message: "Group deleted as last member left", deleted: true });
    }

    if (group.groupAdmin.toString() === userId) {
      group.groupAdmin = group.participants[0];
    }

    await group.save();
    res.json({ message: "Left group successfully" });
  } catch (err) {
    next(err);
  }
};

const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError("No file uploaded", 400);

    const isImage = req.file.mimetype.startsWith("image/");
    const isAudio = req.file.mimetype.startsWith("audio/");
    
    const resourceType = isImage ? "image" : (isAudio ? "video" : "raw"); // Cloudinary uses 'video' for audio
    
    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      folder: "messages",
      resource_type: resourceType,
    });

    res.json({
      success: true,
      fileUrl: uploadResult.secure_url,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (err) {
    next(err);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Find all conversations where user is a participant and has NOT deleted it
    const conversations = await Conversation.find({ 
      participants: userId,
      deletedFor: { $ne: userId }
    }).select("_id").lean();
    const conversationIds = conversations.map(c => c._id);

    if (conversationIds.length === 0) {
      return res.json({ totalUnread: 0 });
    }

    // Count messages in these conversations that the user hasn't read yet
    const unreadCount = await Message.countDocuments({
      conversationId: { $in: conversationIds },
      readBy: { $ne: new mongoose.Types.ObjectId(userId) },
      sender: { $ne: new mongoose.Types.ObjectId(userId) },
    });

    res.json({ totalUnread: unreadCount });
  } catch (err) {
    next(err);
  }
};

const deleteConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: conversationId } = req.params;

    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, participants: userId },
      { $addToSet: { deletedFor: userId } },
      { new: true }
    );

    if (!conversation) {
      throw new AppError("Conversation not found", 404);
    }

    // Also mark all current messages as deleted for this user
    await Message.updateMany(
      { 
        conversationId: new mongoose.Types.ObjectId(conversationId), 
        deletedFor: { $ne: new mongoose.Types.ObjectId(userId) } 
      },
      { $addToSet: { deletedFor: new mongoose.Types.ObjectId(userId) } }
    );

    res.json({ success: true, message: "Conversation deleted for you" });
  } catch (err) {
    next(err);
  }
};

const deleteMessage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: messageId } = req.params;
    const { forEveryone } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      throw new AppError("Message not found", 404);
    }

    if (forEveryone) {
      if (message.sender.toString() !== userId) {
        throw new AppError("You can only unsend your own messages", 403);
      }

      await Message.findByIdAndDelete(messageId);

      // Emit socket event for real-time removal
      const io = req.app.get("io");
      if (io) {
        io.to(message.conversationId.toString()).emit("message_deleted", {
          messageId,
          conversationId: message.conversationId,
        });
      }

      return res.json({ success: true, message: "Message unsent for everyone" });
    }

    // Individual deletion
    message.deletedFor.addToSet(userId);
    await message.save();

    res.json({ success: true, message: "Message deleted for you" });
  } catch (err) {
    next(err);
  }
};

const reactToMessage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findById(messageId);
    if (!message) throw new AppError("Message not found", 404);

    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === userId
    );

    if (existingReactionIndex > -1) {
      if (message.reactions[existingReactionIndex].emoji === emoji) {
        // Toggle off if same emoji
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        // Update emoji
        message.reactions[existingReactionIndex].emoji = emoji;
      }
    } else {
      // Add new reaction
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.to(message.conversationId.toString()).emit("message_reaction", {
        messageId,
        conversationId: message.conversationId,
        reactions: message.reactions,
      });
    }

    res.json({ success: true, reactions: message.reactions });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getConversations,
  getConversation,
  getMessages,
  createOrGetConversation,
  createGroup,
  addParticipant,
  removeParticipant,
  leaveGroup,
  uploadFile,
  getUnreadCount,
  deleteConversation,
  deleteMessage,
  reactToMessage,
};
