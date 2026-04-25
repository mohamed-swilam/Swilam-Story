const multer = require("multer");

const uploadStory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "video/mp4", "video/webm", "audio/webm", "audio/mp4", "audio/ogg", "audio/wav"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Invalid file type"), false);
    }
    cb(null, true);
  },
});

const uploadUser = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Invalid file type"), false);
    }
    cb(null, true);
  },
});

const uploadGroup = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Invalid file type"), false);
    }
    cb(null, true);
  },
});

const uploadVoice = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/mpeg"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Invalid audio type"), false);
    }
    cb(null, true);
  },
});

const uploadChatFile = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for chat files
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, audio, pdfs, docs, archives
    const allowedPrefixes = ["image/", "video/", "audio/", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip", "application/x-rar-compressed", "application/x-zip-compressed", "application/x-7z-compressed", "text/plain", "application/json"];
    
    const isAllowed = allowedPrefixes.some(prefix => file.mimetype.startsWith(prefix)) || file.originalname.match(/\.(zip|rar|7z|pdf|doc|docx|txt|json)$/i);
    
    if (!isAllowed) {
      return cb(new Error(`Invalid file type: ${file.mimetype}`), false);
    }
    cb(null, true);
  },
});

module.exports = { uploadStory, uploadUser, uploadGroup, uploadVoice, uploadChatFile };
