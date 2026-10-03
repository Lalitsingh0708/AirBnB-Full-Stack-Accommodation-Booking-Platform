import User from "../models/User.js";
import { generateToken } from "../middleware/auth.js";

// GET /auth/register
export const getRegister = (req, res) => {
    if (req.cookies?.staynest_token) return res.redirect("/");
    res.render("auth/auth", {
        title: "Create Account | StayNest",
        mode: "register",
        error: null,
        formData: {},
    });
};

// GET /auth/login
export const getLogin = (req, res) => {
    if (req.cookies?.staynest_token) return res.redirect("/");
    res.render("auth/auth", {
        title: "Sign In | StayNest",
        mode: "login",
        error: null,
        formData: {},
    });
};

// POST /auth/register
export const postRegister = async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.render("auth/auth", {
            title: "Create Account | StayNest",
            mode: "register",
            error: "All fields are required.",
            formData: { name, email, role },
        });
    }

    if (password.length < 6) {
        return res.render("auth/auth", {
            title: "Create Account | StayNest",
            mode: "register",
            error: "Password must be at least 6 characters.",
            formData: { name, email, role },
        });
    }

    try {
        const existing = await User.findOne({ email });
        if (existing) {
            return res.render("auth/auth", {
                title: "Create Account | StayNest",
                mode: "register",
                error: "An account with this email already exists.",
                formData: { name, email, role },
            });
        }

        const allowedRole = role === "host" ? "host" : "guest";

        const user = await User.create({
            name,
            email,
            password,
            role: allowedRole,
            isApproved: true,
        });

        generateToken(user._id, res);

        if (allowedRole === "host") return res.redirect("/host");
        return res.redirect("/");
    } catch (err) {
        console.error("Registration error:", err);
        return res.render("auth/auth", {
            title: "Create Account | StayNest",
            mode: "register",
            error: "Something went wrong. Please try again.",
            formData: { name, email, role },
        });
    }
};

// POST /auth/login
export const postLogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.render("auth/auth", {
            title: "Sign In | StayNest",
            mode: "login",
            error: "Email and password are required.",
            formData: { email },
        });
    }

    try {
        const user = await User.findOne({ email }).select("+password");

        if (!user || !(await user.comparePassword(password))) {
            return res.render("auth/auth", {
                title: "Sign In | StayNest",
                mode: "login",
                error: "Incorrect email or password.",
                formData: { email },
            });
        }

        generateToken(user._id, res);

        if (user.role === "admin")  return res.redirect("/admin");
        if (user.role === "host")   return user.isApproved ? res.redirect("/host") : res.redirect("/host/pending");
        return res.redirect("/");
    } catch (err) {
        console.error("Login error:", err);
        return res.render("auth/auth", {
            title: "Sign In | StayNest",
            mode: "login",
            error: "Something went wrong. Please try again.",
            formData: { email },
        });
    }
};

// POST /auth/logout
export const postLogout = (req, res) => {
    res.clearCookie("staynest_token");
    res.redirect("/");
};
