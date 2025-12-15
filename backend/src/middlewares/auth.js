const jwt = require("jsonwebtoken");
const redis = require('../utils/redis')

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    throw new AppError("Forbidden", 403)
  }
  const isBlacklisted = await redis.get(`blacklist:${token}`);
  if (isBlacklisted)
    throw new AppError("Forbidden", 403)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    throw new AppError("Forbidden", 403)
  }
};

module.exports = {
  verifyToken,
};
