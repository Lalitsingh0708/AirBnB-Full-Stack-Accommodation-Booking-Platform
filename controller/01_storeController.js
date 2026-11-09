import { Home } from "../models/01_homesModel.js"; // Home models 
import { FavouriteHomes } from "../models/02_favouriteModel.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Booking from "../models/Booking.js";
import ReviewModel, { ReviewStore } from "../models/Review.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import { sendBookingConfirmationEmail } from "../utils/emailService.js";
import { io } from "../app.js";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_SdWJYLLkVxRcTI",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "64siL8Yh749lLxmStW3FPNI9",
});

export const getHomesList =  (req , res)=>{
    Home.fetchAll((registeredHome) => {
        res.render("host/02_hostHome.ejs", { registeredHome: registeredHome });
    }) ;
}

export const postAddHome = (req , res)=>{
    Home.fetchAll((registeredHome) => {
        let filteredHomes = [...registeredHome];
        const { destination, category, guests } = req.query;

        if (destination && destination.trim()) {
            const q = destination.trim().toLowerCase();
            filteredHomes = filteredHomes.filter(h => 
                (h.city && h.city.toLowerCase().includes(q)) ||
                (h.houseAddress && h.houseAddress.toLowerCase().includes(q)) ||
                (h.houseName && h.houseName.toLowerCase().includes(q))
            );
        }

        if (guests && Number(guests) > 0) {
            filteredHomes = filteredHomes.filter(h => (Number(h.maxGuests) || 4) >= Number(guests));
        }

        if (category && category !== 'all' && category !== 'homes') {
            const cat = category.toLowerCase();
            filteredHomes = filteredHomes.filter(h => 
                (h.propertyType && h.propertyType.toLowerCase().includes(cat)) ||
                (h.houseName && h.houseName.toLowerCase().includes(cat))
            );
        }

        res.render("store/04_viewHomes" , { 
            registeredHome: filteredHomes,
            searchQuery: { destination: destination || '', guests: guests || '', category: category || 'all' },
            category: category || 'all',
            currentPage: 'stays',
            user: req.user
        }) ;
    }) ;
} ;

