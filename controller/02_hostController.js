import { Home } from "../models/01_homesModel.js";
import Booking from "../models/Booking.js";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";

// GET /host - Host Overview Dashboard (Isolated per host)
export const getHostDashboard = (req, res) => {
    Home.fetchAll((homes) => {
        const userId = req.user ? String(req.user._id) : null;
        // Strict Host Isolation: only show properties owned by this logged-in host
        const hostHomes = homes.filter(h => String(h.hostId) === userId);

        // Calculate unique cities host has properties in
        const hostCities = [...new Set(hostHomes.map(h => h.city || h.houseAddress.split(',').pop().trim()).filter(Boolean))];

        res.render("host/02_hostIndex.ejs", {
            hostHomes,
            totalHomes: hostHomes.length,
            hostCities,
            currentPage: "host-dashboard",
            isHostNav: true,
            user: req.user,
        });
    });
};

// GET /host/today - Today Reservations & Overview (Matching Airbnb Host Screenshot)
export const getHostToday = async (req, res) => {
    Home.fetchAll(async (homes) => {
        const userId = req.user ? String(req.user._id) : null;
        const hostHomes = homes.filter(h => String(h.hostId) === userId);

        let bookings = [];
        try {
            if (userId) {
                const hostHomeIds = new Set(hostHomes.map(h => String(h.id)));
                const allBookings = await Booking.find().populate('guest').sort({ checkIn: 1 }).lean();
                bookings = allBookings.filter(b => hostHomeIds.has(String(b.property)));
            }
        } catch (e) {
            bookings = [];
        }

        res.render("host/today.ejs", {
            hostHomes,
            bookings,
            currentPage: "host-today",
            isHostNav: true,
            user: req.user,
        });
    });
};

// GET /host/calendar - Pricing & Availability Calendar
export const getHostCalendar = (req, res) => {
    Home.fetchAll((homes) => {
        const userId = req.user ? String(req.user._id) : null;
        const hostHomes = homes.filter(h => String(h.hostId) === userId);

        res.render("host/calendar.ejs", {
            hostHomes,
            currentPage: "host-calendar",
            isHostNav: true,
            user: req.user,
        });
    });
};

// GET /host/messages - Host Inbox & Guest Messages (Real MongoDB Conversations)
export const getHostMessages = async (req, res) => {
    const userId = req.user ? req.user._id : null;
    let conversations = [];
    let activeConversation = null;

    try {
        if (userId) {
            conversations = await Conversation.find({ host: userId })
                .populate('guest', 'name email profilePhoto')
                .sort({ lastMessageAt: -1 })
                .lean();

            const selectedId = req.query.c;
            if (selectedId) {
                activeConversation = conversations.find(c => String(c._id) === String(selectedId)) || null;
            } else if (conversations.length > 0) {
                activeConversation = conversations[0];
            }
        }
    } catch (err) {
        console.error("Error fetching host conversations:", err);
        conversations = [];
    }

    res.render("host/messages.ejs", {
        conversations,
        activeConversation,
        currentPage: "host-messages",
        isHostNav: true,
        user: req.user,
    });
};

// POST /host/messages/reply - Host sends a real reply to guest
export const postHostMessageReply = async (req, res) => {
    const userId = req.user ? req.user._id : null;
    const { conversationId, messageText } = req.body;

    if (!userId || !conversationId || !messageText || !messageText.trim()) {
        return res.redirect("/host/messages");
    }

    try {
        const conversation = await Conversation.findOne({ _id: conversationId, host: userId });
        if (conversation) {
            const newMsg = {
                sender: userId,
                senderRole: "host",
                text: messageText.trim(),
                read: false,
                createdAt: new Date(),
            };
            conversation.messages.push(newMsg);
            conversation.lastMessage = messageText.trim();
            conversation.lastMessageAt = new Date();
            await conversation.save();
        }
        res.redirect(`/host/messages?c=${conversationId}`);
    } catch (err) {
        console.error("Error saving host reply message:", err);
        res.redirect("/host/messages");
    }
};

// GET /host/verify-phone - Dedicated Phone Verification Page (Matching Airbnb Host Design)
export const getVerifyPhonePage = (req, res) => {
    res.render("host/verifyPhone.ejs", {
        currentPage: "host-today",
        isHostNav: true,
        user: req.user,
    });
};

