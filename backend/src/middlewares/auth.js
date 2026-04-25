const verifyJWT = require("../utils/verifyJWT");
const AppError = require("../utils/appError");

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const decoded = await verifyJWT(token);
    req.user = decoded;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  verifyToken,
};
