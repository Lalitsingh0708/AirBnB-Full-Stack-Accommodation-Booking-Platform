import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
    {
        // Basic Info
        title: {
            type: String,
            required: [true, "Property title is required"],
            trim: true,
            minlength: [5, "Title must be at least 5 characters"],
            maxlength: [100, "Title cannot exceed 100 characters"],
        },
        description: {
            type: String,
            required: [true, "Description is required"],
            trim: true,
            minlength: [20, "Description must be at least 20 characters"],
            maxlength: [2000, "Description cannot exceed 2000 characters"],
        },
        propertyType: {
            type: String,
            enum: [
                "House", "Flat/apartment", "Barn", "Bed & breakfast", "Boat", "Cabin",
                "Campervan/motorhome", "Casa particular", "Castle", "Cave", "Container",
                "Cycladic home", "Dammuso", "Dome", "Earth home", "Farm", "Guest house",
                "Hotel", "Houseboat", "Minsu", "Riad", "Ryokan", "Shepherd’s hut",
                "Tent", "Tiny home", "Tower", "Tree house", "Trullo", "Windmill", "Yurt",
                "Apartment", "Villa", "Farmhouse", "Studio", "Cottage", "Bungalow"
            ],
            required: [true, "Property type is required"],
        },

        // Location
        address: {
            type: String,
            required: [true, "Address is required"],
            trim: true,
        },
        city: {
            type: String,
            required: [true, "City is required"],
            trim: true,
        },
        state: {
            type: String,
            required: [true, "State is required"],
            trim: true,
        },

        // Pricing
        pricePerNight: {
            type: Number,
            required: [true, "Price per night is required"],
            min: [1, "Price must be at least 1"],
        },

        // Capacity
        maxGuests: {
            type: Number,
            required: [true, "Maximum guests is required"],
            min: [1, "Must allow at least 1 guest"],
            max: [20, "Maximum 20 guests allowed"],
        },
        bedrooms: {
            type: Number,
            required: [true, "Number of bedrooms is required"],
            min: [0, "Minimum 0 bedrooms (studio)"],
            max: [20, "Maximum 20 bedrooms"],
        },
        bathrooms: {
            type: Number,
            required: [true, "Number of bathrooms is required"],
            min: [1, "Minimum 1 bathroom required"],
            max: [20, "Maximum 20 bathrooms"],
        },

        // Amenities
        amenities: {
            wifi: { type: Boolean, default: false },
            ac: { type: Boolean, default: false },
            parking: { type: Boolean, default: false },
            pool: { type: Boolean, default: false },
            petFriendly: { type: Boolean, default: false },
            hotWater: { type: Boolean, default: false },
            tv: { type: Boolean, default: false },
            washingMachine: { type: Boolean, default: false },
        },

        // Photos — array of file paths (uploaded via multer)
        photos: [
            {
                type: String,
            },
        ],

        // Host reference
        host: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Location Privacy
        showPreciseLocation: {
            type: Boolean,
            default: true,
        },

        // Availability & Approval
        isAvailable: {
            type: Boolean,
            default: true,
        },
        // Admin must approve listing before it goes live
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        rejectionReason: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Text index for search
propertySchema.index({ title: "text", city: "text", state: "text" });

const Property = mongoose.model("Property", propertySchema);
export default Property;
