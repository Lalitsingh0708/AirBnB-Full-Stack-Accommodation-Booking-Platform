import express from "express";
import QRCode from "qrcode";
import ejs from "ejs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const viewsDir = path.resolve(__dirname, "../views");

// Import all routers
import userRouter from "../routes/01_router.js";
import hostRouter from "../routes/02_hostRouter.js";
import authRouter from "../routes/authRouter.js";

// Import controllers
import * as storeController from "../controller/01_storeController.js";
import * as hostController from "../controller/02_hostController.js";
import * as authController from "../controller/authController.js";

// Import models
import ReviewModel, { ReviewStore } from "../models/Review.js";

console.log("=================================================");
console.log("STAYNEST AIRBNB - END-TO-END AUDIT & VERIFICATION");
console.log("=================================================\n");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  [PASS] ${message}`);
    } else {
        failedTests++;
        console.error(`  [FAIL] ${message}`);
    }
}

// ─────────────────────────────────────────────────────────────
// 1. ROUTE AUDIT: Audit all routes and their callback handlers
// ─────────────────────────────────────────────────────────────
console.log("1. AUDITING ALL ROUTES & HANDLERS...");

function extractRoutes(routerName, router) {
    const routes = [];
    for (const layer of router.stack) {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
            const routePath = layer.route.path;
            const handlers = layer.route.stack.map(s => s.handle);
            routes.push({ routerName, methods, path: routePath, handlers });
        }
    }
    return routes;
}

const allRoutes = [
    ...extractRoutes("userRouter", userRouter),
    ...extractRoutes("hostRouter", hostRouter),
    ...extractRoutes("authRouter", authRouter),
];

console.log(`Total routes discovered across all 3 routers: ${allRoutes.length}`);

for (const r of allRoutes) {
    const routeDesc = `${r.routerName} -> [${r.methods.join(",")}] ${r.path}`;
    const allHandlersValid = r.handlers.length > 0 && r.handlers.every(h => typeof h === "function");
    assert(allHandlersValid, `${routeDesc} has ${r.handlers.length} valid function handler(s)`);
}

// Check specific newly added routes exist
const voucherRoute = allRoutes.find(r => r.path === "/bookings/:id/voucher" && r.methods.includes("GET"));
assert(voucherRoute !== undefined, "Route GET /bookings/:id/voucher is registered in userRouter");

const deleteReviewRoute = allRoutes.find(r => r.path === "/homes/:id/review/:reviewId/delete" && r.methods.includes("POST"));
assert(deleteReviewRoute !== undefined, "Route POST /homes/:id/review/:reviewId/delete is registered in userRouter");

// ─────────────────────────────────────────────────────────────
// 2. CONTROLLER FUNCTIONS AUDIT: Check exports and signatures
// ─────────────────────────────────────────────────────────────
console.log("\n2. AUDITING CONTROLLER EXPORTS & SIGNATURES...");

const requiredStoreExports = [
    "postAddToFavourite", "postAddHome", "getSearchResults", "getHomeDetails",
    "getHomesList", "getBookings", "getBookingVoucher", "getFavroutelist",
    "getIndex", "postSendMessageToHost", "getPropertyMessages", "getCheckout",
    "postCreateBooking", "postCancelBooking", "postAddReview", "postDeleteReview",
    "postCreateRazorpayOrder", "postVerifyRazorpayPayment"
];

for (const fnName of requiredStoreExports) {
    const fn = storeController[fnName];
    assert(typeof fn === "function", `storeController.${fnName} exists and is a function`);
}

const requiredHostExports = [
    "getHostDashboard", "getHostToday", "getHostCalendar", "getHostHomesList",
    "getHostMessages", "postHostMessageReply", "getVerifyPhonePage",
    "postSendPhoneOtp", "postVerifyPhoneOtp", "postVerifyPhone", "getAddHome",
    "postAddHome", "getEditHome", "postEditHome", "postDeleteHome"
];

for (const fnName of requiredHostExports) {
    const fn = hostController[fnName];
    assert(typeof fn === "function", `hostController.${fnName} exists and is a function`);
}

const requiredAuthExports = [
    "getRegister", "getLogin", "postRegister", "postLogin", "postLogout",
    "getVerifyEmail", "postVerifyEmail", "postResendOtp", "getGoogleAuth", "getGoogleCallback"
];

for (const fnName of requiredAuthExports) {
    const fn = authController[fnName];
    assert(typeof fn === "function", `authController.${fnName} exists and is a function`);
}

// ─────────────────────────────────────────────────────────────
// 3. FEATURE 1: Verified Reviews & Category Scorecard
// ─────────────────────────────────────────────────────────────
console.log("\n3. AUDITING FEATURE 1: Verified Reviews & Category Scorecard...");

const sampleReviews = [
    {
        rating: 5,
        cleanliness: 5,
        accuracy: 4,
        checkIn: 5,
        communication: 5,
        location: 4,
        value: 5
    },
    {
        rating: 4,
        cleanliness: 4,
        accuracy: 4,
        checkIn: 4,
        communication: 5,
        location: 5,
        value: 4
    }
];

const scores = ReviewStore.calculateCategoryScores(sampleReviews);
assert(typeof scores === "object", "calculateCategoryScores returns an object");
assert(scores.cleanliness === 4.5, `Cleanliness score calculated correctly: ${scores.cleanliness} (expected 4.5)`);
assert(scores.accuracy === 4.0, `Accuracy score calculated correctly: ${scores.accuracy} (expected 4.0)`);
assert(scores.checkIn === 4.5, `Check-in score calculated correctly: ${scores.checkIn} (expected 4.5)`);
assert(scores.communication === 5.0, `Communication score calculated correctly: ${scores.communication} (expected 5.0)`);
assert(scores.location === 4.5, `Location score calculated correctly: ${scores.location} (expected 4.5)`);
assert(scores.value === 4.5, `Value score calculated correctly: ${scores.value} (expected 4.5)`);
assert(scores.overall === 4.5, `Overall score calculated correctly: ${scores.overall} (expected 4.5)`);

// Empty reviews fallback test
const emptyScores = ReviewStore.calculateCategoryScores([]);
assert(emptyScores.overall === 4.9, `Empty reviews returns fallback overall score: ${emptyScores.overall} (expected 4.9)`);
assert(emptyScores.cleanliness === 4.9, `Empty reviews returns fallback cleanliness score: ${emptyScores.cleanliness} (expected 4.9)`);

// Delete review function test
assert(typeof ReviewStore.deleteReview === "function", "ReviewStore.deleteReview exists");

// ─────────────────────────────────────────────────────────────
// 4. FEATURE 2: PDF Voucher & QR Code Generation
// ─────────────────────────────────────────────────────────────
console.log("\n4. AUDITING FEATURE 2: PDF Voucher & QR Code Generation...");

async function testQrCode() {
    const mockQrPayload = JSON.stringify({
        voucher: "STAY-E4E1A4",
        guest: "John Doe",
        property: "Luxury Villa in Goa",
        checkIn: "2026-12-01",
        checkOut: "2026-12-05",
        status: "confirmed"
    });

    const qrDataUrl = await QRCode.toDataURL(mockQrPayload, {
        color: {
            dark: "#143528",
            light: "#FFFFFF"
        },
        width: 180,
        margin: 1
    });

    assert(typeof qrDataUrl === "string", "QRCode.toDataURL returns a string");
    assert(qrDataUrl.startsWith("data:image/png;base64,"), "QRCode.toDataURL produces valid base64 PNG data URL");
    assert(qrDataUrl.length > 200, `QRCode.toDataURL produced substantial image data (${qrDataUrl.length} chars)`);

    // Verify voucher view renders with this exact QR code
    const voucherEjsPath = path.join(viewsDir, "store/bookingVoucher.ejs");
    const renderedVoucherHtml = ejs.render(
        fs.readFileSync(voucherEjsPath, "utf-8"),
        {
            booking: {
                _id: "60d5ec49f1b2c8b1f8e4e1a4",
                propertyTitle: "Luxury Villa in Goa",
                propertyAddress: "Candolim, Goa",
                checkIn: new Date("2026-12-01"),
                checkOut: new Date("2026-12-05"),
                guests: 2,
                totalNights: 4,
                totalAmount: 34000,
                baseAmount: 34000,
                cleaningFee: 1200,
                serviceFee: 800,
                status: "confirmed",
                guestName: "John Doe",
                guestEmail: "john@example.com"
            },
            referenceCode: "STAY-E4E1A4",
            qrCodeDataUrl: qrDataUrl,
            user: { name: "John Doe", email: "john@example.com" },
            currentPage: "bookings"
        },
        { filename: voucherEjsPath, views: [viewsDir, path.join(viewsDir, "partials")] }
    );

    assert(renderedVoucherHtml.includes("STAY-E4E1A4"), "bookingVoucher.ejs contains voucher reference code STAY-E4E1A4");
    assert(renderedVoucherHtml.includes(qrDataUrl), "bookingVoucher.ejs embeds the exact generated QR code data URL");
    assert(renderedVoucherHtml.includes("Arrival Contactless Pass"), "bookingVoucher.ejs contains contactless pass section");
}

await testQrCode();

// ─────────────────────────────────────────────────────────────
// 5. FEATURE 3: Homepage Leaflet map toggle & JSON serialization
// ─────────────────────────────────────────────────────────────
console.log("\n5. AUDITING FEATURE 3: Homepage Leaflet Map Toggle & JSON Serialization...");

const viewHomesPath = path.join(viewsDir, "store/04_viewHomes.ejs");
const testHomes = [
    {
        id: "home1",
        houseName: "Goa Beachfront Villa",
        housePrice: 8500,
        housePhoto: "https://example.com/h1.jpg",
        houseAddress: "Candolim, Goa",
        city: "Goa",
        mapLat: 15.5173,
        mapLng: 73.7634
    },
    {
        id: "home2",
        houseName: "Manali Pine Retreat",
        housePrice: 4200,
        housePhoto: "https://example.com/h2.jpg",
        houseAddress: "Old Manali, Himachal Pradesh",
        city: "Manali",
        mapLat: 32.2432,
        mapLng: 77.1892
    }
];

const renderedHomepage = ejs.render(
    fs.readFileSync(viewHomesPath, "utf-8"),
    {
        registeredHome: testHomes,
        currentPage: "viewHomes",
        user: null,
        favHome: []
    },
    { filename: viewHomesPath, views: [viewsDir, path.join(viewsDir, "partials")] }
);

assert(renderedHomepage.includes("homepage-leaflet-map"), "04_viewHomes.ejs contains #homepage-leaflet-map element");
assert(renderedHomepage.includes("floating-map-toggle"), "04_viewHomes.ejs contains floating-map-toggle button");
assert(renderedHomepage.includes("toggleMapView()"), "04_viewHomes.ejs contains toggleMapView() function call");

// Extract the serialized JSON string from the rendered HTML to verify valid JSON parsing
const matchJson = renderedHomepage.match(/const rawHomes = (\[.*?\]);/s);
assert(matchJson !== null, "04_viewHomes.ejs correctly outputs serialized `const rawHomes = [...]`");

if (matchJson) {
    try {
        const parsedRawHomes = JSON.parse(matchJson[1]);
        assert(Array.isArray(parsedRawHomes) && parsedRawHomes.length === 2, `Parsed rawHomes is array of 2 items: ${parsedRawHomes.length}`);
        assert(parsedRawHomes[0].houseName === "Goa Beachfront Villa", "Parsed rawHomes preserves houseName accurately");
        assert(parsedRawHomes[0].mapLat === 15.5173, "Parsed rawHomes preserves mapLat accurately");
        assert(parsedRawHomes[0].mapLng === 73.7634, "Parsed rawHomes preserves mapLng accurately");
    } catch (e) {
        assert(false, `rawHomes JSON parsing error: ${e.message}`);
    }
}

// ─────────────────────────────────────────────────────────────
// 6. FEATURE 4: Host Analytics & Chart.js Integration
// ─────────────────────────────────────────────────────────────
console.log("\n6. AUDITING FEATURE 4: Host Analytics & Chart.js Integration...");

const hostIndexPath = path.join(viewsDir, "host/02_hostIndex.ejs");
const testMonthlyLabels = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
const testChartData = [18000, 24000, 31000, 29000, 48000, 62000];
const testTotalRevenue = 62000;

const renderedHostIndex = ejs.render(
    fs.readFileSync(hostIndexPath, "utf-8"),
    {
        hostHomes: testHomes,
        totalHomes: 2,
        hostCities: ["Goa", "Manali"],
        totalRevenue: testTotalRevenue,
        totalNightsBooked: 22,
        confirmedCount: 8,
        occupancyRate: 88,
        monthlyLabels: testMonthlyLabels,
        chartData: testChartData,
        currentPage: "host-dashboard",
        isHostNav: true,
        user: { name: "Host Hostington", role: "host", email: "host@example.com" }
    },
    { filename: hostIndexPath, views: [viewsDir, path.join(viewsDir, "partials")] }
);

assert(renderedHostIndex.includes("hostRevenueChart"), "02_hostIndex.ejs contains #hostRevenueChart canvas");
assert(renderedHostIndex.includes("62,000"), "02_hostIndex.ejs formats and renders totalRevenue (₹62,000)");
assert(renderedHostIndex.includes(JSON.stringify(testMonthlyLabels)), "02_hostIndex.ejs serializes monthlyLabels JSON cleanly into Chart.js config");
assert(renderedHostIndex.includes(JSON.stringify(testChartData)), "02_hostIndex.ejs serializes chartData JSON cleanly into Chart.js config");

// ─────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────
console.log("\n=================================================");
console.log(`AUDIT COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} verification checks.`);
console.log("=================================================");

if (failedTests > 0) {
    process.exit(1);
} else {
    console.log("ALL ROUTES, HANDLERS, FEATURES, AND VIEW SERIALIZATIONS VERIFIED 100% SUCCESSFUL!");
    process.exit(0);
}
