import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import http from "http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import paths from "./utils/pathUtil.js";

import authRouter from "./routes/authRouter.js";
import userRouter from "./routes/01_router.js";
import hostRouter from "./routes/02_hostRouter.js";
import { pageNotFound } from "./controller/03_Errors.js";
import { optionalAuth } from "./middleware/auth.js";

// Connect to MongoDB
connectDB();

const app = express();

// Trust reverse proxy (essential for Render / Cloud hosting HTTPS)
app.set("trust proxy", 1);

// View engine
app.set("view engine", "ejs");
app.set("views", "views");

// Body parsers (50mb limit to accommodate multi-photo uploads)
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));

// Cookie parser (needed for JWT from cookie)
app.use(cookieParser());

// Static files
app.use(express.static(path.join(paths, "public")));
// Serve uploaded property photos
app.use("/uploads", express.static(path.join(paths, "uploads")));

// Attach user to res.locals on every request (public pages still show login state)
app.use(optionalAuth);

// Routes
app.use(authRouter);
app.use(userRouter);
app.use(hostRouter);

// 404 handler
app.use(pageNotFound);

// Attach Socket.io for Real-time Host-Guest Chat
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

io.on("connection", (socket) => {
    socket.on("join_user", (userId) => {
        if (userId) {
            socket.join(`user_${userId}`);
        }
    });

    socket.on("join_conversation", (conversationId) => {
        if (conversationId) {
            socket.join(`conversation_${conversationId}`);
        }
    });

    socket.on("typing", (data) => {
        if (data && data.conversationId) {
            socket.to(`conversation_${data.conversationId}`).emit("user_typing", data);
        }
    });
});

export { io };

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`StayNest running on http://localhost:${PORT}`);
});