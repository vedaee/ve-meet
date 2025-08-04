const fs = require("fs");
const https = require("https");
const express = require("express");
const { Server } = require("socket.io");
const path = require("path");

const app = express();

// Serve React build files (adjust path if needed)
app.use(express.static(path.join(__dirname, "client", "build")));

const server = https.createServer(
  {
    key: fs.readFileSync("C:/projects/Ve Meet Final/ssl/192.168.29.23-key.crt"),
    cert: fs.readFileSync("C:/projects/Ve Meet Final/ssl/192.168.29.23.crt"),
  },
  app
);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// users = { socketId: { userName, roomId } }
const users = {};

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("join-room", ({ roomId, userName }) => {
    socket.join(roomId);
    users[socket.id] = { userName, roomId };

    // Send to new user the list of existing users in the room (without signals)
    const usersInRoom = Object.entries(users)
      .filter(([id, user]) => user.roomId === roomId && id !== socket.id)
      .map(([id, user]) => ({
        id,
        name: user.userName,
      }));

    socket.emit("all-users", usersInRoom);

    // Notify others in room about new user
    socket.to(roomId).emit("user-joined", {
      id: socket.id,
      name: userName,
      signal: null,
    });

    // Send updated participants list to everyone in room
    const participantsInRoom = Object.entries(users)
      .filter(([id, user]) => user.roomId === roomId)
      .map(([id, user]) => user.userName);

    io.to(roomId).emit("update-participants", participantsInRoom);
  });

  // New user sending signal to existing user
  socket.on("sending-signal", ({ userToSignal, callerID, signal, userName }) => {
    io.to(userToSignal).emit("user-joined", {
      signal,
      id: callerID,
      name: userName || users[callerID]?.userName || "Guest",
    });
  });

  // Existing user returning signal back to new user
  socket.on("returning-signal", ({ signal, callerID }) => {
    io.to(callerID).emit("receiving-returned-signal", {
      signal,
      id: socket.id,
      name: users[socket.id]?.userName || "Guest",
    });
  });

  socket.on("user-disconnected", (id) => {
    if (users[id]) {
      const { roomId } = users[id];
      delete users[id];

      socket.to(roomId).emit("user-disconnected", id);

      const participantsInRoom = Object.entries(users)
        .filter(([uid, u]) => u.roomId === roomId)
        .map(([uid, u]) => u.userName);

      io.to(roomId).emit("update-participants", participantsInRoom);
    }
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      const { roomId } = user;
      delete users[socket.id];

      socket.to(roomId).emit("user-disconnected", socket.id);

      const participantsInRoom = Object.entries(users)
        .filter(([id, u]) => u.roomId === roomId)
        .map(([id, u]) => u.userName);

      io.to(roomId).emit("update-participants", participantsInRoom);
    }
    console.log("Client disconnected:", socket.id);
  });

  socket.on("end-call", ({ roomId }) => {
    io.to(roomId).emit("call-ended");
    // Remove all users from that room
    for (const id in users) {
      if (users[id].roomId === roomId) delete users[id];
    }
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`✅ Secure server running on https://192.168.29.23:${PORT}`);
});
