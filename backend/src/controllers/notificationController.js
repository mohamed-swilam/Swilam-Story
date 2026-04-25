const Notification = require("../models/Notification");
const AppError = require("../utils/appError");

const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const [notifications, unreadCount, total] = await Promise.all([
      Notification.find({ recipient: userId })
        .populate("sender", "username user_pic")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ recipient: userId, read: false }),
      Notification.countDocuments({ recipient: userId }),
    ]);

    res.json({
      notifications,
      unreadCount,
      hasMore: skip + notifications.length < total,
      page,
    });
  } catch (err) {
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { types } = req.body || {};
    
    const query = { recipient: userId, read: false };
    if (types && Array.isArray(types)) {
      query.type = { $in: types };
    }

    await Notification.updateMany(query, { read: true });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const markOneRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { read: true },
      { new: true }
    );
    if (!notification) throw new AppError("Notification not found", 404);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: userId,
    });
    if (!notification) throw new AppError("Notification not found", 404);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markAllRead, markOneRead, deleteNotification };
