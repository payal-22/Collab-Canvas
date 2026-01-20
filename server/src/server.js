// server/src/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS for both Express and Socket.IO
app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // React dev server
    methods: ["GET", "POST"]
  }
});

// Store active users
const users = new Map();

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send existing users to new user
  socket.emit('existing-users', Array.from(users.values()));

  // User joins
  socket.on('user-join', (userData) => {
    const user = {
      id: socket.id,
      name: userData.name || `User ${socket.id.slice(0, 4)}`,
      color: userData.color || getRandomColor()
    };
    
    users.set(socket.id, user);
    
    // Broadcast to all other users
    socket.broadcast.emit('user-joined', user);
    
    // Send confirmation to this user
    socket.emit('user-confirmed', user);
    
    console.log('User joined:', user);
  });

  // Handle drawing events
  socket.on('draw', (drawData) => {
    // Broadcast to all other users (not the sender)
    socket.broadcast.emit('draw', {
      ...drawData,
      userId: socket.id
    });
  });

  // Handle undo events
  socket.on('undo', () => {
    socket.broadcast.emit('undo', { userId: socket.id });
  });

  // Handle redo events
  socket.on('redo', () => {
    socket.broadcast.emit('redo', { userId: socket.id });
  });

  // Handle clear canvas
  socket.on('clear', () => {
    socket.broadcast.emit('clear', { userId: socket.id });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      socket.broadcast.emit('user-left', { id: socket.id });
      console.log('User disconnected:', user.name);
    }
  });
});

// Helper function to generate random colors for users
function getRandomColor() {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', users: users.size });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
});