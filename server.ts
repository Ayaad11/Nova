import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";

const db = new Database("community.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    type TEXT,
    content TEXT,
    author TEXT,
    timestamp INTEGER,
    language TEXT,
    aiSummary TEXT,
    aiTranslated TEXT
  );
  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    level TEXT,
    message TEXT,
    location TEXT,
    timestamp INTEGER
  );
  CREATE TABLE IF NOT EXISTS market (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    price TEXT,
    seller TEXT,
    timestamp INTEGER,
    status TEXT DEFAULT 'available'
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    senderId TEXT,
    receiverId TEXT,
    senderName TEXT,
    content TEXT,
    timestamp INTEGER,
    isRead INTEGER DEFAULT 0
  );
`);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Peer Discovery State
  const peers = new Map();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Send existing data to the new user
    const posts = db.prepare("SELECT * FROM posts ORDER BY timestamp DESC LIMIT 50").all();
    const alerts = db.prepare("SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 20").all();
    const market = db.prepare("SELECT * FROM market ORDER BY timestamp DESC LIMIT 50").all();
    
    socket.emit("feed:initial", posts);
    socket.emit("alerts:initial", alerts);
    socket.emit("market:initial", market);

    socket.on("peer:join", (data) => {
      const peerInfo = {
        id: socket.id,
        name: data.name || `جهاز مجهول ${socket.id.slice(0, 4)}`,
        distance: `${Math.floor(Math.random() * 50) + 1}m`,
        signal: Math.random() > 0.7 ? 'strong' : Math.random() > 0.4 ? 'medium' : 'weak',
        lastSeen: Date.now()
      };
      peers.set(socket.id, peerInfo);
      socket.broadcast.emit("peer:discovered", peerInfo);
      socket.emit("peer:list", Array.from(peers.values()).filter(p => p.id !== socket.id));
    });

    // Posts
    socket.on("post:create", (post) => {
      try {
        const stmt = db.prepare("INSERT INTO posts (id, type, content, author, timestamp, language) VALUES (?, ?, ?, ?, ?, ?)");
        stmt.run(post.id, post.type, post.content, post.author, post.timestamp, post.language);
        io.emit("post:new", post);
      } catch (err) {
        console.error("Error saving post:", err);
      }
    });

    socket.on("post:update_ai", ({ id, aiSummary, aiTranslated }) => {
      try {
        if (aiSummary) {
          db.prepare("UPDATE posts SET aiSummary = ? WHERE id = ?").run(aiSummary, id);
        }
        if (aiTranslated) {
          db.prepare("UPDATE posts SET aiTranslated = ? WHERE id = ?").run(aiTranslated, id);
        }
        io.emit("post:updated", { id, aiSummary, aiTranslated });
      } catch (err) {
        console.error("Error updating AI data:", err);
      }
    });

    socket.on("post:ai_loading", ({ id, type }) => {
      io.emit("post:ai_loading", { id, type });
    });

    // Alerts
    socket.on("alert:create", (alert) => {
      try {
        const stmt = db.prepare("INSERT INTO alerts (id, level, message, location, timestamp) VALUES (?, ?, ?, ?, ?)");
        stmt.run(alert.id, alert.level, alert.message, alert.location, alert.timestamp);
        io.emit("alert:new", alert);
      } catch (err) {
        console.error("Error saving alert:", err);
      }
    });

    // Market
    socket.on("market:create", (item) => {
      try {
        const stmt = db.prepare("INSERT INTO market (id, title, description, price, seller, timestamp, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
        stmt.run(item.id, item.title, item.description, item.price, item.seller, item.timestamp, item.status || 'available');
        io.emit("market:new", item);
      } catch (err) {
        console.error("Error saving market item:", err);
      }
    });

    socket.on("market:update_status", ({ id, status }) => {
      try {
        db.prepare("UPDATE market SET status = ? WHERE id = ?").run(status, id);
        io.emit("market:status_updated", { id, status });
      } catch (err) {
        console.error("Error updating market status:", err);
      }
    });

    // Messages
    socket.on("message:send", (msg) => {
      try {
        const stmt = db.prepare("INSERT INTO messages (id, senderId, receiverId, senderName, content, timestamp) VALUES (?, ?, ?, ?, ?, ?)");
        stmt.run(msg.id, socket.id, msg.receiverId, msg.senderName, msg.content, msg.timestamp);
        
        // Send to receiver if connected
        io.to(msg.receiverId).emit("message:new", { ...msg, senderId: socket.id });
        // Send back to sender for confirmation
        socket.emit("message:sent", { ...msg, senderId: socket.id });
      } catch (err) {
        console.error("Error sending message:", err);
      }
    });

    socket.on("message:typing", ({ receiverId, isTyping }) => {
      io.to(receiverId).emit("message:typing", { senderId: socket.id, isTyping });
    });

    socket.on("message:history", ({ otherId }) => {
      try {
        const msgs = db.prepare(`
          SELECT * FROM messages 
          WHERE (senderId = ? AND receiverId = ?) 
             OR (senderId = ? AND receiverId = ?)
          ORDER BY timestamp ASC
        `).all(socket.id, otherId, otherId, socket.id);
        socket.emit("message:history_result", { otherId, messages: msgs });
      } catch (err) {
        console.error("Error fetching message history:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      peers.delete(socket.id);
      io.emit("peer:lost", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
