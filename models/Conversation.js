import mongoose from "mongoose";

const messageSubSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        senderRole: {
            type: String,
            enum: ["guest", "host", "admin"],
            default: "guest",
        },
        text: {
            type: String,
            required: true,
            trim: true,
        },
        read: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const conversationSchema = new mongoose.Schema(
    {
        guest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        host: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        property: {
            type: String,
            required: true,
        },
        propertyTitle: {
            type: String,
            default: "StayNest Accommodation",
        },
        propertyPhoto: {
            type: String,
            default: "",
        },
        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
            default: null,
        },
        messages: [messageSubSchema],
        lastMessage: {
            type: String,
            default: "",
        },
        lastMessageAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for fast lookup
conversationSchema.index({ host: 1, lastMessageAt: -1 });
conversationSchema.index({ guest: 1, lastMessageAt: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
