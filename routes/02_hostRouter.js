import express from "express";
import { protect, restrictTo, requireApproved } from "../middleware/auth.js";
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

const hostRouter = express.Router();

// Pending approval page — host logged in but not approved yet
hostRouter.get("/host/pending", protect, restrictTo("host"), (req, res) => {
    if (req.user.isApproved) return res.redirect("/host");
    res.render("host/pending");
});

// All routes below: must be logged in + host role + approved
hostRouter.get("/host", protect, restrictTo("host"), requireApproved, getHostDashboard);
hostRouter.get("/host/today", protect, restrictTo("host"), requireApproved, getHostToday);
hostRouter.get("/host/calendar", protect, restrictTo("host"), requireApproved, getHostCalendar);
hostRouter.get("/host/listings", protect, restrictTo("host"), requireApproved, getHostHomesList);
hostRouter.get("/host/view-home", protect, restrictTo("host"), requireApproved, getHostHomesList);
hostRouter.get("/host/messages", protect, restrictTo("host"), requireApproved, getHostMessages);
hostRouter.post("/host/messages/reply", protect, restrictTo("host"), requireApproved, postHostMessageReply);
hostRouter.get("/host/verify-phone", protect, restrictTo("host"), requireApproved, getVerifyPhonePage);
hostRouter.post("/host/send-phone-otp", protect, restrictTo("host"), requireApproved, postSendPhoneOtp);
hostRouter.post("/host/verify-phone-otp", protect, restrictTo("host"), requireApproved, postVerifyPhoneOtp);
hostRouter.post("/host/verify-phone", protect, restrictTo("host"), requireApproved, postVerifyPhone);

// Cloudinary image upload endpoints
hostRouter.post("/host/upload-photos", protect, restrictTo("host"), uploadCloud.array("photos", 10), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: "No photos uploaded." });
    }
    const urls = req.files.map(f => f.path);
    return res.json({ success: true, urls });
});

hostRouter.post("/host/upload-photo", protect, restrictTo("host"), uploadCloud.single("photo"), (req, res) => {
    if (!req.file || !req.file.path) {
        return res.status(400).json({ success: false, message: "No photo uploaded." });
    }
    return res.json({ success: true, url: req.file.path });
});

hostRouter.get("/host/add-home", protect, restrictTo("host"), requireApproved, getAddHome);
hostRouter.post("/host/add-home", protect, restrictTo("host"), requireApproved, postAddHome);

// Edit routes
hostRouter.get("/host/edit/:id", protect, restrictTo("host"), requireApproved, getEditHome);
hostRouter.get("/host/edit-home/:id", protect, restrictTo("host"), requireApproved, getEditHome);
hostRouter.post("/host/edit/:id", protect, restrictTo("host"), requireApproved, postEditHome);
hostRouter.post("/host/edit-home", protect, restrictTo("host"), requireApproved, postEditHome);

// Delete route
hostRouter.post("/host/delete/:id", protect, restrictTo("host"), requireApproved, postDeleteHome);

export default hostRouter;
