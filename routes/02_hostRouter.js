import express from "express";
import { protect, restrictTo, requireApproved, requireEmailVerified } from "../middleware/auth.js";
import {
    getHostDashboard,
    getHostToday,
    getHostCalendar,
    getHostHomesList,
    getHostMessages,
    postHostMessageReply,
    getVerifyPhonePage,
    postSendPhoneOtp,
    postVerifyPhoneOtp,
    postVerifyPhone,
    getAddHome,
    postAddHome,
    getEditHome,
    postEditHome,
    postDeleteHome,
} from "../controller/02_hostController.js";
import { uploadCloud } from "../config/cloudinary.js";
import User from "../models/User.js";

const hostRouter = express.Router();

// Seamless switch to hosting (auto-promotes guest to host, requires email verification)
hostRouter.get("/host/switch", protect, requireEmailVerified, async (req, res) => {
    try {
        if (req.user.role !== "host" || !req.user.isApproved) {
            await User.findByIdAndUpdate(req.user._id, { role: "host", isApproved: true });
            req.user.role = "host";
            req.user.isApproved = true;
            res.locals.user = req.user;
        }
    } catch (err) {
        console.error("Error in /host/switch:", err);
    }
    return res.redirect("/host/today");
});

// Pending approval page — host logged in but not approved yet
hostRouter.get("/host/pending", protect, restrictTo("host"), requireEmailVerified, (req, res) => {
    if (req.user.isApproved) return res.redirect("/host");
    res.render("host/pending");
});

// All routes below: must be logged in + host role + approved + EMAIL VERIFIED
hostRouter.get("/host", protect, restrictTo("host"), requireApproved, requireEmailVerified, getHostDashboard);
hostRouter.get("/host/today", protect, restrictTo("host"), requireApproved, requireEmailVerified, getHostToday);
hostRouter.get("/host/calendar", protect, restrictTo("host"), requireApproved, requireEmailVerified, getHostCalendar);
hostRouter.get("/host/listings", protect, restrictTo("host"), requireApproved, requireEmailVerified, getHostHomesList);
hostRouter.get("/host/view-home", protect, restrictTo("host"), requireApproved, requireEmailVerified, getHostHomesList);
hostRouter.get("/host/messages", protect, restrictTo("host"), requireApproved, requireEmailVerified, getHostMessages);
hostRouter.post("/host/messages/reply", protect, restrictTo("host"), requireApproved, requireEmailVerified, postHostMessageReply);
hostRouter.get("/host/verify-phone", protect, restrictTo("host"), requireApproved, requireEmailVerified, getVerifyPhonePage);
hostRouter.post("/host/send-phone-otp", protect, restrictTo("host"), requireApproved, requireEmailVerified, postSendPhoneOtp);
hostRouter.post("/host/verify-phone-otp", protect, restrictTo("host"), requireApproved, requireEmailVerified, postVerifyPhoneOtp);
hostRouter.post("/host/verify-phone", protect, restrictTo("host"), requireApproved, requireEmailVerified, postVerifyPhone);

// Cloudinary image upload endpoints
hostRouter.post("/host/upload-photos", protect, restrictTo("host"), requireEmailVerified, uploadCloud.array("photos", 10), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: "No photos uploaded." });
    }
    const urls = req.files.map(f => f.path);
    return res.json({ success: true, urls });
});

hostRouter.post("/host/upload-photo", protect, restrictTo("host"), requireEmailVerified, uploadCloud.single("photo"), (req, res) => {
    if (!req.file || !req.file.path) {
        return res.status(400).json({ success: false, message: "No photo uploaded." });
    }
    return res.json({ success: true, url: req.file.path });
});

// Core Listing Creation & Modification Routes (Strict Email OTP Verification required)
hostRouter.get("/host/add-home", protect, restrictTo("host"), requireApproved, requireEmailVerified, getAddHome);
hostRouter.post("/host/add-home", protect, restrictTo("host"), requireApproved, requireEmailVerified, postAddHome);

// Edit routes
hostRouter.get("/host/edit/:id", protect, restrictTo("host"), requireApproved, requireEmailVerified, getEditHome);
hostRouter.get("/host/edit-home/:id", protect, restrictTo("host"), requireApproved, requireEmailVerified, getEditHome);
hostRouter.post("/host/edit/:id", protect, restrictTo("host"), requireApproved, requireEmailVerified, postEditHome);
hostRouter.post("/host/edit-home", protect, restrictTo("host"), requireApproved, requireEmailVerified, postEditHome);

// Delete route
hostRouter.post("/host/delete/:id", protect, restrictTo("host"), requireApproved, requireEmailVerified, postDeleteHome);

export default hostRouter;
