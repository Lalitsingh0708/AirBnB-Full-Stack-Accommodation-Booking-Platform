import { Home } from "../models/01_homesModel.js";

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
            currentPage: "host",
            user: req.user,
        });
    });
};

// GET /host/view-home - Manage Listings Table/Grid (Isolated per host)
export const getHostHomesList = (req, res) => {
    Home.fetchAll((homes) => {
        const userId = req.user ? String(req.user._id) : null;
        // Strict Host Isolation
        const hostHomes = homes.filter(h => String(h.hostId) === userId);

        res.render("host/04_HostViewHomes.ejs", {
            registeredHome: hostHomes,
            currentPage: "host",
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

    // Build clean comprehensive location
    let fullLocation = (homeAddress || "").trim();
    if (city && !fullLocation.toLowerCase().includes(city.toLowerCase())) {
        fullLocation = `${fullLocation}, ${city}`;
    }
    if (state && !fullLocation.toLowerCase().includes(state.toLowerCase())) {
        fullLocation = `${fullLocation}, ${state}`;
    }

    const home = new Home(
        homeName || "Untitled Luxury Stay",
        homePrice || "5000",
        housePhoto || "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&auto=format&fit=crop&q=80",
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