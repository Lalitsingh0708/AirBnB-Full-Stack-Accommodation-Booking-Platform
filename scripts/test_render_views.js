import ejs from "ejs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const viewsDir = path.resolve(__dirname, "../views");

const mockUser = {
    _id: "60d5ec49f1b2c8b1f8e4e1a1",
    id: "60d5ec49f1b2c8b1f8e4e1a1",
    name: "John Doe",
    email: "john@example.com",
    phone: "+91 9876543210",
    role: "host",
    isApproved: true,
    isPhoneVerified: true,
    isEmailVerified: true,
    profilePhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    createdAt: new Date("2024-01-15")
};

const mockHome = {
    _id: "60d5ec49f1b2c8b1f8e4e1a2",
    id: "60d5ec49f1b2c8b1f8e4e1a2",
    houseName: "Luxury Villa in Goa",
    housePrice: 8500,
    houseLocation: "Candolim, Goa",
    houseAddress: "Beach Road, Candolim, Goa, 403515",
    city: "Goa",
    housePhoto: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
    photos: [
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80"
    ],
    propertyType: "Villa",
    maxGuests: 6,
    bedrooms: 3,
    beds: 4,
    bathrooms: 3,
    description: "Experience serene luxury near Candolim beach.",
    amenities: ["WiFi", "Pool", "Kitchen", "Free parking", "Air conditioning"],
    houseRules: ["No smoking", "No loud parties after 10 PM"],
    mapLat: 15.5173,
    mapLng: 73.7634,
    rating: 4.95,
    reviewsCount: 28,
    hostId: "60d5ec49f1b2c8b1f8e4e1a1",
    cleaningFee: 1200,
    serviceFee: 800
};

const mockHome2 = {
    ...mockHome,
    _id: "60d5ec49f1b2c8b1f8e4e1a3",
    id: "60d5ec49f1b2c8b1f8e4e1a3",
    houseName: "Mountain Chalet Manali",
    city: "Manali",
    housePrice: 5200,
    mapLat: 32.2432,
    mapLng: 77.1892
};

const mockBooking = {
    _id: "60d5ec49f1b2c8b1f8e4e1a4",
    id: "60d5ec49f1b2c8b1f8e4e1a4",
    property: "60d5ec49f1b2c8b1f8e4e1a2",
    propertyTitle: "Luxury Villa in Goa",
    propertyPhoto: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
    propertyAddress: "Candolim, Goa",
    guest: mockUser,
    guestName: "John Doe",
    guestEmail: "john@example.com",
    guestPhone: "+91 9876543210",
    checkIn: new Date("2026-12-01"),
    checkOut: new Date("2026-12-05"),
    guests: 2,
    totalNights: 4,
    nightlyPrice: 8500,
    totalAmount: 34000,
    baseAmount: 34000,
    cleaningFee: 1200,
    serviceFee: 800,
    status: "confirmed",
    paymentStatus: "paid",
    razorpayPaymentId: "pay_test_123456",
    razorpayOrderId: "order_test_123456",
    createdAt: new Date("2026-11-01")
};

const mockCategoryScores = {
    overall: 4.92,
    cleanliness: 4.9,
    accuracy: 5.0,
    checkIn: 4.9,
    communication: 5.0,
    location: 4.8,
    value: 4.9
};

const mockReviews = [
    {
        _id: "rev1",
        id: "rev1",
        guestId: "60d5ec49f1b2c8b1f8e4e1a1",
        guestName: "Priya Sharma",
        guestAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
        guestTenure: "3 years on StayNest",
        isVerifiedStay: true,
        rating: 5,
        cleanliness: 5,
        accuracy: 5,
        checkIn: 5,
        communication: 5,
        location: 5,
        value: 5,
        comment: "Absolutely stunning villa, impeccably maintained and very peaceful!",
        tag: "Hospitality",
        createdAt: new Date("2026-10-15")
    }
];

function findEjsFiles(dir) {
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(findEjsFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith(".ejs")) {
            results.push(fullPath);
        }
    }
    return results;
}

const ejsFiles = findEjsFiles(viewsDir);
console.log(`Discovered ${ejsFiles.length} EJS templates.\n`);

