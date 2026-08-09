const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createConversation,
  getConversations,
} = require("../controllers/conversationController");

// Create conversation
router.post("/", authMiddleware, createConversation);

// Get logged-in user's conversations
router.get("/", authMiddleware, getConversations);

module.exports = router;