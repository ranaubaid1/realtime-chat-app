const mongoose = require("mongoose");
const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }]
}, { timestamps: true });

// ERROR FIX: Pehle yeh line missing thi.
// Sirf schema bana tha, model create aur export nahi kiya tha.
// Isi wajah se "Conversation.findOne is not a function" error aata tha.
module.exports = mongoose.model("Conversation", conversationSchema);