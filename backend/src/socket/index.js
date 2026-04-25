const { Server } = require("socket.io");
const mongoose = require("mongoose");
const verifyJWT = require("../utils/verifyJWT");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const Notification = require("../models/Notification");
const redis = require("../utils/redis");

const ONLINE_TTL = 30; // seconds

/**
 * Creates a Notification document and emits it to the recipient via socket.
 * Skips if: recipient has blocked sender, preference is off, or a duplicate
 * unread notification exists within the last 60 seconds.
 */
async function createAndEmitNotification(io, { recipient, sender, type, storyId, conversationId, messagePreview, reaction }) {
  try {
    // 1. Don't notify yourself
    if (recipient.toString() === sender.toString()) return;

    // 2. Fetch recipient prefs + block list
    const recipientUser = await User.findById(recipient)
      .select("blockedUsers notificationSettings")
      .lean();
    if (!recipientUser) return;

    // 3. Check if recipient has blocked the sender
    if (recipientUser.blockedUsers?.some(id => id.toString() === sender.toString())) return;

    // 4. Check notification preferences
    const prefs = recipientUser.notificationSettings || {};
    if (type === "message"        && prefs.messages       === false) return;
    if (type === "follow"         && prefs.follows        === false) return;
    if (type === "story_view"     && prefs.storyViews     === false) return;
    if (type === "story_reply"    && prefs.storyReplies   === false) return;
    if (type === "story_reaction" && prefs.storyReactions === false) return;

    // 5. Dedup: skip if same unread notification within 60 seconds
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const existing = await Notification.findOne({
      recipient,
      sender,
      type,
      read: false,
      createdAt: { $gte: oneMinuteAgo },
    }).lean();
    if (existing) return;

    // 6. Create
    const notif = await Notification.create({ recipient, sender, type, storyId, conversationId, messagePreview, reaction });
    await notif.populate("sender", "username user_pic");

    // 7. Emit to recipient's private room
    io.to(`user:${recipient}`).emit("new_notification", notif);
  } catch (err) {
    console.error("createAndEmitNotification error:", err.message);
  }
}

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3001",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // ── Auth Middleware ────────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const decoded = await verifyJWT(token);
      
      const user = await User.findById(decoded.id).select("username user_pic isPrivate lastSeenVisibility readReceipts blockedUsers following");
      if (!user) return next(new Error("User not found"));
      
      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  // ── Connection ─────────────────────────────────────────────────────────────
  io.on("connection", async (socket) => {
    const userId = socket.user.id;
    console.log(`Socket connected: ${socket.user.username} (${userId})`);

    // Join private room for targeted emits
    socket.join(`user:${userId}`);

    // Mark user online
    await redis.set(`user:${userId}:online`, "1", { EX: ONLINE_TTL });
    
    const visibility = socket.user.lastSeenVisibility || "everyone";

    // Notify others based on visibility
    if (visibility !== "nobody") {
      socket.broadcast.emit("user_online", { 
        userId, 
        visibility,
        followersOnly: visibility === "followers"
      });
    }

    // ── join_conversation ────────────────────────────────────────────────────
    socket.on("join_conversation", async ({ conversationId }) => {
      try {
        const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
        if (!conversation) return;
        socket.join(conversationId);
      } catch (err) {
        console.error("join_conversation error:", err.message);
      }
    });

    // ── send_message ─────────────────────────────────────────────────────────
    socket.on("send_message", async ({ conversationId, content, type = "text", fileUrl = "", fileName = "", fileSize = 0, storyReply, replyTo, voiceMessage }) => {
      // replyTo shape (optional): { messageId, content, senderUsername }
      try {
        if (!content?.trim() && !fileUrl && !storyReply && !voiceMessage) return;

        const conversation = await Conversation.findOne({ _id: conversationId }).populate("participants", "isPrivate blockedUsers followers following");
        if (!conversation || !conversation.participants.some(p => p._id.toString() === userId)) return;

        // Security Checks: Blocked & Private
        const recipients = conversation.participants.filter(p => p._id.toString() !== userId);
        
        for (const recipient of recipients) {
          // 1. Check if blocked
          if (recipient.blockedUsers?.some(id => id.toString() === userId)) {
            return socket.emit("error_message", { message: "You are blocked by this user" });
          }
          
          // 2. Check if private
          if (recipient.isPrivate && !storyReply) {
            const recipientFollowsSender = recipient.following?.some(id => id.toString() === userId.toString());
            if (!recipientFollowsSender && !conversation.isGroup) {
              return socket.emit("error_message", { message: "This account is private. You can only message them if they follow you." });
            }
          }
        }

        const messageData = {
          conversationId,
          sender: userId,
          content: content?.trim() || "",
          type,
          fileUrl,
          fileName,
          fileSize,
          voiceMessage, // { url, duration, publicId, waveformData }
          readBy: [new mongoose.Types.ObjectId(userId)],
          ...(replyTo?.messageId ? {
            replyTo: {
              messageId: replyTo.messageId,
              content: (replyTo.content || "").slice(0, 100),
              senderUsername: replyTo.senderUsername || "",
            }
          } : {}),
        };
        if (storyReply) {
          messageData.storyReply = storyReply;
        }

        const message = new Message(messageData);
        await message.save();
        await message.populate([
          { path: "sender", select: "username user_pic" },
        ]);

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          updatedAt: new Date(),
          $set: { deletedFor: [] } // Restore conversation for all participants
        });

        conversation.participants.forEach(p => {
          io.to(`user:${p._id}`).emit("message_received", message);
        });

        // Notifications are no longer sent for direct messages
        // BUT we send one for story_reply
        if (storyReply) {
          for (const recipient of recipients) {
            await createAndEmitNotification(io, {
              recipient: recipient._id,
              sender: userId,
              type: "story_reply",
              conversationId,
              messagePreview: content?.trim().substring(0, 50) || "",
            });
          }
        }
      } catch (err) {
        console.error("send_message error:", err.message);
      }
    });

    socket.on("update_user_prefs", async () => {
      try {
        const freshUser = await User.findById(userId).select("username user_pic isPrivate lastSeenVisibility readReceipts blockedUsers following");
        if (!freshUser) return;

        const oldVisibility = socket.user.lastSeenVisibility;
        const oldPrivacy = socket.user.isPrivate;
        socket.user = freshUser;

        // 1. If privacy status changed, broadcast it to everyone
        if (oldPrivacy !== freshUser.isPrivate) {
          socket.broadcast.emit("privacy_update", { 
            userId, 
            isPrivate: freshUser.isPrivate 
          });
        }

        // 2. If visibility preference changed, re-broadcast status
        if (oldVisibility !== freshUser.lastSeenVisibility) {
          const visibility = freshUser.lastSeenVisibility || "everyone";
          if (visibility === "nobody") {
            socket.broadcast.emit("user_offline", { userId });
          } else {
            socket.broadcast.emit("user_online", { 
              userId, 
              visibility,
              followersOnly: visibility === "followers"
            });
          }
        }
      } catch (err) {
        console.error("update_user_prefs error:", err.message);
      }
    });

    // ── mark_read ────────────────────────────────────────────────────────────
    socket.on("mark_read", async ({ conversationId }) => {
      try {
        const mongoose = require("mongoose");
        
        // 1. ALWAYS update the database so the reader's unread count clears
        const updateResult = await Message.updateMany(
          {
            conversationId: new mongoose.Types.ObjectId(conversationId),
            sender: { $ne: new mongoose.Types.ObjectId(userId) },
            readBy: { $ne: new mongoose.Types.ObjectId(userId) },
          },
          { $addToSet: { readBy: new mongoose.Types.ObjectId(userId) } }
        );

        if (updateResult.modifiedCount > 0) {
          // 2. Fetch fresh preference to decide whether to notify the sender
          const userPrefs = await User.findById(userId).select("readReceipts").lean();
          
          // Only notify others if the reader has read receipts ENABLED
          if (userPrefs && userPrefs.readReceipts !== false) {
            io.to(conversationId).emit("messages_read", {
              conversationId,
              readBy: userId,
            });

            const conversation = await Conversation.findById(conversationId).select("participants");
            if (conversation) {
              conversation.participants.forEach(pId => {
                io.to(`user:${pId}`).emit("messages_read", {
                  conversationId,
                  readBy: userId,
                });
              });
            }
          }
        }
      } catch (err) {
        console.error("mark_read error:", err.message);
      }
    });

    // ── typing ───────────────────────────────────────────────────────────────
    socket.on("typing", async ({ conversationId }) => {
      socket.to(conversationId).emit("user_typing", {
        conversationId,
        userId,
        username: socket.user.username,
      });

      const conversation = await Conversation.findById(conversationId).select("participants");
      if (conversation) {
        conversation.participants.forEach(pId => {
          if (pId.toString() !== userId) {
            io.to(`user:${pId}`).emit("user_typing", { conversationId, userId, username: socket.user.username });
          }
        });
      }
    });

    // ── stop_typing ──────────────────────────────────────────────────────────
    socket.on("stop_typing", async ({ conversationId }) => {
      socket.to(conversationId).emit("user_stop_typing", { conversationId, userId });

      const conversation = await Conversation.findById(conversationId).select("participants");
      if (conversation) {
        conversation.participants.forEach(pId => {
          if (pId.toString() !== userId) {
            io.to(`user:${pId}`).emit("user_stop_typing", { conversationId, userId });
          }
        });
      }
    });

    // ── heartbeat — keeps online status alive ────────────────────────────────
    socket.on("heartbeat", async () => {
      await redis.set(`user:${userId}:online`, "1", { EX: ONLINE_TTL });
    });

    // ── disconnect ───────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${socket.user.username} (${userId})`);
      await redis.del(`user:${userId}:online`);
      
      const visibility = socket.user.lastSeenVisibility || "everyone";
      if (visibility !== "nobody") {
        socket.broadcast.emit("user_offline", { 
          userId,
          visibility,
          followersOnly: visibility === "followers"
        });
      }
    });
  });

  return io;
};

module.exports = { initSocket, createAndEmitNotification };