export const getSearchResults = (req, res) => {
    Home.fetchAll((registeredHome) => {
        let filteredHomes = [...registeredHome];
        const { destination, dates, checkin, checkout, guests, category, amenity, minPrice, maxPrice } = req.query;

        // 1. Destination filter (matches city, address, houseName, state)
        if (destination && destination.trim()) {
            const q = destination.trim().toLowerCase();
            filteredHomes = filteredHomes.filter(h => 
                (h.city && h.city.toLowerCase().includes(q)) ||
                (h.houseAddress && h.houseAddress.toLowerCase().includes(q)) ||
                (h.houseName && h.houseName.toLowerCase().includes(q)) ||
                (h.state && h.state.toLowerCase().includes(q))
            );
        }

        // 2. Guests filter
        if (guests && Number(guests) > 0) {
            filteredHomes = filteredHomes.filter(h => (Number(h.maxGuests) || 4) >= Number(guests));
        }

        // 3. Category filter
        if (category && category !== 'all' && category !== 'homes') {
            const cat = category.toLowerCase();
            filteredHomes = filteredHomes.filter(h => 
                (h.propertyType && h.propertyType.toLowerCase().includes(cat)) ||
                (h.houseName && h.houseName.toLowerCase().includes(cat))
            );
        }

        // 4. Quick Amenity filter matching reference screenshot
        if (amenity && amenity.trim()) {
            const a = amenity.trim().toLowerCase();
            if (a === 'washing_machine' || a === 'washing machine') {
                filteredHomes = filteredHomes.filter(h => 
                    h.amenities && Array.isArray(h.amenities) && 
                    h.amenities.some(am => am.toLowerCase().includes('wash') || am.toLowerCase().includes('washer'))
                );
            } else if (a === 'wifi') {
                filteredHomes = filteredHomes.filter(h => 
                    h.amenities && Array.isArray(h.amenities) && 
                    h.amenities.some(am => am.toLowerCase().includes('wifi') || am.toLowerCase().includes('internet') || am.toLowerCase().includes('workspace'))
                );
            } else if (a === 'kitchen') {
                filteredHomes = filteredHomes.filter(h => 
                    h.amenities && Array.isArray(h.amenities) && 
                    h.amenities.some(am => am.toLowerCase().includes('kitchen'))
                );
            } else if (a === 'air conditioning' || a === 'ac') {
                filteredHomes = filteredHomes.filter(h => 
                    h.amenities && Array.isArray(h.amenities) && 
                    h.amenities.some(am => am.toLowerCase().includes('ac') || am.toLowerCase().includes('air conditioning'))
                );
            } else if (a === 'bathrooms' || a === '1+ bathrooms') {
                filteredHomes = filteredHomes.filter(h => (Number(h.bathrooms) || 1) >= 1);
            }
        }

        // Price range filtering
        if (minPrice && !isNaN(Number(minPrice))) {
            filteredHomes = filteredHomes.filter(h => Number(h.housePrice) >= Number(minPrice));
        }
        if (maxPrice && !isNaN(Number(maxPrice))) {
            filteredHomes = filteredHomes.filter(h => Number(h.housePrice) <= Number(maxPrice));
        }

        // City coordinates map for accurate pins on Leaflet
        const cityCoords = {
            'delhi': { lat: 28.6139, lng: 77.2090 },
            'new delhi': { lat: 28.6139, lng: 77.2090 },
            'gurugram': { lat: 28.4595, lng: 77.0266 },
            'noida': { lat: 28.5355, lng: 77.3910 },
            'manali': { lat: 32.2432, lng: 77.1892 },
            'solang valley': { lat: 32.3166, lng: 77.1578 },
            'nasogi': { lat: 32.2396, lng: 77.1750 },
            'agra': { lat: 27.1767, lng: 78.0081 },
            'jaipur': { lat: 26.9124, lng: 75.7873 },
            'phagwara': { lat: 31.2240, lng: 75.7708 },
            'khajurla': { lat: 31.2584, lng: 75.7042 },
            'goa': { lat: 15.4909, lng: 73.8278 },
            'chandigarh': { lat: 30.7333, lng: 76.7794 },
            'mumbai': { lat: 19.0760, lng: 72.8777 },
            'bengaluru': { lat: 12.9716, lng: 77.5946 }
        };

        let mapCenter = { lat: 28.6139, lng: 77.2090, zoom: 12 };
        if (destination && destination.trim()) {
            const destLower = destination.trim().toLowerCase();
            for (const [cName, cCoord] of Object.entries(cityCoords)) {
                if (destLower.includes(cName) || cName.includes(destLower)) {
                    mapCenter = { lat: cCoord.lat, lng: cCoord.lng, zoom: 12 };
                    break;
                }
            }
        } else if (filteredHomes.length > 0 && filteredHomes[0].latitude && filteredHomes[0].longitude) {
            mapCenter = { lat: Number(filteredHomes[0].latitude), lng: Number(filteredHomes[0].longitude), zoom: 12 };
        }

        // Coordinates jitter for pins so they don't overlap completely
        filteredHomes = filteredHomes.map((h, idx) => {
            let lat = Number(h.latitude);
            let lng = Number(h.longitude);
            if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
                const c = (h.city || '').toLowerCase();
                if (cityCoords[c]) {
                    lat = cityCoords[c].lat;
                    lng = cityCoords[c].lng;
                } else {
                    lat = mapCenter.lat;
                    lng = mapCenter.lng;
                }
                const offsetLat = ((idx % 4) - 1.5) * 0.02;
                const offsetLng = (((idx * 2) % 4) - 1.5) * 0.025;
                lat += offsetLat;
                lng += offsetLng;
            }

            return {
                ...h,
                mapLat: lat,
                mapLng: lng
            };
        });

        const displayDestination = destination && destination.trim() ? destination.trim() : 'New Delhi';

        res.render("store/searchHomes.ejs", {
            registeredHome: filteredHomes,
            allHomes: registeredHome,
            totalCount: filteredHomes.length,
            displayDestination: displayDestination,
            searchQuery: {
                destination: destination || '',
                dates: dates || '',
                checkin: checkin || '',
                checkout: checkout || '',
                guests: guests || '',
                category: category || 'all',
                amenity: amenity || ''
            },
            mapCenter: mapCenter,
            currentPage: 'search',
            isSearchResultsPage: true,
            user: req.user
        });
    });
};


