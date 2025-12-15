const express = require("express");
const {
  login,
  register,
  logout,
  authtest,
} = require("../controllers/userController");
const auth = require('../middlewares/auth')
const {uploadUser} = require("../middlewares/upload");

const router = express.Router();

router.route("/register").post(uploadUser.single("user_pic"), register);
router.route("/login").post(login);
router.route("/logout").post(auth.verifyToken, logout);
router.route("/auth").post(auth.verifyToken, authtest);

module.exports = router;
