import express from "express";
import {
    getRegister,
    getLogin,
    postRegister,
    postLogin,
    postLogout,
    getVerifyEmail,
    postVerifyEmail,
    postResendOtp,
    getGoogleAuth,
    getGoogleCallback,
} from "../controller/authController.js";

const authRouter = express.Router();

authRouter.get("/auth/register", getRegister);
authRouter.get("/auth/login", getLogin);
authRouter.post("/auth/register", postRegister);
authRouter.post("/auth/login", postLogin);
authRouter.get("/auth/logout", postLogout);
authRouter.post("/auth/logout", postLogout);

// Email OTP Verification Routes
authRouter.get("/auth/verify-email", getVerifyEmail);
authRouter.post("/auth/verify-email", postVerifyEmail);
authRouter.post("/auth/resend-otp", postResendOtp);

// Google OAuth Routes
authRouter.get("/auth/google", getGoogleAuth);
authRouter.get("/auth/google/callback", getGoogleCallback);

export default authRouter;