// POST /host/send-phone-otp - Generate & Dispatch Real OTP (Random 4-Digit Code)
export const postSendPhoneOtp = async (req, res) => {
    const userId = req.user ? req.user._id : null;
    const { phone } = req.body;

    if (!userId || !phone || !phone.trim()) {
        return res.status(400).json({ success: false, message: "Phone number is required." });
    }

    try {
        // Generate real random 4-digit code (e.g. 7492)
        const realOtp = Math.floor(1000 + Math.random() * 9000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

        await User.findByIdAndUpdate(userId, {
            phoneOtp: {
                code: realOtp,
                expiresAt: expiresAt,
            },
        });

        console.log(`\n========================================================`);
        console.log(`[StayNest SMS Gateway] Real OTP Generated:`);
        console.log(`To Phone Number : ${phone.trim()}`);
        console.log(`Verification OTP: >>> ${realOtp} <<<`);
        console.log(`Expires At      : ${expiresAt.toLocaleTimeString()}`);
        console.log(`========================================================\n`);

        return res.json({
            success: true,
            message: `Verification code sent to ${phone.trim()}`,
            realOtp: realOtp, // Delivered to frontend for simulated push alert / dev verification
            expiresInSeconds: 300
        });
    } catch (err) {
        console.error("Error generating phone OTP:", err);
        return res.status(500).json({ success: false, message: "Could not send OTP. Please try again." });
    }
};

// POST /host/verify-phone-otp - Validate Real OTP
export const postVerifyPhoneOtp = async (req, res) => {
    const userId = req.user ? req.user._id : null;
    const { phone, otp } = req.body;

    if (!userId || !phone || !otp) {
        return res.status(400).json({ success: false, message: "Phone number and OTP are required." });
    }

    try {
        const user = await User.findById(userId);
        if (!user || !user.phoneOtp || !user.phoneOtp.code) {
            return res.status(400).json({ success: false, message: "No active OTP found. Please request a new code." });
        }

        // Check expiration
        if (new Date() > new Date(user.phoneOtp.expiresAt)) {
            return res.status(400).json({ success: false, message: "OTP has expired. Please request a new code." });
        }

        // Check code match
        if (user.phoneOtp.code !== String(otp).trim()) {
            return res.status(400).json({ success: false, message: "Incorrect OTP entered. Please try again." });
        }

        // Valid OTP -> Save verified phone
        user.phone = phone.trim();
        user.isPhoneVerified = true;
        user.phoneOtp = { code: null, expiresAt: null };
        await user.save();

        console.log(`[StayNest Phone Verified] User ${user.email} verified phone: ${phone.trim()}`);

        return res.json({
            success: true,
            message: "Phone number verified successfully!",
            phone: user.phone
        });
    } catch (err) {
        console.error("Error verifying phone OTP:", err);
        return res.status(500).json({ success: false, message: "Verification failed. Please try again." });
    }
};

// POST /host/verify-phone - Fallback direct save
export const postVerifyPhone = async (req, res) => {
    const userId = req.user ? req.user._id : null;
    const { phone } = req.body;

    if (!userId || !phone || !phone.trim()) {
        return res.status(400).json({ success: false, message: "Phone number is required." });
    }

    try {
        await User.findByIdAndUpdate(userId, { phone: phone.trim(), isPhoneVerified: true });
        return res.json({ success: true, message: "Phone number confirmed successfully!", phone: phone.trim() });
    } catch (err) {
        console.error("Error verifying host phone:", err);
        return res.status(500).json({ success: false, message: "Could not save phone number." });
    }
};

// GET /host/view-home - Manage Listings Table/Grid (Isolated per host)
export const getHostHomesList = (req, res) => {
    Home.fetchAll((homes) => {
        const userId = req.user ? String(req.user._id) : null;
        // Strict Host Isolation
        const hostHomes = homes.filter(h => String(h.hostId) === userId);

        res.render("host/04_HostViewHomes.ejs", {
            registeredHome: hostHomes,
            currentPage: "host-listings",
            isHostNav: true,
            user: req.user,
        });
    });
};

// GET /host/add-home - Multi-Step Airbnb-Style Listing Wizard
export const getAddHome = (req, res) => {
    res.render("host/03_addHome.ejs", {
        currentPage: "host",
        user: req.user,
    });
};

// POST /host/add-home - Process Multi-Step Listing Submission
export const postAddHome = (req, res) => {
    const {
        homeName,
        homePrice,
        housePhoto,
        homeAddress,
        city = "",
        state = "",
        propertyType = "House",
        placeType = "An entire place",
        latitude = 28.6139,
        longitude = 77.2090,
        showPreciseLocation = true,
        description = "",
        maxGuests = 4,
        bedrooms = 2,
        beds = 2,
        bathrooms = 2,
        amenities,
        highlights,
        photos,
        bookingSettings = "approve_first_5",
        weekendPrice,
        weekendAdjustment = 6,
        discounts,
        discountNewListing,
        discountLastMinute,
        discountWeekly,
        discountMonthly,
        safetyDetails,
        securityCameras,
        noiseMonitors,
        weapons,
        residentialAddress,
        residentialCountry,
        residentialFlat,
        residentialStreet,
        residentialLandmark,
        residentialDistrict,
        residentialCity,
        residentialState,
        residentialPinCode,
    } = req.body;

    // Normalize amenities
    let amenitiesList = [];
    if (Array.isArray(amenities)) {
        amenitiesList = amenities;
    } else if (typeof amenities === "string" && amenities.trim()) {
        amenitiesList = amenities.split(',').map(s => s.trim()).filter(Boolean);
    } else {
        amenitiesList = ["wifi", "ac", "parking"];
    }

    // Normalize highlights
    let highlightsList = [];
    if (Array.isArray(highlights)) {
        highlightsList = highlights;
    } else if (typeof highlights === "string" && highlights.trim()) {
        highlightsList = highlights.split(',').map(s => s.trim()).filter(Boolean);
    }

    // Normalize photos
    let photosList = [];
    if (Array.isArray(photos)) {
        photosList = photos;
    } else if (typeof photos === "string" && photos.trim()) {
        try {
            photosList = JSON.parse(photos);
        } catch (e) {
            photosList = photos.split(',').map(s => s.trim()).filter(Boolean);
        }
    }
    if (!photosList.length && housePhoto) {
        photosList = [housePhoto];
    }

    // Normalize discounts
    let discountsObj = {
        newListingPromotion: true,
        lastMinuteDiscount: 7,
        weeklyDiscount: 10,
        monthlyDiscount: 20,
    };
    if (typeof discounts === "string" && discounts.trim()) {
        try {
            discountsObj = JSON.parse(discounts);
        } catch (e) {
            // keep default
        }
    } else if (typeof discounts === "object" && discounts !== null) {
        discountsObj = discounts;
    } else if (discountNewListing !== undefined || discountLastMinute !== undefined) {
        discountsObj = {
            newListingPromotion: discountNewListing === 'true' || discountNewListing === true || discountNewListing === 'on',
            lastMinuteDiscount: Number(discountLastMinute) !== undefined ? Number(discountLastMinute) : 7,
            weeklyDiscount: Number(discountWeekly) !== undefined ? Number(discountWeekly) : 10,
            monthlyDiscount: Number(discountMonthly) !== undefined ? Number(discountMonthly) : 20,
        };
    }

    // Normalize safetyDetails
    let safetyDetailsObj = {
        securityCameras: false,
        noiseMonitors: false,
        weapons: false,
    };
    if (typeof safetyDetails === "string" && safetyDetails.trim()) {
        try {
            safetyDetailsObj = JSON.parse(safetyDetails);
        } catch (e) {
            // keep default
        }
    } else if (typeof safetyDetails === "object" && safetyDetails !== null) {
        safetyDetailsObj = safetyDetails;
    } else {
        safetyDetailsObj = {
            securityCameras: securityCameras === 'true' || securityCameras === true || securityCameras === 'on',
            noiseMonitors: noiseMonitors === 'true' || noiseMonitors === true || noiseMonitors === 'on',
            weapons: weapons === 'true' || weapons === true || weapons === 'on',
        };
    }

    // Normalize residentialAddress
    let residentialAddressObj = {
        country: "India",
        flat: "",
        street: "",
        landmark: "",
        district: "",
        city: "",
        state: "",
        pinCode: "",
    };
    if (typeof residentialAddress === "string" && residentialAddress.trim()) {
        try {
            residentialAddressObj = JSON.parse(residentialAddress);
        } catch (e) {
            // keep default
        }
    } else if (typeof residentialAddress === "object" && residentialAddress !== null) {
        residentialAddressObj = residentialAddress;
    } else {
        residentialAddressObj = {
            country: residentialCountry || "India",
            flat: (residentialFlat || "").trim(),
            street: (residentialStreet || "").trim(),
            landmark: (residentialLandmark || "").trim(),
            district: (residentialDistrict || "").trim(),
            city: (residentialCity || "").trim(),
            state: (residentialState || "").trim(),
            pinCode: (residentialPinCode || "").trim(),
        };
    }

    // Build clean comprehensive location
    let fullLocation = (homeAddress || "").trim();
    if (city && !fullLocation.toLowerCase().includes(city.toLowerCase())) {
        fullLocation = `${fullLocation}, ${city}`;
    }
    if (state && !fullLocation.toLowerCase().includes(state.toLowerCase())) {
        fullLocation = `${fullLocation}, ${state}`;
    }

    const calculatedBasePrice = Number(homePrice) || 2321;
    const calculatedWeekendPct = Number(weekendAdjustment) || 6;
    const calculatedWeekendPrice = Number(weekendPrice) || Math.round(calculatedBasePrice * (1 + calculatedWeekendPct / 100));

    const home = new Home(
        homeName || "Untitled Luxury Stay",
        calculatedBasePrice,
        housePhoto || (photosList[0] || "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&auto=format&fit=crop&q=80"),
        fullLocation || city || "India",
        {
            city: city.trim(),
            state: state.trim(),
            hostId: req.user ? String(req.user._id) : null,
            hostName: req.user ? req.user.name : "StayNest Host",
            propertyType,
            placeType,
            latitude: Number(latitude) || 28.6139,
            longitude: Number(longitude) || 77.2090,
            showPreciseLocation: showPreciseLocation === 'true' || showPreciseLocation === true || showPreciseLocation === '1',
            description,
            maxGuests: Number(maxGuests) || 4,
            bedrooms: Number(bedrooms) || 2,
            beds: Number(beds) || 2,
            bathrooms: Number(bathrooms) || 2,
            amenities: amenitiesList,
            highlights: highlightsList,
            photos: photosList,
            bookingSettings: bookingSettings || "approve_first_5",
            weekendAdjustment: calculatedWeekendPct,
            weekendPrice: calculatedWeekendPrice,
            discounts: discountsObj,
            safetyDetails: safetyDetailsObj,
            residentialAddress: residentialAddressObj,
        }
    );

    home.save((err) => {
        if (err) {
            console.error("Error saving listing:", err);
        }
        res.redirect("/host/view-home");
    });
};

// GET /host/edit/:id - Edit Listing Form (Only owner allowed)
export const getEditHome = (req, res) => {
    const homeId = req.params.id;
    const userId = req.user ? String(req.user._id) : null;

    Home.findById(homeId, (home) => {
        if (!home) {
            console.log("Listing not found for editing:", homeId);
            return res.redirect("/host/view-home");
        }

        // Ownership check
        if (home.hostId && String(home.hostId) !== userId) {
            console.log("Unauthorized edit attempt by user:", userId, "on home:", homeId);
            return res.redirect("/host/view-home");
        }

        res.render("host/01_editHome.ejs", {
            home,
            currentPage: "host",
            user: req.user,
        });
    });
};

// POST /host/edit/:id or POST /host/edit-home - Save Listing Edits
export const postEditHome = (req, res) => {
    const homeId = req.params.id || req.body.id;
    const userId = req.user ? String(req.user._id) : null;

    Home.findById(homeId, (home) => {
        if (!home) {
            return res.redirect("/host/view-home");
        }

        // Ownership check
        if (home.hostId && String(home.hostId) !== userId) {
            console.log("Unauthorized edit POST attempt by user:", userId);
            return res.redirect("/host/view-home");
        }

        const {
            homeName,
            homePrice,
            housePhoto,
            homeAddress,
            city,
            state,
            propertyType,
            placeType,
            latitude,
            longitude,
            showPreciseLocation,
            description,
            maxGuests,
            bedrooms,
            beds,
            bathrooms,
            amenities,
        } = req.body;

        let amenitiesList = undefined;
        if (amenities !== undefined) {
            if (Array.isArray(amenities)) {
                amenitiesList = amenities;
            } else if (typeof amenities === "string" && amenities.trim()) {
                amenitiesList = [amenities];
            } else {
                amenitiesList = [];
            }
        }

        Home.updateById(
            homeId,
            {
                houseName: homeName,
                housePrice: homePrice,
                housePhoto: housePhoto,
                houseAddress: homeAddress,
                city: city,
                state: state,
                propertyType,
                placeType,
                latitude: latitude !== undefined ? Number(latitude) : undefined,
                longitude: longitude !== undefined ? Number(longitude) : undefined,
                showPreciseLocation: showPreciseLocation !== undefined ? (showPreciseLocation === 'true' || showPreciseLocation === true || showPreciseLocation === '1') : undefined,
                description,
                maxGuests: maxGuests ? Number(maxGuests) : undefined,
                bedrooms: bedrooms ? Number(bedrooms) : undefined,
                beds: beds ? Number(beds) : undefined,
                bathrooms: bathrooms ? Number(bathrooms) : undefined,
                amenities: amenitiesList,
            },
            (err) => {
                if (err) {
                    console.error("Error updating listing:", err);
                }
                res.redirect("/host/view-home");
            }
        );
    });
};

// POST /host/delete/:id - Delete Listing (Only owner allowed)
export const postDeleteHome = (req, res) => {
    const homeId = req.params.id;
    const userId = req.user ? String(req.user._id) : null;

    Home.findById(homeId, (home) => {
        if (!home) {
            return res.redirect("/host/view-home");
        }

        // Ownership check
        if (home.hostId && String(home.hostId) !== userId) {
            console.log("Unauthorized delete attempt by user:", userId);
            return res.redirect("/host/view-home");
        }

        Home.deleteById(homeId, (err) => {
            if (err) {
                console.error("Error deleting listing:", err);
            }
            res.redirect("/host/view-home");
        });
    });
};