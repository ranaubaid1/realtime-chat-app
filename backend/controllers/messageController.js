const Message = require("../models/Messages");
const Conversation = require("../models/Conversation");

// ==========================
// Send Message
// ==========================
const sendMessage = async (req, res) => {
  try {
    const { conversationId, text } = req.body;
    const sender = req.user.userId;

    const conversation =
      await Conversation.findById(
        conversationId
      );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const messageData = {
      conversation: conversationId,
      sender,
    };

    // =========================
    // Text
    // =========================

    if (text && text.trim()) {
      messageData.text = text.trim();
      messageData.messageType = "text";
    }

    // =========================
    // File
    // =========================

    if (req.file) {
      const mimeType =
        req.file.mimetype || "";

      // Image
      if (
        mimeType.startsWith("image")
      ) {
        messageData.image =
          req.file.path;

        messageData.messageType =
          "image";
      }

      // Audio / Voice
      else if (
        mimeType.startsWith("audio")
      ) {
        messageData.audio =
          req.file.path;

        messageData.messageType =
          "audio";
      }

      // Other files
      else {
        messageData.file =
          req.file.path;

        messageData.fileName =
          req.file.originalname;

        messageData.messageType =
          "file";
      }
    }

    // =========================
    // Nothing received
    // =========================

    if (
      !messageData.text &&
      !messageData.image &&
      !messageData.audio &&
      !messageData.file
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Message or file is required",
      });
    }

    const message =
      await Message.create(
        messageData
      );

    const populatedMessage =
      await Message.findById(
        message._id
      ).populate(
        "sender",
        "username profilePicture"
      );

    res.status(201).json({
      success: true,
      message:
        "Message sent successfully",
      data: populatedMessage,
    });

  } catch (error) {
    console.error(
      "Send message error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Get Messages
// ==========================
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const messages = await Message.find({
      conversation: conversationId,
      deletedForEveryone: false,
    })
      .populate("sender", "username profilePicture")
      .populate("replyTo")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: messages,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Reply Message
// ==========================
const replyMessage = async (req, res) => {
  try {

    const { conversationId, replyTo, text } = req.body;

    const sender = req.user.userId;

    const oldMessage = await Message.findById(replyTo);

    if (!oldMessage) {
      return res.status(404).json({
        success: false,
        message: "Original message not found",
      });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender,
      text,
      replyTo,
      messageType: "text",
    });

    res.status(201).json({
      success: true,
      message: "Reply sent successfully",
      data: message,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// ==========================
// Edit Message
// ==========================
const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.user.userId;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (message.sender.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own message",
      });
    }

    message.text = text;
    message.edited = true;
    message.editedAt = new Date();

    await message.save();

    res.status(200).json({
      success: true,
      message: "Message updated successfully",
      data: message,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Delete For Me
// ==========================
const deleteForMe = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
      await message.save();
    }

    res.status(200).json({
      success: true,
      message: "Message deleted for you",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Delete For Everyone
// ==========================
const deleteForEveryone = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (message.sender.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only sender can delete for everyone",
      });
    }

    message.deletedForEveryone = true;

    await message.save();

    res.status(200).json({
      success: true,
      message: "Message deleted for everyone",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// ==========================
// Add Reaction
// ==========================
const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.userId;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    const existingReaction = message.reactions.find(
      (reaction) => reaction.user.toString() === userId
    );

    if (existingReaction) {
      existingReaction.emoji = emoji;
    } else {
      message.reactions.push({
        user: userId,
        emoji,
      });
    }

    await message.save();

    res.status(200).json({
      success: true,
      message: "Reaction updated successfully",
      data: message,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Star Message
// ==========================
const starMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    const index = message.starredBy.findIndex(
      (id) => id.toString() === userId
    );

    if (index === -1) {
      message.starredBy.push(userId);
    } else {
      message.starredBy.splice(index, 1);
    }

    await message.save();

    res.status(200).json({
      success: true,
      message: "Star updated successfully",
      data: message,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Pin Message
// ==========================
const pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    message.pinned = !message.pinned;

    if (message.pinned) {
      message.pinnedBy = userId;
      message.pinnedAt = new Date();
    } else {
      message.pinnedBy = null;
      message.pinnedAt = null;
    }

    await message.save();

    res.status(200).json({
      success: true,
      message: "Pin updated successfully",
      data: message,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// ==========================
// Forward Message
// ==========================
const forwardMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { conversationId } = req.body;
    const sender = req.user.userId;

    const oldMessage = await Message.findById(messageId);

    if (!oldMessage) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    const newMessage = await Message.create({
      conversation: conversationId,
      sender,
      text: oldMessage.text,
      image: oldMessage.image,
      audio: oldMessage.audio,
      file: oldMessage.file,
      fileName: oldMessage.fileName,
      messageType: oldMessage.messageType,
      forwarded: true,
      forwardedFrom: oldMessage.sender,
    });

    res.status(201).json({
      success: true,
      message: "Message forwarded successfully",
      data: newMessage,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Mark As Seen
// ==========================
const markAsSeen = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByIdAndUpdate(
      messageId,
      { seen: true },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Message marked as seen",
      data: message,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// Mark As Delivered
// ==========================
const markAsDelivered = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByIdAndUpdate(
      messageId,
      { delivered: true },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Message marked as delivered",
      data: message,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
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
};