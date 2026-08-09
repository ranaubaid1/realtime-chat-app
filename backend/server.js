const cors = require("cors");
require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");

const connectDB = require("./config/db");
const initializeSocket = require("./socket/socket");

const userRoutes = require("./routes/userRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const messagesRoutes = require("./routes/messagesRoutes");

const app = express();
app.use(cors());

const server = http.createServer(app);

// Database connection
connectDB();

// Body Parser Middleware
app.use(express.json());

// Serve static uploads for local image/file fallbacks
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messagesRoutes);

// Socket Initialization
initializeSocket(server);

// Start Server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});