export const getBookings = async (req , res)=>{
    try {
        // Strict per-user isolation: Only the logged-in user's own bookings are queried!
        if (!req.user) {
            return res.redirect("/auth/login?returnUrl=/bookings");
        }
        const bookings = await Booking.find({ guest: req.user._id }).sort({ createdAt: -1 }).lean();
        res.render("store/09_bookings.ejs", {
            bookings: bookings,
            user: req.user,
            isBookedNotice: req.query.booked === "true",
            isCancelledNotice: req.query.cancelled === "true",
            currentPage: "bookings"
        });
    } catch (err) {
        console.error("Error fetching bookings:", err);
        res.render("store/09_bookings.ejs", {
            bookings: [],
            user: req.user,
            isBookedNotice: false,
            isCancelledNotice: false,
            currentPage: "bookings"
        });
    }
};

export const getCheckout = (req, res) => {
    if (!req.user) {
        const returnUrl = encodeURIComponent(req.originalUrl || "/");
        return res.redirect(`/auth/login?returnUrl=${returnUrl}`);
    }
    const homeId = req.params.id;
    const { checkIn, checkOut, guests } = req.query;

    Home.findById(homeId, (home) => {
        if (!home) {
            return res.redirect("/");
        }

        const validCheckIn = checkIn || "2026-10-06";
        const validCheckOut = checkOut || "2026-10-07";
        const validGuests = Number(guests) || 1;

        const dIn = new Date(validCheckIn);
        const dOut = new Date(validCheckOut);
        const diffMs = dOut - dIn;
        const nights = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        res.render("store/checkout.ejs", {
            home,
            checkIn: validCheckIn,
            checkOut: validCheckOut,
            guests: validGuests,
            nights,
            user: req.user,
            currentPage: "checkout",
            razorpayKeyId: process.env.RAZORPAY_KEY_ID || "rzp_test_SdWJYLLkVxRcTI",
        });
    });
};

