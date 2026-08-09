const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,

  params: async (req, file) => {
    let folder = "chat-app";
    let resource_type = "image";

    // Audio / Voice
    if (file.mimetype.startsWith("audio")) {
      folder = "chat-app/audio";
      resource_type = "video";
    }

    // Documents / Files
    else if (
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/zip" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      file.mimetype === "text/plain"
    ) {
      folder = "chat-app/files";
      resource_type = "raw";
    }

    // Images
    else if (file.mimetype.startsWith("image")) {
      folder = "chat-app/images";
      resource_type = "image";
    }

    return {
      folder,
      resource_type,
    };
  },
});

const upload = multer({
  storage,
});

module.exports = upload;