const express = require("express");
const router = express.Router();

const {
  registerUser,loginUser,verifyOtp,getprofile,updateProfile,allUsers,searchUsers,
} = require("../controllers/userController");

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

router.post("/register", registerUser);

router.post("/login", loginUser);

router.post("/verify-otp", verifyOtp);

router.get("/profile", authMiddleware, getprofile);

router.put(
  "/profile",
  authMiddleware,
  upload.single("profilePicture"),
  updateProfile
);

router.get("/users", authMiddleware, allUsers);

router.get("/search", authMiddleware, searchUsers);

module.exports = router;