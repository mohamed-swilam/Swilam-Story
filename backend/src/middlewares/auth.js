const verifyJWT = require("../utils/verifyJWT");

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
