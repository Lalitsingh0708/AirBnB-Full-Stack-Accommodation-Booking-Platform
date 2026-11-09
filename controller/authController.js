import User from "../models/User.js";
import { generateToken } from "../middleware/auth.js";
import { sendOtpEmail } from "../utils/emailService.js";

// GET /auth/register
export const getRegister = (req, res) => {
    const returnUrl = req.query.returnUrl || "";
    if (req.cookies?.staynest_token) return res.redirect(returnUrl || "/");
    res.render("auth/auth", {
        title: "Create Account | StayNest",
        mode: "register",
        error: null,
        formData: {},
        returnUrl: returnUrl,
    });
};

// GET /auth/login
export const getLogin = (req, res) => {
    const returnUrl = req.query.returnUrl || "";
    if (req.cookies?.staynest_token) return res.redirect(returnUrl || "/");
    res.render("auth/auth", {
        title: "Sign In | StayNest",
        mode: "login",
        error: null,
        formData: {},
        returnUrl: returnUrl,
    });
};

// POST /auth/register
export const postRegister = async (req, res) => {
    const { name, email, password, role, returnUrl } = req.body;

    if (!name || !email || !password) {
        return res.render("auth/auth", {
            title: "Create Account | StayNest",
            mode: "register",
            error: "All fields are required.",
            formData: { name, email, role },
            returnUrl: returnUrl || "",
        });
    }

    if (password.length < 6) {
        return res.render("auth/auth", {
            title: "Create Account | StayNest",
            mode: "register",
            error: "Password must be at least 6 characters.",
            formData: { name, email, role },
            returnUrl: returnUrl || "",
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
                returnUrl: returnUrl || "",
            });
        }

        const allowedRole = role === "host" ? "host" : "guest";

        // Generate 6-digit OTP code & 10-minute expiry
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        let user;
        if (allowedRole === "host") {
            user = await User.create({
                name,
                email: email.toLowerCase(),
                password,
                role: "host",
                userType: "host",
                isApproved: true,
                isEmailVerified: false,
                emailOtp: {
                    code: otpCode,
                    expiresAt: otpExpires,
                },
                hostProfile: {
                    isApproved: true,
                    hostingSince: new Date(),
                    responseRate: 100,
                },
            });
        } else {
            user = await User.create({
                name,
                email: email.toLowerCase(),
                password,
                role: "guest",
                userType: "customer",
                isEmailVerified: false,
                emailOtp: {
                    code: otpCode,
                    expiresAt: otpExpires,
                },
                customerProfile: {
                    savedProperties: [],
                    preferredCurrency: "INR",
                    tripsCount: 0,
                },
            });
        }

        // Send OTP email
        await sendOtpEmail(user.email, otpCode, user.name);

        // Redirect to Verification Page
        return res.redirect(`/auth/verify-email?email=${encodeURIComponent(user.email)}&returnUrl=${encodeURIComponent(returnUrl || '')}&sent=true`);
    } catch (err) {
        console.error("Registration error:", err);
        return res.render("auth/auth", {
            title: "Create Account | StayNest",
            mode: "register",
            error: "Something went wrong. Please try again.",
            formData: { name, email, role },
            returnUrl: returnUrl || "",
        });
    }
};

// POST /auth/login
export const postLogin = async (req, res) => {
    const { email, password, returnUrl } = req.body;

    if (!email || !password) {
        return res.render("auth/auth", {
            title: "Sign In | StayNest",
            mode: "login",
            error: "Email and password are required.",
            formData: { email },
            returnUrl: returnUrl || "",
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
                returnUrl: returnUrl || "",
            });
        }

        // Check if user email requires verification
        if (user.isEmailVerified === false && user.emailOtp && user.emailOtp.code) {
            const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
            user.emailOtp = {
                code: newOtp,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            };
            await user.save();
            await sendOtpEmail(user.email, newOtp, user.name);
            return res.redirect(`/auth/verify-email?email=${encodeURIComponent(user.email)}&returnUrl=${encodeURIComponent(returnUrl || '')}&sent=true`);
        }

        generateToken(user._id, res);

        if (returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//")) {
            return res.redirect(returnUrl);
        }

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
            returnUrl: returnUrl || "",
        });
    }
};

