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
        socket.userId = data.id;

        // Update online status in database
        await User.findByIdAndUpdate(data.id, {
          isOnline: true,
        });

        // Store user details in online users array
        const existingUser = users.find((u) => u.id === data.id);
        if (!existingUser) {
          users.push({
            id: data.id,
            username: data.username,
            socketId: socket.id,
          });
        }

        // Broadcast online users list to all clients
        io.emit("online-users", users);
        io.emit("user-online", data.id);

      } catch (error) {
        console.log("Join event error:", error.message);
      }
    });

    // Event: Send real-time private message
    socket.on("private-message", (data) => {
      const receiver = users.find((u) => u.id === data.receiverId);
      if (receiver) {
        io.to(receiver.socketId).emit("private-message", data);
      }
    });

    // Event: User starts typing
    socket.on("typing", (data) => {
      const receiver = users.find((u) => u.id === data.receiverId);
      if (receiver) {
        io.to(receiver.socketId).emit("typing", data);
      }
    });

    // Event: User stops typing
    socket.on("stop-typing", (data) => {
      const receiver = users.find((u) => u.id === data.receiverId);
      if (receiver) {
        io.to(receiver.socketId).emit("stop-typing", data);
      }
    });

    // Event: Initiate Voice/Video Call
    socket.on("call-user", (data) => {
      const receiver = users.find((u) => u.id === data.receiverId);
      if (receiver) {
        io.to(receiver.socketId).emit("incoming-call", data);
      }
    });

    // Event: Accept incoming call
    socket.on("accept-call", (data) => {
      const receiver = users.find((u) => u.id === data.receiverId);
      if (receiver) {
        io.to(receiver.socketId).emit("call-accepted", data);
      }
    });

    // Event: Reject incoming call
    socket.on("reject-call", (data) => {
      const receiver = users.find((u) => u.id === data.receiverId);
      if (receiver) {
        io.to(receiver.socketId).emit("call-rejected", data);
      }
    });

    // Event: End ongoing call
    socket.on("end-call", (data) => {
      const receiver = users.find((u) => u.id === data.receiverId);
      if (receiver) {
        io.to(receiver.socketId).emit("call-ended", data);
      }
    });

    // WebRTC Signaling: Send Offer
    socket.on("offer", (data) => {
      const receiver = users.find((u) => u.id === data.receiverId);
      if (receiver) {
        io.to(receiver.socketId).emit("offer", {
          offer: data.offer,
          senderId: data.senderId,
        });
      }
    });

    // WebRTC Signaling: Send Answer
    socket.on("answer", (data) => {
      const receiver = users.find((u) => u.id === data.receiverId);
      if (receiver) {
        io.to(receiver.socketId).emit("answer", {
          answer: data.answer,
          senderId: data.senderId,
        });
      }
    });

    // WebRTC Signaling: ICE Candidate exchange
    socket.on("ice-candidate", (data) => {
      const receiver = users.find((u) => u.id === data.receiverId);
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
          // Update status in database to offline
          await User.findByIdAndUpdate(socket.userId, {
            isOnline: false,
            lastSeen: new Date(),
          });

          // Remove user from active online users list
          users = users.filter((u) => u.id !== socket.userId);

          // Broadcast updated online list
          io.emit("online-users", users);
          io.emit("user-offline", socket.userId);
        }

      } catch (error) {
        console.log("Disconnect event error:", error.message);
      }
    });
  });
};

module.exports = initializeSocket;