export const postCreateRazorpayOrder = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const { homeId, totalAmount, checkIn, checkOut, guests, totalNights, pricePerNight } = req.body;
        if (!homeId) {
            return res.status(400).json({ success: false, message: "Property ID is required" });
        }

        const parsedAmount = Math.round(Number(totalAmount));
        if (!parsedAmount || parsedAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid booking amount" });
        }

        const amountInPaise = parsedAmount * 100;
        const receiptId = `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: "INR",
            receipt: receiptId,
            notes: {
                homeId: String(homeId),
                guestId: String(req.user._id),
                checkIn: String(checkIn || ""),
                checkOut: String(checkOut || ""),
                guests: String(guests || "1"),
            },
        });

        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_SdWJYLLkVxRcTI",
            receipt: receiptId,
            user: {
                name: req.user.name,
                email: req.user.email,
                phone: req.user.phone || "",
            },
        });
    } catch (err) {
        console.error("Razorpay order creation error:", err);
        res.status(500).json({ success: false, message: "Failed to initiate payment gateway", error: err.message });
    }
};

export const postVerifyRazorpayPayment = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const {
            homeId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            checkIn,
            checkOut,
            guests,
            totalNights,
            pricePerNight,
            totalAmount,
            paymentMethod,
            specialRequests,
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: "Missing payment verification parameters" });
        }

        // Verify HMAC SHA256 signature
        const secret = process.env.RAZORPAY_KEY_SECRET || "64siL8Yh749lLxmStW3FPNI9";
        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generatedSignature = hmac.digest("hex");

        if (generatedSignature !== razorpay_signature) {
            console.error("Signature verification mismatch!");
            return res.status(400).json({ success: false, message: "Payment verification failed. Invalid signature." });
        }

        // Find home and create booking record
        Home.findById(homeId, async (home) => {
            if (!home) {
                return res.status(404).json({ success: false, message: "Property not found" });
            }

            try {
                const guestUser = req.user;
                let hostUserId = null;
                if (home.hostId && mongoose.Types.ObjectId.isValid(home.hostId)) {
                    hostUserId = home.hostId;
                } else {
                    const fallbackHost = await User.findOne({ role: "host" });
                    if (fallbackHost) hostUserId = fallbackHost._id;
                }

                const newBooking = new Booking({
                    property: String(home.id),
                    guest: guestUser._id,
                    host: hostUserId,
                    checkIn: new Date(checkIn || Date.now()),
                    checkOut: new Date(checkOut || (Date.now() + 86400000)),
                    guests: Number(guests) || 1,
                    totalNights: Number(totalNights) || 1,
                    pricePerNight: Number(pricePerNight) || Number(home.housePrice) || 2620,
                    serviceFee: 450,
                    totalAmount: Number(totalAmount) || Math.round(Number(home.housePrice || 2620) * Number(totalNights || 1) + 450),
                    status: "confirmed",
                    paymentMethod: paymentMethod || "razorpay",
                    paymentStatus: "paid",
                    razorpayOrderId: razorpay_order_id,
                    razorpayPaymentId: razorpay_payment_id,
                    razorpaySignature: razorpay_signature,
                    specialRequests: specialRequests || "",
                    propertyTitle: home.houseName,
                    propertyCity: home.city || home.houseAddress || "India",
                    propertyPhoto: home.housePhoto || (home.photos && home.photos[0]) || "",
                });

                await newBooking.save();

                // Send Luxury Confirmation Email to Guest
                if (guestUser.email) {
                    sendBookingConfirmationEmail(guestUser.email, newBooking, guestUser.name).catch((emailErr) => {
                        console.error("[StoreController] Failed to send booking confirmation email:", emailErr);
                    });
                }

                // Send automatic confirmation message to host in Conversation
                if (hostUserId) {
                    try {
                        let conversation = await Conversation.findOne({
                            guest: guestUser._id,
                            property: String(home.id),
                        });
                        if (!conversation) {
                            conversation = new Conversation({
                                guest: guestUser._id,
                                host: hostUserId,
                                property: String(home.id),
                                propertyTitle: home.houseName,
                                propertyPhoto: home.housePhoto || (home.photos && home.photos[0]) || "",
                                messages: [],
                                lastMessage: "",
                            });
                        }
                        const sysMsg = {
                            sender: guestUser._id,
                            senderRole: "guest",
                            text: `Payment of ₹${newBooking.totalAmount.toLocaleString('en-IN')} received via Razorpay (${razorpay_payment_id}). Reservation Confirmed for ${new Date(checkIn).toLocaleDateString()} to ${new Date(checkOut).toLocaleDateString()} (${totalNights} nights, ${guests} guests).`,
                            read: false,
                            createdAt: new Date(),
                        };
                        conversation.messages.push(sysMsg);
                        conversation.lastMessage = sysMsg.text;
                        conversation.lastMessageAt = new Date();
                        await conversation.save();
                    } catch (convErr) {
                        console.error("Error creating conversation message for booking:", convErr);
                    }
                }

                return res.json({
                    success: true,
                    bookingId: newBooking._id,
                    paymentId: razorpay_payment_id,
                    redirectUrl: "/bookings?booked=true",
                });
            } catch (saveErr) {
                console.error("Error saving verified booking:", saveErr);
                return res.status(500).json({ success: false, message: "Error completing booking record." });
            }
        });
    } catch (err) {
        console.error("Payment verification route error:", err);
        res.status(500).json({ success: false, message: "Server error verifying payment", error: err.message });
    }
};

export const postCreateBooking = async (req, res) => {
    if (!req.user) {
        const returnUrl = encodeURIComponent(req.originalUrl || "/");
        return res.redirect(`/auth/login?returnUrl=${returnUrl}`);
    }
    const homeId = req.params.id;
    const {
        checkIn,
        checkOut,
        guests,
        totalNights,
        pricePerNight,
        totalAmount,
        paymentMethod,
        specialRequests,
    } = req.body;

    Home.findById(homeId, async (home) => {
        if (!home) {
            return res.redirect("/");
        }

        try {
            const guestUser = req.user;
            let hostUserId = null;
            if (home.hostId && mongoose.Types.ObjectId.isValid(home.hostId)) {
                hostUserId = home.hostId;
            } else {
                const fallbackHost = await User.findOne({ role: "host" });
                if (fallbackHost) hostUserId = fallbackHost._id;
            }

            const isPayOnArrival = paymentMethod === "pay_on_arrival";

            const newBooking = new Booking({
                property: String(home.id),
                guest: guestUser._id, // Strict per-user isolation
                host: hostUserId,
                checkIn: new Date(checkIn || Date.now()),
                checkOut: new Date(checkOut || (Date.now() + 86400000)),
                guests: Number(guests) || 1,
                totalNights: Number(totalNights) || 1,
                pricePerNight: Number(pricePerNight) || Number(home.housePrice) || 2620,
                serviceFee: 450,
                totalAmount: Number(totalAmount) || Math.round(Number(home.housePrice || 2620) * Number(totalNights || 1) + 450),
                status: "confirmed",
                paymentMethod: paymentMethod || "pay_on_arrival",
                paymentStatus: isPayOnArrival ? "pending" : "paid",
                specialRequests: specialRequests || "",
                propertyTitle: home.houseName,
                propertyCity: home.city || home.houseAddress || "India",
                propertyPhoto: home.housePhoto || (home.photos && home.photos[0]) || "",
            });

            await newBooking.save();

            // Send Luxury Confirmation Email to Guest
            if (guestUser.email) {
                sendBookingConfirmationEmail(guestUser.email, newBooking, guestUser.name).catch((emailErr) => {
                    console.error("[StoreController] Failed to send booking confirmation email:", emailErr);
                });
            }

            // Automatic confirmation message to host in Conversation
            if (hostUserId) {
                try {
                    let conversation = await Conversation.findOne({
                        guest: guestUser._id,
                        property: String(home.id),
                    });
                    if (!conversation) {
                        conversation = new Conversation({
                            guest: guestUser._id,
                            host: hostUserId,
                            property: String(home.id),
                            propertyTitle: home.houseName,
                            propertyPhoto: home.housePhoto || (home.photos && home.photos[0]) || "",
                            messages: [],
                            lastMessage: "",
                        });
                    }
                    const sysMsg = {
                        sender: guestUser._id,
                        senderRole: "guest",
                        text: `Booking Confirmed. Dates: ${new Date(checkIn).toLocaleDateString()} to ${new Date(checkOut).toLocaleDateString()} (${totalNights} nights, ${guests} guests). Payment via ${paymentMethod ? paymentMethod.toUpperCase() : 'PAY ON ARRIVAL'}.`,
                        read: false,
                        createdAt: new Date(),
                    };
                    conversation.messages.push(sysMsg);
                    conversation.lastMessage = sysMsg.text;
                    conversation.lastMessageAt = new Date();
                    await conversation.save();
                } catch (convErr) {
                    console.error("Error creating conversation message for booking:", convErr);
                }
            }

            res.redirect("/bookings?booked=true");
        } catch (err) {
            console.error("Error creating booking:", err);
            res.redirect(`/homes/${homeId}`);
        }
    });
};

export const postCancelBooking = async (req, res) => {
    if (!req.user) {
        return res.redirect("/auth/login?returnUrl=/bookings");
    }
    const bookingId = req.params.id;
    try {
        // Strict ownership: user can ONLY cancel their own booking!
        const booking = await Booking.findOne({ _id: bookingId, guest: req.user._id });
        if (!booking) {
            return res.redirect("/bookings");
        }
        booking.status = "cancelled";
        await booking.save();
        res.redirect("/bookings?cancelled=true");
    } catch (err) {
        console.error("Error cancelling booking:", err);
        res.redirect("/bookings");
    }
};

export const getFavroutelist = async (req, res) => {
    try {
        if (!req.user) {
            const returnUrl = encodeURIComponent(req.originalUrl || "/favourite-list");
            return res.redirect(`/auth/login?returnUrl=${returnUrl}`);
        }

        // Get fresh user record with savedProperties from Atlas
        const user = await User.findById(req.user._id).lean();
        const savedIds = (user?.savedProperties || user?.customerProfile?.savedProperties || []).map(String);

        Home.fetchAll((registeredHome = []) => {
            const favWithDetails = registeredHome.filter(home => 
                savedIds.includes(String(home.id))
            );

            res.render("store/07_favourite-list", {
                favWithDetails: favWithDetails,
                pageTitle: "Your Favourites",
                path: "/favourites",
                currentPage: "favourites",
                user: req.user
            });
        });
    } catch (err) {
        console.error("Error fetching user favourites:", err);
        res.redirect("/");
    }
};

export const getIndex =  (req , res)=>{
    res.render("store/05_index.ejs");
}

export const getHomeDetails = (req , res)=>{
    const homeid = req.params.id ;
    console.log("At home details page" , homeid) ;
    Home.findById(homeid , async (home) =>{
        if(!home){
            console.log("Home not found") ;
            res.redirect("/") ;
            return ;
        }
        let hostUser = null;
        if (home.hostId && mongoose.Types.ObjectId.isValid(home.hostId)) {
            try {
                hostUser = await User.findById(home.hostId).select("name email phone profilePhoto isApproved createdAt").lean();
            } catch (err) {
                console.error("Error fetching host user:", err);
            }
        }
        if (!hostUser) {
            try {
                hostUser = await User.findOne({ role: "host" }).select("name email phone profilePhoto isApproved createdAt").lean();
            } catch (e) {}
        }

        let initialConversation = null;
        if (req.user && hostUser) {
            try {
                initialConversation = await Conversation.findOne({
                    guest: req.user._id,
                    property: String(home.id)
                }).lean();
            } catch (err) {
                console.error("Error fetching initial conversation:", err);
            }
        }

        // Check if current logged-in user has booked this stay (Verified Guest check)
        let userHasBooked = false;
        if (req.user) {
            try {
                const booking = await Booking.findOne({
                    guest: req.user._id,
                    property: String(home.id),
                    status: { $in: ["confirmed", "completed"] }
                }).lean();
                userHasBooked = Boolean(booking);
            } catch (err) {
                console.error("Error checking user booking:", err);
            }
        }

        // Fetch property reviews for guest display
        let propertyReviews = [];
        try {
            propertyReviews = await ReviewStore.getReviewsByPropertyId(home.id);
        } catch (revErr) {
            console.error("Error loading reviews:", revErr);
        }

        let totalRating = 0;
        propertyReviews.forEach(r => { totalRating += (Number(r.rating) || 5); });
        const avgRating = propertyReviews.length > 0 ? (totalRating / propertyReviews.length) : 5.0;

        res.render("store/06_home-details", { 
            home: home, 
            hostUser: hostUser,
            conversation: initialConversation,
            reviews: propertyReviews,
            averageRating: avgRating,
            totalReviews: propertyReviews.length,
            user: req.user,
            userHasBooked: userHasBooked,
            reviewSuccess: req.query.reviewed === "true",
            currentPage: "home-details"
        }) ;
    })   ; 
} 

export const postAddReview = async (req, res) => {
    const homeId = req.params.id;
    const { rating, comment, tag } = req.body;

    // Strict authentication check: Only logged-in users can write a review!
    if (!req.user) {
        const returnUrl = encodeURIComponent(`/homes/${homeId}#reviews`);
        return res.redirect(`/auth/login?returnUrl=${returnUrl}`);
    }

    if (!comment || !comment.trim()) {
        return res.redirect(`/homes/${homeId}#reviews`);
    }

    // Verify whether this guest has booked this property (Verified Stay)
    let isVerifiedStay = false;
    try {
        const booking = await Booking.findOne({
            guest: req.user._id,
            property: String(homeId),
            status: { $in: ["confirmed", "completed"] }
        });
        isVerifiedStay = Boolean(booking);
    } catch (err) {
        console.error("Error verifying booking for review:", err);
    }

    const reviewerName = req.user.name || "Guest";
    const reviewerAvatar = req.user.profilePhoto || "";
    const memberYears = req.user.createdAt ? Math.max(0, new Date().getFullYear() - new Date(req.user.createdAt).getFullYear()) : 0;
    const reviewerTenure = memberYears >= 1 ? `${memberYears} year${memberYears > 1 ? 's' : ''} on StayNest` : "New to StayNest";

    try {
        await ReviewStore.addReview({
            propertyId: String(homeId),
            guestId: req.user._id,
            guestName: reviewerName,
            guestAvatar: reviewerAvatar,
            guestTenure: reviewerTenure,
            isVerifiedStay: isVerifiedStay,
            rating: Number(rating) || 5,
            comment: comment.trim(),
            tag: tag || "Hospitality"
        });
    } catch (err) {
        console.error("Error adding review:", err);
    }

    res.redirect(`/homes/${homeId}?reviewed=true#reviews`);
}; 

