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
        cleanliness: {
            type: Number,
            min: 1,
            max: 5,
            default: 5,
        },
        accuracy: {
            type: Number,
            min: 1,
            max: 5,
            default: 5,
        },
        checkIn: {
            type: Number,
            min: 1,
            max: 5,
            default: 5,
        },
        communication: {
            type: Number,
            min: 1,
            max: 5,
            default: 5,
        },
        location: {
            type: Number,
            min: 1,
            max: 5,
            default: 5,
        },
        value: {
            type: Number,
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

    static calculateCategoryScores(reviews) {
        if (!reviews || reviews.length === 0) {
            return {
                cleanliness: 4.9,
                accuracy: 5.0,
                checkIn: 4.9,
                communication: 5.0,
                location: 4.8,
                value: 4.9,
                overall: 4.9
            };
        }

        let cSum = 0, aSum = 0, chSum = 0, comSum = 0, locSum = 0, valSum = 0, totalRating = 0;
        reviews.forEach(r => {
            const rOverall = Number(r.rating) || 5;
            totalRating += rOverall;
            cSum += Number(r.cleanliness) || rOverall;
            aSum += Number(r.accuracy) || rOverall;
            chSum += Number(r.checkIn) || rOverall;
            comSum += Number(r.communication) || rOverall;
            locSum += Number(r.location) || rOverall;
            valSum += Number(r.value) || rOverall;
        });

        const count = reviews.length;
        return {
            cleanliness: Number((cSum / count).toFixed(1)),
            accuracy: Number((aSum / count).toFixed(1)),
            checkIn: Number((chSum / count).toFixed(1)),
            communication: Number((comSum / count).toFixed(1)),
            location: Number((locSum / count).toFixed(1)),
            value: Number((valSum / count).toFixed(1)),
            overall: Number((totalRating / count).toFixed(2))
        };
    }

    static async deleteReview(reviewId, userId) {
        // Remove from file
        const fileReviews = getFileReviews();
        const filtered = fileReviews.filter(r => {
            const matchId = String(r.id || r._id) === String(reviewId);
            const matchUser = !userId || String(r.guestId) === String(userId);
            return !(matchId && matchUser);
        });
        saveFileReviews(filtered);

        // Remove from DB if available
        try {
            await ReviewModel.deleteOne({
                _id: reviewId,
                ...(userId ? { guestId: userId } : {})
            });
        } catch (e) {
            console.error("Error deleting review from Mongo:", e.message);
        }
        return true;
    }

    static async addReview(reviewData) {
        const cleanliness = Number(reviewData.cleanliness) || Number(reviewData.rating) || 5;
        const accuracy = Number(reviewData.accuracy) || Number(reviewData.rating) || 5;
        const checkIn = Number(reviewData.checkIn) || Number(reviewData.rating) || 5;
        const communication = Number(reviewData.communication) || Number(reviewData.rating) || 5;
        const location = Number(reviewData.location) || Number(reviewData.rating) || 5;
        const value = Number(reviewData.value) || Number(reviewData.rating) || 5;
        
        // Compute overall rating as average of categories or passed rating
        const rating = Number(reviewData.rating) || Number(((cleanliness + accuracy + checkIn + communication + location + value) / 6).toFixed(1)) || 5;

        const newReviewObj = {
            id: Date.now().toString(),
            propertyId: String(reviewData.propertyId),
            guestId: reviewData.guestId || null,
            guestName: reviewData.guestName || "Guest",
            guestAvatar: reviewData.guestAvatar || "",
            guestTenure: reviewData.guestTenure || "Guest on StayNest",
            isVerifiedStay: reviewData.isVerifiedStay !== undefined ? Boolean(reviewData.isVerifiedStay) : true,
            rating: rating,
            cleanliness: cleanliness,
            accuracy: accuracy,
            checkIn: checkIn,
            communication: communication,
            location: location,
            value: value,
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
                cleanliness: newReviewObj.cleanliness,
                accuracy: newReviewObj.accuracy,
                checkIn: newReviewObj.checkIn,
                communication: newReviewObj.communication,
                location: newReviewObj.location,
                value: newReviewObj.value,
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
