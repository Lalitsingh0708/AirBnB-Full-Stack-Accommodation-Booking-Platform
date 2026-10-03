import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Generate JWT and set in HTTP-only cookie
export const generateToken = (userId, res) => {
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.cookie("staynest_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    });

    return token;
};

// Middleware: protect routes — user must be logged in
export const protect = async (req, res, next) => {
    const token = req.cookies?.staynest_token;

    if (!token) {
        return res.redirect("/auth/login");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            res.clearCookie("staynest_token");
            return res.redirect("/auth/login");
        }

        req.user = user;
        res.locals.user = user; // available in all EJS templates
        next();
    } catch (err) {
        res.clearCookie("staynest_token");
        return res.redirect("/auth/login");
    }
};

// Middleware: optionally attach user if logged in (for public pages)
export const optionalAuth = async (req, res, next) => {
    const token = req.cookies?.staynest_token;
    res.locals.user = null;

    if (!token) return next();

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");
        if (user) {
            req.user = user;
            res.locals.user = user;
        }
    } catch (err) {
        // Token invalid — just continue as guest
        res.clearCookie("staynest_token");
    }

    next();
};

// Middleware: restrict to specific roles
export const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).render("01_404.ejs", {
                message: "You do not have permission to access this page.",
            });
        }
        next();
    };
};

// Middleware: host must be approved by admin
export const requireApproved = (req, res, next) => {
    if (req.user.role === "host" && !req.user.isApproved) {
        return res.redirect("/host/pending");
    }
    next();
};
