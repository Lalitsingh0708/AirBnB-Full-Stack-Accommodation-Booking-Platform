import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";

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

// View engine
app.set("view engine", "ejs");
app.set("views", "views");

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`StayNest running on http://localhost:${PORT}`);
});