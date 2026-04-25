const express = require("express");
const {
  createGroup,
  addParticipant,
  removeParticipant,
  leaveGroup,
} = require("../controllers/conversationController");
const auth = require("../middlewares/auth");
const { uploadGroup } = require("../middlewares/upload");

const router = express.Router();

router.route("/").post(auth.verifyToken, uploadGroup.single("groupPhoto"), createGroup);
router.route("/:id/participants").post(auth.verifyToken, addParticipant);
router.route("/:id/participants/:userId").delete(auth.verifyToken, removeParticipant);
router.route("/:id/leave").post(auth.verifyToken, leaveGroup);

module.exports = router;
