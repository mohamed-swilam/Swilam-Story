const express = require("express");
const {
  getAllStories,
  getAllUserStories,
  storyView,
  newStory,
  deleteStory,
  checkStoryExists,
  addReaction,
  getExploreStories,
} = require("../controllers/storyController");
const { uploadStory } = require("../middlewares/upload");
const auth = require("../middlewares/auth");
const router = express.Router();

router.route("/feed").get(auth.verifyToken, getAllStories);
router.route("/explore").get(auth.verifyToken, getExploreStories);

router.route("/:user_id").get(auth.verifyToken, getAllUserStories);

router.route("/:story_id/exists").get(auth.verifyToken, checkStoryExists);

router.route("/:story_id/view").post(auth.verifyToken, storyView);
router.route("/:story_id/react").post(auth.verifyToken, addReaction);

router.route("/delete/:story_id").delete(auth.verifyToken, deleteStory);

router.post(
  "/upload",
  auth.verifyToken,
  (req, res, next) => {
    uploadStory.single("media_url")(req, res, function (err) {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).send(err.message);
      }
      next();
    });
  },
  newStory
);

module.exports = router;
