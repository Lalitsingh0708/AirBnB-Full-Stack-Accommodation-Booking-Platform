import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ═══════════════════════════════════════════════════════════════
// 1. DEDICATED HOST PROFILE SUB-SCHEMA (Host-specific data)
// ═══════════════════════════════════════════════════════════════
export const hostProfileSchema = new mongoose.Schema(
    {
        isApproved: {
            type: Boolean,
            default: false,
        },
        phone: {
            type: String,
            trim: true,
            default: null,
        },
        isPhoneVerified: {
            type: Boolean,
            default: false,
        },
        phoneOtp: {
            code: { type: String, default: null },
            expiresAt: { type: Date, default: null },
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        emailOtp: {
            code: { type: String, default: null },
            expiresAt: { type: Date, default: null },
        },
        about: {
            type: String,
            default: "",
        },
        hostingSince: {
            type: Date,
            default: Date.now,
        },
        responseRate: {
            type: Number,
            default: 100,
        },
        superhostStatus: {
            type: Boolean,
            default: false,
        },
        coHosts: [
            {
                type: String,
            },
        ],
    },
    { _id: false }
);

// ═══════════════════════════════════════════════════════════════
// 2. DEDICATED CUSTOMER PROFILE SUB-SCHEMA (Guest-specific data)
// ═══════════════════════════════════════════════════════════════
export const customerProfileSchema = new mongoose.Schema(
    {
        phone: {
            type: String,
            trim: true,
            default: null,
        },
        savedProperties: [
            {
                type: String,
            },
        ],
        preferredCurrency: {
            type: String,
            default: "INR",
        },
        tripsCount: {
            type: Number,
            default: 0,
        },
        emergencyContact: {
            name: { type: String, default: "" },
            phone: { type: String, default: "" },
        },
    },
    { _id: false }
);

// ═══════════════════════════════════════════════════════════════
// 3. MASTER USER SCHEMA (Cleanly managing Host & Customer users)
// ═══════════════════════════════════════════════════════════════
const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            minlength: [2, "Name must be at least 2 characters"],
            maxlength: [50, "Name cannot exceed 50 characters"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
        },
        password: {
            type: String,
            required: [
                function () {
                    return !this.googleId;
                },
                "Password is required",
            ],
            minlength: [6, "Password must be at least 6 characters"],
            select: false, // never return password in queries by default
        },
        googleId: {
            type: String,
            default: null,
            sparse: true,
        },
        role: {
            type: String,
            enum: ["guest", "host", "admin"],
            default: "guest",
        },
        userType: {
            type: String,
            enum: ["customer", "host", "admin"],
            default: function () {
                return this.role === "host" ? "host" : "customer";
            },
        },
        profilePhoto: {
            type: String,
            default: null,
        },

        // ── Dedicated Sub-Schemas inside Users ──
        hostProfile: {
            type: hostProfileSchema,
            default: null,
        },
        customerProfile: {
            type: customerProfileSchema,
            default: null,
        },

        // ── Direct fields maintained for backwards-compatibility ──
        isApproved: {
            type: Boolean,
            default: false,
        },
        phone: {
            type: String,
            trim: true,
            default: null,
        },
        isPhoneVerified: {
            type: Boolean,
            default: false,
        },
        phoneOtp: {
            code: { type: String, default: null },
            expiresAt: { type: Date, default: null },
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        emailOtp: {
            code: { type: String, default: null },
            expiresAt: { type: Date, default: null },
        },
        savedProperties: [
            {
                type: String,
            },
        ],
    },
    {
        timestamps: true,
        discriminatorKey: "role",
    }
);

// Pre-save hook: Hash password + Synchronize structured Host & Customer sub-schemas
userSchema.pre("save", async function () {
    // 1. Password hashing
    if (this.isModified("password") && this.password) {
        this.password = await bcrypt.hash(this.password, 12);
    }

    // 2. Sync Host Profile sub-schema
    if (this.role === "host") {
        this.userType = "host";
        if (!this.hostProfile) {
            this.hostProfile = {};
        }
        this.hostProfile.isApproved = this.isApproved ?? true;
        this.hostProfile.phone = this.phone || this.hostProfile.phone || null;
        this.hostProfile.isPhoneVerified = this.isPhoneVerified ?? false;
        if (this.phoneOtp) {
            this.hostProfile.phoneOtp = {
                code: this.phoneOtp.code,
                expiresAt: this.phoneOtp.expiresAt,
            };
        }
    }

    // 3. Sync Customer Profile sub-schema
    if (this.role === "guest") {
        this.userType = "customer";
        if (!this.customerProfile) {
            this.customerProfile = {};
        }
        this.customerProfile.phone = this.phone || this.customerProfile.phone || null;
        if (this.savedProperties) {
            this.customerProfile.savedProperties = this.savedProperties;
        }
    }
});

// Post-init hook: Ensure top-level fields mirror sub-schema fields when loading documents
userSchema.post("init", function () {
    if (this.role === "host" && this.hostProfile) {
        if (this.hostProfile.phone && !this.phone) this.phone = this.hostProfile.phone;
        if (this.hostProfile.isApproved !== undefined) this.isApproved = this.hostProfile.isApproved;
        if (this.hostProfile.isPhoneVerified !== undefined) this.isPhoneVerified = this.hostProfile.isPhoneVerified;
        if (this.hostProfile.phoneOtp) this.phoneOtp = this.hostProfile.phoneOtp;
    } else if (this.role === "guest" && this.customerProfile) {
        if (this.customerProfile.phone && !this.phone) this.phone = this.customerProfile.phone;
        if (this.customerProfile.savedProperties && (!this.savedProperties || this.savedProperties.length === 0)) {
            this.savedProperties = this.customerProfile.savedProperties;
        }
    }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

// Post-save hook: automatically sync to dedicated 'hosts' or 'customers' collection in Atlas
userSchema.post("save", async function (doc) {
    try {
        const db = mongoose.connection.db;
        if (!db) return;
        const plainDoc = doc.toObject();
        if (doc.role === "host") {
            await db.collection("hosts").replaceOne({ _id: doc._id }, plainDoc, { upsert: true });
        } else if (doc.role === "guest") {
            await db.collection("customers").replaceOne({ _id: doc._id }, plainDoc, { upsert: true });
        }
    } catch (err) {
        console.error("Error auto-syncing to hosts/customers collection:", err);
    }
});

// Master User model
const User = mongoose.model("User", userSchema);

// Dedicated Models for Host and Customer (Mongoose Discriminators)
export const Host = mongoose.models.host || User.discriminator("host", new mongoose.Schema({}));
export const Customer = mongoose.models.guest || User.discriminator("guest", new mongoose.Schema({}));

export default User;
