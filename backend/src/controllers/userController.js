const jwt = require("jsonwebtoken");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const redis = require("../utils/redis");
const { uploadToCloudinary } = require("../services/cloudinaryUpload");
const AppError = require("../utils/appError");

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
        password: user.password,
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
      folder: "stories",
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
    const token = req.headers.authorization;
    res.status(200).json({
      message: "USER AUTHORIZED",
      token,
      user: {
        id: req.user.id,
        username: req.user.username,
        user_pic: req.user.user_pic,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  register,
  logout,
  authtest,
};
