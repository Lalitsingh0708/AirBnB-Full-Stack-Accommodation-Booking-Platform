import mongoose from "mongoose";
import dns from "dns";

// Ensure Node uses reliable public DNS servers for MongoDB Atlas SRV resolution
try {
    dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {
    console.warn("[MongoDB] Could not set custom DNS servers:", e.message);
}

const mongooseOptions = {
    serverSelectionTimeoutMS: 30000, // 30s timeout prevents transient failure on Wi-Fi/mobile hotspots
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    family: 4, // Enforce IPv4 to avoid IPv6 ISP routing failures
};

let isConnecting = false;

const connectDB = async (retryCount = 0) => {
    if (isConnecting || mongoose.connection.readyState === 1) return;
    isConnecting = true;

    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
        console.log(`MongoDB connected: ${conn.connection.host}`);
        isConnecting = false;
    } catch (err) {
        isConnecting = false;
        console.error(`MongoDB connection failed (Attempt ${retryCount + 1}):`, err.message);
        
        // Auto-retry without crashing the whole application process
        const delay = Math.min(10000, 3000 * Math.pow(1.5, retryCount));
        console.log(`[MongoDB] Re-attempting connection in ${Math.round(delay / 1000)} seconds...`);
        setTimeout(() => connectDB(retryCount + 1), delay);
    }
};

mongoose.connection.on("disconnected", () => {
    console.warn("[MongoDB] Lost connection to Atlas cluster. Attempting to reconnect...");
    connectDB();
});

mongoose.connection.on("error", (err) => {
    console.error("[MongoDB] Connection error event:", err.message);
});

export default connectDB;
