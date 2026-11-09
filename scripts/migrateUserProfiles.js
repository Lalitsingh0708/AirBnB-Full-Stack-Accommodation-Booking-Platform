import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);
console.log("Connected to MongoDB Atlas:", mongoose.connection.name);

const db = mongoose.connection.db;
const usersCollection = db.collection("users");

const allUsers = await usersCollection.find({}).toArray();
console.log(`Found ${allUsers.length} total user documents to migrate in Atlas.\n`);

let hostCount = 0;
let customerCount = 0;

for (const user of allUsers) {
    const isHost = user.role === "host";

    if (isHost) {
        hostCount++;
        const hostProfile = {
            isApproved: user.isApproved ?? true,
            phone: user.phone || null,
            isPhoneVerified: user.isPhoneVerified ?? false,
            phoneOtp: user.phoneOtp || { code: null, expiresAt: null },
            about: user.about || "",
            hostingSince: user.createdAt || new Date(),
            responseRate: 100,
            superhostStatus: false,
            coHosts: []
        };

        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    userType: "host",
                    hostProfile: hostProfile,
                    customerProfile: null
                }
            }
        );
        console.log(`Migrated HOST: ${user.name} (${user.email}) -> hostProfile created.`);
    } else {
        customerCount++;
        const customerProfile = {
            phone: user.phone || null,
            savedProperties: user.savedProperties || [],
            preferredCurrency: "INR",
            tripsCount: 0,
            emergencyContact: { name: "", phone: "" }
        };

        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    userType: "customer",
                    customerProfile: customerProfile,
                    hostProfile: null
                }
            }
        );
        console.log(`Migrated CUSTOMER: ${user.name} (${user.email}) -> customerProfile created.`);
    }
}

console.log(`\n==============================================`);
console.log(`MIGRATION COMPLETE!`);
console.log(`Total Hosts structured    : ${hostCount}`);
console.log(`Total Customers structured: ${customerCount}`);
console.log(`==============================================\n`);

process.exit(0);
