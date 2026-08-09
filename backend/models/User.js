const mangoose = require("mongoose");

const userSchema = new mangoose.Schema({ 
  username: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
  }, 
  profilePicture: {
    type: String,
    default: "",
  },
  about: {
    type: String,
    default: "",  
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  otp: {
    type: String,
    default: "",
  },
  otpExpiry: {
    type: Date,
    default: null,    
  },
});
module.exports = mangoose.model("User", userSchema);
