const express = require("express");
const {
  getConversations,
  getConversation,
  getMessages,
  createOrGetConversation,
  uploadFile,
  getUnreadCount,
  deleteConversation,
  deleteMessage,
  reactToMessage,
} = require("../controllers/conversationController");
const auth = require("../middlewares/auth");
const { uploadUser } = require("../middlewares/upload");

const router = express.Router();

router.route("/").get(auth.verifyToken, getConversations);
router.route("/").post(auth.verifyToken, createOrGetConversation);
router.route("/unread-count").get(auth.verifyToken, getUnreadCount);
router.route("/upload").post(auth.verifyToken, uploadUser.single("file"), uploadFile);
router.route("/:id/messages").get(auth.verifyToken, getMessages);
router.route("/:id").get(auth.verifyToken, getConversation);
router.route("/:id").delete(auth.verifyToken, deleteConversation);
router.route("/messages/:id").delete(auth.verifyToken, deleteMessage);
router.route("/messages/:id/react").post(auth.verifyToken, reactToMessage);

module.exports = router;