export const postSendMessageToHost = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Please log in to chat with the host." });
    }
    const homeId = req.params.id;
    const { messageText } = req.body;
    if (!messageText || !messageText.trim()) {
        return res.status(400).json({ success: false, message: "Message cannot be empty." });
    }

    Home.findById(homeId, async (home) => {
        if (!home) {
            return res.status(404).json({ success: false, message: "Listing not found." });
        }

        try {
            let hostId = home.hostId;
            let hostUser = null;
            if (hostId && mongoose.Types.ObjectId.isValid(hostId)) {
                hostUser = await User.findById(hostId);
            }
            if (!hostUser) {
                hostUser = await User.findOne({ role: "host" });
                if (!hostUser) {
                    hostUser = await User.findOne({});
                }
            }

            if (!hostUser) {
                return res.status(400).json({ success: false, message: "Host account not found." });
            }

            let conversation = await Conversation.findOne({
                guest: req.user._id,
                property: String(home.id)
            });

            if (!conversation) {
                conversation = new Conversation({
                    guest: req.user._id,
                    host: hostUser._id,
                    property: String(home.id),
                    propertyTitle: home.houseName || "StayNest Accommodation",
                    propertyPhoto: home.housePhoto || (home.photos && home.photos[0]) || "",
                    messages: [],
                    lastMessage: "",
                });
            }

            const newMsg = {
                sender: req.user._id,
                senderRole: "guest",
                text: messageText.trim(),
                read: false,
                createdAt: new Date(),
            };

            conversation.messages.push(newMsg);
            conversation.lastMessage = messageText.trim();
            conversation.lastMessageAt = new Date();
            await conversation.save();

            // Real-time Socket.io broadcast to Host and conversation room
            try {
                io.to(`conversation_${conversation._id}`).emit("new_message", {
                    conversationId: String(conversation._id),
                    message: newMsg,
                    sender: {
                        _id: req.user._id,
                        name: req.user.name,
                        role: "guest",
                    },
                });
                io.to(`user_${hostUser._id}`).emit("incoming_message_notification", {
                    conversationId: String(conversation._id),
                    text: newMsg.text,
                    senderName: req.user.name,
                    propertyTitle: home.houseName,
                });
            } catch (sockErr) {
                console.error("[Socket] Error broadcasting guest message:", sockErr);
            }

            return res.json({
                success: true,
                message: "Message sent to host successfully!",
                newMessage: newMsg,
                conversationId: conversation._id,
            });
        } catch (err) {
            console.error("Error sending guest message:", err);
            return res.status(500).json({ success: false, message: "Failed to send message." });
        }
    });
};

