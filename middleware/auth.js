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
        const returnUrl = encodeURIComponent(req.originalUrl || "/");
        return res.redirect(`/auth/login?returnUrl=${returnUrl}`);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            res.clearCookie("staynest_token");
            const returnUrl = encodeURIComponent(req.originalUrl || "/");
            return res.redirect(`/auth/login?returnUrl=${returnUrl}`);
        }

        req.user = user;
        res.locals.user = user; // available in all EJS templates
        next();
    } catch (err) {
        res.clearCookie("staynest_token");
        const returnUrl = encodeURIComponent(req.originalUrl || "/");
        return res.redirect(`/auth/login?returnUrl=${returnUrl}`);
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

// Middleware: restrict to specific roles (with auto-upgrade for host role)
export const restrictTo = (...roles) => {
    return async (req, res, next) => {
        if (!req.user) {
            const returnUrl = encodeURIComponent(req.originalUrl || "/host/today");
            return res.redirect(`/auth/login?returnUrl=${returnUrl}`);
        }

        // If a logged-in user wants to access host features, auto-upgrade them to host
        if (roles.includes("host") && req.user.role === "guest") {
            try {
                await User.findByIdAndUpdate(req.user._id, { role: "host", isApproved: true });
                req.user.role = "host";
                req.user.isApproved = true;
                res.locals.user = req.user;
            } catch (err) {
                console.error("Auto promote to host error:", err);
            }
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).render("01_404.ejs", {
                message: "You do not have permission to access this page.",
            });
        }
        next();
    };
};

// Middleware: host must be approved by admin (auto-approves in dev & production)
export const requireApproved = async (req, res, next) => {
    if (req.user && req.user.role === "host" && !req.user.isApproved) {
        try {
            await User.findByIdAndUpdate(req.user._id, { isApproved: true });
            req.user.isApproved = true;
            res.locals.user = req.user;
        } catch (err) {
            console.error("Auto approve host error:", err);
        }
    }
    next();
};
