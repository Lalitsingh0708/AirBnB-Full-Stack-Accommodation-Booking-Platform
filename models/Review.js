import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import paths from "../utils/pathUtil.js";

const reviewSchema = new mongoose.Schema(
    {
        propertyId: {
            type: String,
            required: true,
            index: true,
        },
        guestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        guestName: {
            type: String,
            required: true,
        },
        guestAvatar: {
            type: String,
            default: "",
        },
        guestTenure: {
            type: String,
            default: "Guest on StayNest",
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
            default: 5,
        },
        comment: {
            type: String,
            required: true,
        },
        tag: {
            type: String,
            default: "Hospitality",
        },
        isVerifiedStay: {
            type: Boolean,
            default: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

const ReviewModel = mongoose.models.Review || mongoose.model("Review", reviewSchema);

// File-backed fallback store to ensure zero data loss
const reviewsFilePath = path.join(paths, "data", "reviews.json");

function getFileReviews() {
    try {
        if (!fs.existsSync(reviewsFilePath)) {
            fs.writeFileSync(reviewsFilePath, JSON.stringify([], null, 2));
            return [];
        }
        const data = fs.readFileSync(reviewsFilePath, "utf8");
        return JSON.parse(data || "[]");
    } catch (e) {
        console.error("Error reading reviews.json:", e);
        return [];
    }
}

function saveFileReviews(reviews) {
    try {
        fs.writeFileSync(reviewsFilePath, JSON.stringify(reviews, null, 2));
    } catch (e) {
        console.error("Error saving reviews.json:", e);
    }
}

// Default seed reviews matching user's screenshot
const defaultSeedReviews = [
    {
        id: "seed-1",
        propertyId: "default",
        guestName: "Nishchay",
        guestAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
        guestTenure: "3 years on StayNest",
        rating: 5,
        comment: "Hello bhai, I have my house in Delhi but I can say now I have my another home too here. Thank you so much for treating us so well and giving us all homely vibes. The food and the serene mountain ambiance were simply breathtaking.",
        tag: "Hospitality",
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: "seed-2",
        propertyId: "default",
        guestName: "Ramita",
        guestAvatar: "",
        guestTenure: "New to StayNest",
        rating: 5,
        comment: "Had a really comfortable stay at this property. The property was peaceful, clean, and had a lovely homely feel. The hospitality was warm and welcoming, and the food was absolutely delicious.",
        tag: "Cleanliness",
        createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: "seed-3",
        propertyId: "default",
        guestName: "Jatin",
        guestAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80",
        guestTenure: "5 years on StayNest",
        rating: 5,
        comment: "A perfect cozy stay for a soothing get away. Easy to access, hidden spots all around and home cooked food was top notch.",
        tag: "Comfort",
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: "seed-4",
        propertyId: "default",
        guestName: "Abhay Bohra",
        guestAvatar: "",
        guestTenure: "2 years on StayNest",
        rating: 5,
        comment: "Very friendly host and nice food. The riverside lawn and mountain views make it unforgettable.",
        tag: "Location",
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: "seed-5",
        propertyId: "default",
        guestName: "Tushar",
        guestAvatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120&auto=format&fit=crop&q=80",
        guestTenure: "1 year on StayNest",
        rating: 5,
        comment: "I needed peace of mind. I booked this place randomly. Now I'm sitting on the bus going back. I felt like writing a review because the host was so helpful and the room was sparkling clean.",
        tag: "Breakfast",
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
        id: "seed-6",
        propertyId: "default",
        guestName: "Manish",
        guestAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
        guestTenure: "5 years on StayNest",
        rating: 5,
        comment: "Had a wonderful and peaceful stay! The property has beautiful riverside access and is surrounded by lush greenery, fresh mountain air and great hospitality.",
        tag: "River",
        createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
    }
];

export class ReviewStore {
    static async getReviewsByPropertyId(propertyId) {
        let dbReviews = [];
        try {
            dbReviews = await ReviewModel.find({ propertyId: String(propertyId) }).sort({ createdAt: -1 }).lean();
        } catch (e) {
            // Mongo might be offline or erroring
        }

        const fileReviews = getFileReviews().filter(r => String(r.propertyId) === String(propertyId));

        // Combine DB and file reviews, de-duplicating by id
        const combined = [...dbReviews];
        for (const fr of fileReviews) {
            if (!combined.some(r => String(r._id || r.id) === String(fr.id || fr._id))) {
                combined.push(fr);
            }
        }

        // If no reviews yet for this property, show seed reviews customized for this property
        if (combined.length === 0) {
            return defaultSeedReviews.map(r => ({ ...r, propertyId: String(propertyId) }));
        }

        return combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    static async addReview(reviewData) {
        const newReviewObj = {
            id: Date.now().toString(),
            propertyId: String(reviewData.propertyId),
            guestId: reviewData.guestId || null,
            guestName: reviewData.guestName || "Guest",
            guestAvatar: reviewData.guestAvatar || "",
            guestTenure: reviewData.guestTenure || "Guest on StayNest",
            isVerifiedStay: reviewData.isVerifiedStay !== undefined ? Boolean(reviewData.isVerifiedStay) : true,
            rating: Number(reviewData.rating) || 5,
            comment: reviewData.comment || "",
            tag: reviewData.tag || "Hospitality",
            createdAt: new Date().toISOString()
        };

        // Save to file
        const fileReviews = getFileReviews();
        fileReviews.unshift(newReviewObj);
        saveFileReviews(fileReviews);

        // Save to MongoDB if available
        try {
            const dbRev = new ReviewModel({
                propertyId: newReviewObj.propertyId,
                guestId: newReviewObj.guestId,
                guestName: newReviewObj.guestName,
                guestAvatar: newReviewObj.guestAvatar,
                guestTenure: newReviewObj.guestTenure,
                isVerifiedStay: newReviewObj.isVerifiedStay,
                rating: newReviewObj.rating,
                comment: newReviewObj.comment,
                tag: newReviewObj.tag,
                createdAt: new Date()
            });
            await dbRev.save();
        } catch (e) {
            console.log("Saved review to file fallback:", e.message);
        }

        return newReviewObj;
    }
}

export default ReviewModel;