// POST /auth/logout
export const postLogout = (req, res) => {
    res.clearCookie("staynest_token");
    res.redirect("/");
};

// GET /auth/verify-email
export const getVerifyEmail = async (req, res) => {
    const email = (req.query.email || "").trim().toLowerCase();
    const returnUrl = req.query.returnUrl || "";
    const sent = req.query.sent === "true";

    if (!email) {
        return res.redirect("/auth/register");
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.redirect("/auth/register");
        }

        if (user.isEmailVerified) {
            generateToken(user._id, res);
            return res.redirect(returnUrl || "/");
        }

        res.render("auth/verifyOtp", {
            email,
            returnUrl,
            errorMessage: null,
            successMessage: sent ? "A 6-digit verification code has been sent to your email." : null,
        });
    } catch (err) {
        console.error("getVerifyEmail error:", err);
        res.redirect("/auth/register");
    }
};

// POST /auth/verify-email
export const postVerifyEmail = async (req, res) => {
    const { email, otp, returnUrl } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanOtp = (otp || "").trim();

    if (!cleanEmail || !cleanOtp || cleanOtp.length < 6) {
        return res.render("auth/verifyOtp", {
            email: cleanEmail,
            returnUrl: returnUrl || "",
            errorMessage: "Please enter the full 6-digit code.",
            successMessage: null,
        });
    }

    try {
        const user = await User.findOne({ email: cleanEmail });
        if (!user) {
            return res.render("auth/verifyOtp", {
                email: cleanEmail,
                returnUrl: returnUrl || "",
                errorMessage: "Account not found. Please sign up again.",
                successMessage: null,
            });
        }

        if (user.isEmailVerified) {
            generateToken(user._id, res);
            return res.redirect(returnUrl || "/");
        }

        // Validate OTP code
        if (!user.emailOtp || !user.emailOtp.code || user.emailOtp.code !== cleanOtp) {
            return res.render("auth/verifyOtp", {
                email: cleanEmail,
                returnUrl: returnUrl || "",
                errorMessage: "Incorrect verification code. Please check your email and try again.",
                successMessage: null,
            });
        }

        // Validate expiration
        if (new Date() > new Date(user.emailOtp.expiresAt)) {
            return res.render("auth/verifyOtp", {
                email: cleanEmail,
                returnUrl: returnUrl || "",
                errorMessage: "This code has expired. Please click 'Resend code' to get a fresh code.",
                successMessage: null,
            });
        }

        // Mark as verified and clear OTP
        user.isEmailVerified = true;
        user.emailOtp = { code: null, expiresAt: null };
        await user.save();

        // Sign in user
        generateToken(user._id, res);

        if (returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//") && returnUrl !== "/auth/login") {
            return res.redirect(returnUrl);
        }

        if (user.role === "admin") return res.redirect("/admin");
        if (user.role === "host") return user.isApproved ? res.redirect("/host") : res.redirect("/host/pending");
        return res.redirect("/");
    } catch (err) {
        console.error("Verification error:", err);
        return res.render("auth/verifyOtp", {
            email: cleanEmail,
            returnUrl: returnUrl || "",
            errorMessage: "Verification failed due to a server error. Please try again.",
            successMessage: null,
        });
    }
};

// POST /auth/resend-otp
export const postResendOtp = async (req, res) => {
    const { email } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanEmail) {
        return res.status(400).json({ success: false, message: "Email is required." });
    }

    try {
        const user = await User.findOne({ email: cleanEmail });
        if (!user) {
            return res.status(404).json({ success: false, message: "No account found with this email." });
        }

        if (user.isEmailVerified) {
            return res.json({ success: true, message: "Email is already verified. Please sign in." });
        }

        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        user.emailOtp = {
            code: newOtp,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        };
        await user.save();

        const sendResult = await sendOtpEmail(user.email, newOtp, user.name);
        if (!sendResult.success) {
            return res.status(500).json({ success: false, message: "Failed to send email. Please try again later." });
        }

        return res.json({ success: true, message: "A fresh 6-digit code has been sent to your email." });
    } catch (err) {
        console.error("Resend OTP error:", err);
        return res.status(500).json({ success: false, message: "Server error resending code." });
    }
};

