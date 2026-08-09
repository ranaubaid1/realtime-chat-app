const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const User = require("../models/User");

// Create or get existing conversation
const createConversation = async (req, res) => {
  try {
    const { receiverId, phoneNumber } = req.body;
    const senderId = req.user.userId;

    let targetUserId = receiverId;

    // Fallback: If receiverId is not a valid ObjectId, resolve by phone number
    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      if (phoneNumber) {
        const cleanPhone = phoneNumber.trim();
        const phoneDigits = cleanPhone.replace(/\D/g, "");
        const last10 = phoneDigits.length >= 7 ? phoneDigits.slice(-10) : phoneDigits;

        const foundUser = await User.findOne({
          $or: [
            { phoneNumber: cleanPhone },
            { phoneNumber: { $regex: `${last10}$` } },
          ],
        });
        if (foundUser) {
          targetUserId = foundUser._id;
        }
      }
    }

    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Target user has not registered an account yet.",
      });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: {
        $all: [senderId, targetUserId],
      },
    });

    // If conversation does not exist, create it
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, targetUserId],
      });
    }

    res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all active conversations of logged-in user (only conversations that have messages)
const getConversations = async (req, res) => {
  try {
    const userId = req.user.userId;

    const conversations = await Conversation.find({
      participants: userId,
      lastMessage: { $ne: null },
    })
      .populate("participants", "username phoneNumber profilePicture isOnline lastSeen")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete conversation and its messages
const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const conversation = await Conversation.findOne({
      _id: id,
      participants: userId,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const Message = require("../models/Messages");
    await Message.deleteMany({ conversation: id });
    await Conversation.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: "Conversation deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createConversation,
  getConversations,
  deleteConversation,
};