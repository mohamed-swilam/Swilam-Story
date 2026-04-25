const jwt = require("jsonwebtoken");
const redis = require("./redis");
const AppError = require("./appError");

/**
 * Verifies a JWT token against the blacklist and returns the decoded payload.
 * Used by both the REST auth middleware and the Socket.io handshake middleware.
 *
 * @param {string} token - The raw JWT string
 * @returns {Promise<object>} Decoded token payload
 * @throws {AppError} If token is missing, blacklisted, or invalid
 */
const verifyJWT = async (token) => {
  if (!token) {
    throw new AppError("Forbidden", 403);
  }

  const isBlacklisted = await redis.get(`blacklist:${token}`);
  if (isBlacklisted) {
    throw new AppError("Forbidden", 403);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (err) {
    throw new AppError("Forbidden", 403);
  }
};

module.exports = verifyJWT;
