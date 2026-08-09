const { Server } = require("socket.io");
const User = require("../models/User");

// Array to track currently connected online users in memory
let users = [];

/**
 * Initialize Socket.io server and setup real-time event listeners
 * @param {object} server - HTTP Server instance
 */
const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("User Connected:", socket.id);

    // Event: User logs in or joins chat
    socket.on("join", async (data) => {
      try {
        if (!data || !data.id) return;
        const uidStr = String(data.id);
        socket.userId = uidStr;

        // Update online status in database
        await User.findByIdAndUpdate(uidStr, {
          isOnline: true,
        });

        // Store or update user details in online users array
        const existingIndex = users.findIndex((u) => String(u.id || u._id) === uidStr);
        if (existingIndex !== -1) {
          users[existingIndex].socketId = socket.id;
          users[existingIndex].username = data.username || users[existingIndex].username;
        } else {
          users.push({
            id: uidStr,
            username: data.username,
            socketId: socket.id,
          });
        }

        // Broadcast online users list to all clients
        io.emit("online-users", users);
        io.emit("user-online", uidStr);

      } catch (error) {
        console.log("Join event error:", error.message);
      }
    });

    // Event: Send real-time private message
    socket.on("private-message", (data) => {
      if (!data || !data.receiverId) return;
      const targetId = String(data.receiverId);
      const targetSockets = users.filter((u) => String(u.id || u._id) === targetId);

      targetSockets.forEach((rec) => {
        io.to(rec.socketId).emit("private-message", data);
      });
    });

    // Event: User starts typing
    socket.on("typing", (data) => {
      if (!data || !data.receiverId) return;
      const targetId = String(data.receiverId);
      const targetSockets = users.filter((u) => String(u.id || u._id) === targetId);

      targetSockets.forEach((rec) => {
        io.to(rec.socketId).emit("typing", data);
      });
    });

    // Event: User stops typing
    socket.on("stop-typing", (data) => {
      if (!data || !data.receiverId) return;
      const targetId = String(data.receiverId);
      const targetSockets = users.filter((u) => String(u.id || u._id) === targetId);

      targetSockets.forEach((rec) => {
        io.to(rec.socketId).emit("stop-typing", data);
      });
    });

    // Event: Initiate Voice/Video Call
    socket.on("call-user", (data) => {
      const targetId = String(data.receiverId);
      const receiver = users.find((u) => String(u.id || u._id) === targetId);
      if (receiver) {
        io.to(receiver.socketId).emit("incoming-call", data);
      }
    });

    // Event: Accept incoming call
    socket.on("accept-call", (data) => {
      const targetId = String(data.receiverId);
      const receiver = users.find((u) => String(u.id || u._id) === targetId);
      if (receiver) {
        io.to(receiver.socketId).emit("call-accepted", data);
      }
    });

    // Event: Reject incoming call
    socket.on("reject-call", (data) => {
      const targetId = String(data.receiverId);
      const receiver = users.find((u) => String(u.id || u._id) === targetId);
      if (receiver) {
        io.to(receiver.socketId).emit("call-rejected", data);
      }
    });

    // Event: End ongoing call
    socket.on("end-call", (data) => {
      const targetId = String(data.receiverId);
      const receiver = users.find((u) => String(u.id || u._id) === targetId);
      if (receiver) {
        io.to(receiver.socketId).emit("call-ended", data);
      }
    });

    // WebRTC Signaling: Send Offer
    socket.on("offer", (data) => {
      const targetId = String(data.receiverId);
      const receiver = users.find((u) => String(u.id || u._id) === targetId);
      if (receiver) {
        io.to(receiver.socketId).emit("offer", {
          offer: data.offer,
          senderId: data.senderId,
        });
      }
    });

    // WebRTC Signaling: Send Answer
    socket.on("answer", (data) => {
      const targetId = String(data.receiverId);
      const receiver = users.find((u) => String(u.id || u._id) === targetId);
      if (receiver) {
        io.to(receiver.socketId).emit("answer", {
          answer: data.answer,
          senderId: data.senderId,
        });
      }
    });

    // WebRTC Signaling: ICE Candidate
    socket.on("ice-candidate", (data) => {
      const targetId = String(data.receiverId);
      const receiver = users.find((u) => String(u.id || u._id) === targetId);
      if (receiver) {
        io.to(receiver.socketId).emit("ice-candidate", {
          candidate: data.candidate,
          senderId: data.senderId,
        });
      }
    });

    // Event: User updates profile details (Avatar/Username/About)
    socket.on("update-profile", (updatedUser) => {
      io.emit("user-updated", updatedUser);
    });

    // Event: Socket Disconnection
    socket.on("disconnect", async () => {
      try {
        if (socket.userId) {
          const uidStr = String(socket.userId);
          await User.findByIdAndUpdate(uidStr, {
            isOnline: false,
            lastSeen: new Date(),
          });

          users = users.filter((u) => !(String(u.id || u._id) === uidStr && u.socketId === socket.id));

          io.emit("online-users", users);
          io.emit("user-offline", uidStr);
        }
      } catch (error) {
        console.log("Disconnect event error:", error.message);
      }
    });
  });
};

module.exports = initializeSocket;