import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
    {
        property: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Property",
            required: true,
        },
        guest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
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
        totalAmount: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ["confirmed", "cancelled", "completed"],
            default: "confirmed",
        },
        // Snapshot of property title at time of booking
        // (in case property is later deleted/renamed)
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
bookingSchema.pre("save", function (next) {
    if (this.checkOut <= this.checkIn) {
        return next(new Error("Check-out date must be after check-in date"));
    }
    next();
});

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
