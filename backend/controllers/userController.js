const jwt = require("jsonwebtoken");
const User = require("../models/User");
console.log(User);

const registerUser = async (req, res) => {
  try {
    console.log( req.body);
    const { username, phoneNumber } = req.body;
    const existingUser = await User.findOne({ phoneNumber });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const newUser = await User.create({
      username,
      phoneNumber,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      newUser,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


 const loginUser = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const user = await User.findOne ({ phoneNumber });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",}
      ); 
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log("Generated OTP:", otp);
  user.otp = otp;
  user.otpExpiry = new Date(Date.now() + 2 * 60 * 1000);
  await user.save();
  res.status(200).json({
    success: true,
    message: "User logged in successfully",
    user,
  });
} catch (error) {
  res.status(500).json({
    success: false,
    message: error.message,
  });
}
 };
const verifyOtp = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if(user.otpExpiry < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }
    user.otp = "";
    user.otpExpiry = null;
    await user.save();
    console.log("JWT:", process.env.JWT_SECRET);
    const token = jwt.sign(
  { userId: user._id },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);
const decoded = jwt.verify(token, process.env.JWT_SECRET);
console.log("generated Token:", token);
console.log("Decoded JWT:", decoded);
    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      token,
      user,
    });   
  } 


  catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const getprofile = async (req, res) => {
  try{
    const user = await User.findById(req.user.userId);
    res.status(200).json({
      success: true,
      user,
    }); 
  }catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const updateProfile = async (req, res) => {
  try {
    const { username, about } = req.body;

    const updateData = {
      username,
      about,
    };

    if (req.file) {
      updateData.profilePicture = req.file.path;
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const allUsers = async (req, res) => {
  try {
    const users = await User.find().select("-otp -otpExpiry");
    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  } 
};
const searchUsers = async (req, res) => {
  try {
    const { search } = req.query;

    const users = await User.find({
      username: {
        $regex: search,
        $options: "i",
      },
    }).select("-otp -otpExpiry");

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const addContact = async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    const userId = req.user.userId;

    if (!name || !phoneNumber) {
      return res.status(400).json({ success: false, message: "Name and Phone Number are required" });
    }

    const cleanPhone = phoneNumber.trim();

    const registeredUser = await User.findOne({
      $or: [
        { phoneNumber: cleanPhone },
        { username: { $regex: `^${name.trim()}$`, $options: "i" } }
      ]
    });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.contacts = user.contacts.filter((c) => c.phoneNumber !== cleanPhone);

    const contactObj = {
      name: name.trim(),
      phoneNumber: cleanPhone,
      contactUser: registeredUser ? registeredUser._id : null,
      isUnregistered: !registeredUser,
    };

    user.contacts.push(contactObj);
    await user.save();

    res.status(200).json({
      success: true,
      message: registeredUser ? "Contact added successfully!" : "Contact added, but user has no account yet.",
      contact: {
        _id: registeredUser ? registeredUser._id : `unreg_${Date.now()}`,
        username: name.trim(),
        phoneNumber: cleanPhone,
        profilePicture: registeredUser?.profilePicture || "",
        about: registeredUser?.about || "",
        isUnregistered: !registeredUser,
      },
      isRegistered: !!registeredUser,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getContacts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).populate("contacts.contactUser", "username phoneNumber profilePicture about isOnline lastSeen");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const formattedContacts = user.contacts.map((c) => {
      if (c.contactUser) {
        return {
          _id: c.contactUser._id,
          username: c.name || c.contactUser.username,
          phoneNumber: c.contactUser.phoneNumber,
          profilePicture: c.contactUser.profilePicture,
          about: c.contactUser.about,
          isOnline: c.contactUser.isOnline,
          isUnregistered: false,
        };
      }
      return {
        _id: `unreg_${c._id}`,
        username: c.name,
        phoneNumber: c.phoneNumber,
        profilePicture: "",
        about: "",
        isOnline: false,
        isUnregistered: true,
      };
    });

    res.status(200).json({ success: true, contacts: formattedContacts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyOtp,
  getprofile,
  updateProfile,
  allUsers,
  searchUsers,
  addContact,
  getContacts,
}; 