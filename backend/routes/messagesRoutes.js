const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

const {
  sendMessage,
  getMessages,
  replyMessage,
  editMessage,
  deleteForMe,
  deleteForEveryone,
  addReaction,
  starMessage,
  pinMessage,
  forwardMessage,
  markAsSeen,
  markAsDelivered,
} = require("../controllers/messageController");

router.post("/", authMiddleware, upload.single("file"), sendMessage);
router.get("/:conversationId", authMiddleware, getMessages);
router.post("/reply", authMiddleware, replyMessage);
router.put("/edit/:messageId", authMiddleware, editMessage);
router.put("/delete-me/:messageId", authMiddleware, deleteForMe);
router.put("/delete-everyone/:messageId", authMiddleware, deleteForEveryone);
router.put("/reaction/:messageId", authMiddleware, addReaction);
router.put("/star/:messageId", authMiddleware, starMessage);
router.put("/pin/:messageId", authMiddleware, pinMessage);
router.post("/forward/:messageId", authMiddleware, forwardMessage);
router.put("/seen/:messageId", authMiddleware, markAsSeen);
router.put("/delivered/:messageId", authMiddleware, markAsDelivered);

module.exports = router;