export const getPropertyMessages = async (req, res) => {
    if (!req.user) {
        return res.json({ success: false, messages: [], isLoggedIn: false });
    }
    const homeId = req.params.id;
    try {
        const conversation = await Conversation.findOne({
            guest: req.user._id,
            property: String(homeId)
        }).lean();

        return res.json({
            success: true,
            isLoggedIn: true,
            messages: conversation ? conversation.messages : [],
            conversationId: conversation ? conversation._id : null
        });
    } catch (err) {
        console.error("Error fetching property messages:", err);
        return res.status(500).json({ success: false, messages: [] });
    }
}; 

export const postAddToFavourite = async (req, res) => {
    try {
        if (!req.user) {
            if (req.headers["accept"]?.includes("application/json") || req.xhr) {
                return res.status(401).json({ success: false, redirectUrl: "/auth/login?returnUrl=/favourite-list" });
            }
            return res.redirect("/auth/login?returnUrl=/favourite-list");
        }

        const homeId = String(req.body.id || "");
        if (!homeId) {
            return res.redirect("back");
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.redirect("/auth/login");
        }

        if (!Array.isArray(user.savedProperties)) {
            user.savedProperties = [];
        }

        const homeIdStr = String(homeId);
        const index = user.savedProperties.map(String).indexOf(homeIdStr);

        let isSaved = false;
        if (index > -1) {
            // Already in favourites -> Toggle OFF (remove)
            user.savedProperties.splice(index, 1);
            isSaved = false;
        } else {
            // Not in favourites -> Toggle ON (add)
            user.savedProperties.push(homeIdStr);
            isSaved = true;
        }

        // Also sync to customerProfile
        if (user.customerProfile) {
            user.customerProfile.savedProperties = user.savedProperties;
        }

        await user.save();

        if (req.headers["accept"]?.includes("application/json") || req.xhr) {
            return res.json({ success: true, isSaved: isSaved, totalSaved: user.savedProperties.length });
        }

        res.redirect("/favourite-list");
    } catch (err) {
        console.error("Error in postAddToFavourite:", err);
        res.redirect("/favourite-list");
    }
};