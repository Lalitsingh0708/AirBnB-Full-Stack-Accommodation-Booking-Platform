import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
    {
        property: {
            type: String,
            required: true,
        },
        guest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        host: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        checkIn: {
            type: Date,
            required: [true, "Check-in date is required"],
        },
        checkOut: {
            type: Date,
            required: [true, "Check-out date is required"],
        },
        guests: {
            type: Number,
            required: [true, "Number of guests is required"],
            min: [1, "At least 1 guest required"],
        },
        totalNights: {
            type: Number,
            required: true,
        },
        pricePerNight: {
            type: Number,
            required: true,
        },
        serviceFee: {
            type: Number,
            default: 450,
        },
        totalAmount: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ["confirmed", "cancelled", "completed"],
            default: "confirmed",
        },
        paymentMethod: {
            type: String,
            enum: ["upi", "card", "netbanking", "pay_on_arrival"],
            default: "upi",
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "refunded"],
            default: "paid",
        },
        specialRequests: {
            type: String,
            default: "",
        },
        // Snapshot of property title at time of booking
        propertyTitle: {
            type: String,
            required: true,
        },
        propertyCity: {
            type: String,
            required: true,
        },
        propertyPhoto: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Validate checkout is after checkin
bookingSchema.pre("save", function () {
    if (this.checkOut <= this.checkIn) {
        throw new Error("Check-out date must be after check-in date");
    }
});

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
