const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createConversation,
  getConversations,
  deleteConversation,
} = require("../controllers/conversationController");

// Create conversation
router.post("/", authMiddleware, createConversation);

// Get logged-in user's conversations
router.get("/", authMiddleware, getConversations);

// Delete conversation
router.delete("/:id", authMiddleware, deleteConversation);

module.exports = router;