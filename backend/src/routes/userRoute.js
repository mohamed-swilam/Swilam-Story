const express = require("express");
const {
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
} = require("../controllers/userController");
const auth = require('../middlewares/auth');
const { uploadUser } = require("../middlewares/upload");

const router = express.Router();

router.route("/register").post(uploadUser.single("user_pic"), register);
router.route("/login").post(login);
router.route("/logout").post(auth.verifyToken, logout);
router.route("/auth").post(auth.verifyToken, authtest);
router.route("/online-status").get(auth.verifyToken, getOnlineStatus);
router.route("/explore").get(auth.verifyToken, getAllUsers);
router.route("/update-profile").patch(auth.verifyToken, uploadUser.single("user_pic"), updateProfile);
router.route("/update-settings").patch(auth.verifyToken, updateSettings);
router.route("/update-chat-settings").patch(auth.verifyToken, uploadUser.single("chatWallpaper"), updateChatSettings);
router.route("/blocked").get(auth.verifyToken, getBlockedUsers);
router.route("/block/:targetUserId").post(auth.verifyToken, blockUser);
router.route("/unblock/:targetUserId").post(auth.verifyToken, unblockUser);
router.route("/:userId/follow").post(auth.verifyToken, followUser);
router.route("/:userId/profile").get(auth.verifyToken, getProfile);
router.route("/:userId/followers").get(auth.verifyToken, getFollowers);
router.route("/:userId/following").get(auth.verifyToken, getFollowing);

module.exports = router;

