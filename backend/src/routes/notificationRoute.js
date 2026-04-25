const express = require("express");
const {
  getNotifications,
  markAllRead,
  markOneRead,
  deleteNotification,
} = require("../controllers/notificationController");
const auth = require("../middlewares/auth");

const router = express.Router();

router.get("/", auth.verifyToken, getNotifications);
router.patch("/read-all", auth.verifyToken, markAllRead);
router.patch("/:id/read", auth.verifyToken, markOneRead);
router.delete("/:id", auth.verifyToken, deleteNotification);

module.exports = router;
