import express from "express";
import { protect, restrictTo, requireApproved } from "../middleware/auth.js";
import {
    getHostDashboard,
    getHostHomesList,
    getAddHome,
    postAddHome,
    getEditHome,
    postEditHome,
    postDeleteHome,
} from "../controller/02_hostController.js";

const hostRouter = express.Router();

// Pending approval page — host logged in but not approved yet
hostRouter.get("/host/pending", protect, restrictTo("host"), (req, res) => {
    if (req.user.isApproved) return res.redirect("/host");
    res.render("host/pending");
});

// All routes below: must be logged in + host role + approved
hostRouter.get("/host", protect, restrictTo("host"), requireApproved, getHostDashboard);
hostRouter.get("/host/view-home", protect, restrictTo("host"), requireApproved, getHostHomesList);
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
