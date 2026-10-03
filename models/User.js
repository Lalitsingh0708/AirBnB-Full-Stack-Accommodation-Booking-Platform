import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters"],
            select: false, // never return password in queries by default
        },
        role: {
            type: String,
            enum: ["guest", "host", "admin"],
            default: "guest",
        },
        // If role is host, admin needs to approve their listings
        isApproved: {
            type: Boolean,
            default: false,
        },
        phone: {
            type: String,
            trim: true,
            default: null,
        },
        profilePhoto: {
            type: String,
            default: null,
        },
        // for guests: properties they have saved
        savedProperties: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Property",
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
// Note: mongoose v8+ async hooks do not need next() — just return
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 12);
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