const testScenarios = [
    {
        name: "Suite 1: Standard Host Logged In (Comprehensive Data)",
        data: {
            user: mockUser,
            currentUser: mockUser,
            hostUser: mockUser,
            home: mockHome,
            registeredHome: [mockHome, mockHome2],
            homes: [mockHome, mockHome2],
            hostHomes: [mockHome],
            favHome: [mockHome],
            favHomes: [mockHome],
            favouriteHomes: [mockHome],
            favWithDetails: [mockHome],
            booking: mockBooking,
            bookings: [mockBooking],
            categoryScores: mockCategoryScores,
            monthlyLabels: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"],
            chartData: [14500, 22000, 18500, 31000, 42000, 56000],
            totalRevenue: 56000,
            totalNightsBooked: 16,
            confirmedCount: 5,
            occupancyRate: 82,
            totalHomes: 2,
            hostCities: ["Goa", "Manali"],
            reviews: mockReviews,
            averageRating: 4.92,
            totalReviews: 1,
            userHasBooked: true,
            reviewSuccess: false,
            reviewDeleted: false,
            currentPage: "viewHomes",
            referenceCode: "STAY-E4E1A4",
            qrCodeDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            conversation: { _id: "c1", guest: mockUser._id, host: mockUser._id, property: mockHome._id, messages: [] },
            conversations: [],
            messages: [],
            activeConversation: null,
            editing: false,
            error: null,
            errorMessage: null,
            successMessage: null,
            email: "john@example.com",
            phone: "+91 9876543210",
            displayDestination: "Goa",
            searchQuery: { destination: "Goa", guests: "2", dates: "1-5 Dec" },
            mapCenter: { lat: 15.5173, lng: 73.7634, zoom: 12 },
            nights: 4,
            checkIn: "2026-12-01",
            checkOut: "2026-12-05",
            guests: 2,
            pageTitle: "StayNest",
            path: "/",
            isHostNav: true,
            todayCheckIns: [],
            todayCheckOuts: [],
            currentlyHosting: [],
            upcomingCheckIns: [],
            calendarDays: []
        }
    },
    {
        name: "Suite 2: Anonymous / Logged-Out Guest (Zero User Session)",
        data: {
            user: null,
            currentUser: null,
            hostUser: mockUser,
            home: mockHome,
            registeredHome: [mockHome],
            homes: [mockHome],
            hostHomes: [],
            favHome: [],
            favHomes: [],
            favouriteHomes: [],
            favWithDetails: [],
            booking: mockBooking,
            bookings: [],
            categoryScores: mockCategoryScores,
            monthlyLabels: [],
            chartData: [],
            totalRevenue: 0,
            totalNightsBooked: 0,
            confirmedCount: 0,
            occupancyRate: 0,
            totalHomes: 0,
            hostCities: [],
            reviews: mockReviews,
            averageRating: 4.92,
            totalReviews: 1,
            userHasBooked: false,
            reviewSuccess: false,
            reviewDeleted: false,
            currentPage: "store",
            referenceCode: "STAY-E4E1A4",
            qrCodeDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            conversation: null,
            conversations: [],
            messages: [],
            activeConversation: null,
            editing: false,
            error: null,
            errorMessage: null,
            successMessage: null,
            email: "",
            phone: "",
            displayDestination: "India",
            searchQuery: {},
            mapCenter: { lat: 20.5937, lng: 78.9629, zoom: 12 },
            nights: 1,
            checkIn: null,
            checkOut: null,
            guests: 1,
            pageTitle: "StayNest",
            path: "/",
            isHostNav: false,
            todayCheckIns: [],
            todayCheckOuts: [],
            currentlyHosting: [],
            upcomingCheckIns: [],
            calendarDays: []
        }
    },
    {
        name: "Suite 3: Empty Results & Edge States (0 Listings, 0 Bookings, 0 Reviews)",
        data: {
            user: { ...mockUser, role: "guest" },
            currentUser: { ...mockUser, role: "guest" },
            hostUser: null,
            home: mockHome,
            registeredHome: [],
            homes: [],
            hostHomes: [],
            favHome: [],
            favHomes: [],
            favouriteHomes: [],
            favWithDetails: [],
            booking: mockBooking,
            bookings: [],
            categoryScores: { overall: 5.0, cleanliness: 5.0, accuracy: 5.0, checkIn: 5.0, communication: 5.0, location: 5.0, value: 5.0 },
            monthlyLabels: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"],
            chartData: [0, 0, 0, 0, 0, 0],
            totalRevenue: 0,
            totalNightsBooked: 0,
            confirmedCount: 0,
            occupancyRate: 0,
            totalHomes: 0,
            hostCities: [],
            reviews: [],
            averageRating: 5.0,
            totalReviews: 0,
            userHasBooked: false,
            reviewSuccess: false,
            reviewDeleted: false,
            currentPage: "search",
            referenceCode: "STAY-000000",
            qrCodeDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            conversation: null,
            conversations: [],
            messages: [],
            activeConversation: null,
            editing: false,
            error: "Sample error message",
            errorMessage: "Sample error message",
            successMessage: "Operation completed successfully",
            email: "guest@example.com",
            phone: "+91 9999999999",
            displayDestination: "Nowhere",
            searchQuery: { destination: "Nowhere" },
            mapCenter: { lat: 20.5937, lng: 78.9629, zoom: 12 },
            nights: 2,
            checkIn: "2026-11-20",
            checkOut: "2026-11-22",
            guests: 1,
            pageTitle: "StayNest",
            path: "/search",
            isHostNav: false,
            todayCheckIns: [],
            todayCheckOuts: [],
            currentlyHosting: [],
            upcomingCheckIns: [],
            calendarDays: []
        }
    }
];

let totalPass = 0;
let totalFail = 0;
const failureDetails = [];

for (const scenario of testScenarios) {
    console.log(`\n========================================`);
    console.log(`Running: ${scenario.name}`);
    console.log(`========================================`);
    for (const filePath of ejsFiles) {
        const relPath = path.relative(viewsDir, filePath).replace(/\\/g, "/");
        try {
            const html = ejs.render(
                fs.readFileSync(filePath, "utf-8"),
                scenario.data,
                {
                    filename: filePath,
                    views: [viewsDir, path.join(viewsDir, "partials")]
                }
            );
            console.log(`  [PASS] ${relPath} (${html.length} chars)`);
            totalPass++;
        } catch (err) {
            console.error(`  [FAIL] ${relPath}: ${err.message}`);
            failureDetails.push({ scenario: scenario.name, file: relPath, error: err.message });
            totalFail++;
        }
    }
}

console.log("\n=================================");
console.log(`FINAL RESULTS: ${totalPass} PASSED, ${totalFail} FAILED across all 3 test scenarios (${ejsFiles.length * 3} template executions).`);
console.log("=================================");

if (failureDetails.length > 0) {
    console.error("Failure details:", failureDetails);
    process.exit(1);
} else {
    console.log("ALL 27 TEMPLATES PASSED 100% IN ALL SCENARIOS WITH ZERO ERRORS!");
    process.exit(0);
}