// GET /auth/google - Initiate Google OAuth flow
export const getGoogleAuth = (req, res) => {
    const returnUrl = req.query.returnUrl || "";
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
        return res.render("auth/auth", {
            title: "Sign In | StayNest",
            mode: "login",
            error: "Google Client ID is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file.",
            formData: {},
            returnUrl: returnUrl,
        });
    }

    const redirectUri = process.env.GOOGLE_CALLBACK_URL || `${req.protocol}://${req.get("host")}/auth/google/callback`;
    const state = Buffer.from(JSON.stringify({ returnUrl })).toString("base64");

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        access_type: "offline",
        prompt: "select_account",
        state: state,
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

// GET /auth/google/callback - Handle Google OAuth redirect and code exchange
export const getGoogleCallback = async (req, res) => {
    const { code, state, error } = req.query;

    let returnUrl = "/";
    if (state) {
        try {
            const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
            if (decoded.returnUrl) returnUrl = decoded.returnUrl;
        } catch (e) {
            console.error("Error decoding state param:", e);
        }
    }

    if (error || !code) {
        console.error("Google OAuth error or cancelled:", error);
        return res.render("auth/auth", {
            title: "Sign In | StayNest",
            mode: "login",
            error: error === "access_denied" ? "Google sign-in was cancelled." : "Google sign-in failed. Please try again.",
            formData: {},
            returnUrl: returnUrl,
        });
    }

    try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_CALLBACK_URL || `${req.protocol}://${req.get("host")}/auth/google/callback`;

        // 1. Exchange authorization code for tokens
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                code: String(code),
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.access_token) {
            console.error("Google token exchange error:", tokenData);
            return res.render("auth/auth", {
                title: "Sign In | StayNest",
                mode: "login",
                error: tokenData.error_description || "Google authorization failed.",
                formData: {},
                returnUrl: returnUrl,
            });
        }

        // 2. Fetch user profile from Google UserInfo API
        const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        const googleUser = await userInfoResponse.json();

        if (!userInfoResponse.ok || !googleUser.email) {
            console.error("Failed to fetch userinfo from Google:", googleUser);
            return res.render("auth/auth", {
                title: "Sign In | StayNest",
                mode: "login",
                error: "Unable to retrieve Google profile information.",
                formData: {},
                returnUrl: returnUrl,
            });
        }

        const { sub: googleId, email, name, picture } = googleUser;

        // 3. Find existing user by googleId or email
        let user = await User.findOne({
            $or: [{ googleId }, { email: email.toLowerCase() }],
        });

        if (user) {
            let needsSave = false;
            if (!user.isEmailVerified) {
                user.isEmailVerified = true;
                needsSave = true;
            }
            if (!user.googleId) {
                user.googleId = googleId;
                needsSave = true;
            }
            if (picture && !user.profilePhoto) {
                user.profilePhoto = picture;
                needsSave = true;
            }
            if (needsSave) {
                await user.save();
            }
        } else {
            // Create a new guest customer user (Google emails are already pre-verified)
            user = await User.create({
                name: name || email.split("@")[0],
                email: email.toLowerCase(),
                googleId: googleId,
                profilePhoto: picture || null,
                role: "guest",
                userType: "customer",
                isEmailVerified: true,
                customerProfile: {
                    savedProperties: [],
                    preferredCurrency: "INR",
                    tripsCount: 0,
                },
            });
        }

        // 4. Generate JWT session cookie
        generateToken(user._id, res);

        // 5. Redirect user to destination
        if (returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//") && returnUrl !== "/auth/login") {
            return res.redirect(returnUrl);
        }

        if (user.role === "admin") return res.redirect("/admin");
        if (user.role === "host") return user.isApproved ? res.redirect("/host") : res.redirect("/host/pending");
        return res.redirect("/");
    } catch (err) {
        console.error("Google callback exception:", err);
        return res.render("auth/auth", {
            title: "Sign In | StayNest",
            mode: "login",
            error: "An unexpected error occurred during Google sign-in.",
            formData: {},
            returnUrl: returnUrl,
        });
    }
};
