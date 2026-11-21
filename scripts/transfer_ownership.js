import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import paths from '../utils/pathUtil.js';
import User from '../models/User.js';
import Property from '../models/Property.js';

dotenv.config();

async function transferOwnership() {
    console.log("Connecting to MongoDB Atlas...");
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("MONGODB_URI not found in .env");
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log("Connected to MongoDB successfully.");

    const targetEmail = "lalitbaghel0708@gmail.com";
    let targetUser = await User.findOne({ email: targetEmail });

    if (!targetUser) {
        console.log(`User ${targetEmail} not found in DB! Searching case-insensitively...`);
        targetUser = await User.findOne({ email: { $regex: new RegExp(`^${targetEmail}$`, 'i') } });
    }

    if (!targetUser) {
        console.log(`Creating user for ${targetEmail}...`);
        targetUser = new User({
            name: "Lalit Baghel",
            email: targetEmail,
            role: "host",
            isEmailVerified: true,
            isPhoneVerified: true,
            status: "approved"
        });
        await targetUser.save();
        console.log("Created user with ID:", targetUser._id.toString());
    } else {
        console.log(`Found target user: ${targetUser.name} (${targetUser._id})`);
        if (targetUser.role !== 'host') {
            targetUser.role = 'host';
            await targetUser.save();
            console.log("Updated user role to host.");
        }
    }

    const hostId = targetUser._id.toString();
    const hostName = targetUser.name || "Lalit Baghel";

    // 1. Update all properties in MongoDB Property collection
    const propertyUpdateResult = await Property.updateMany(
        {},
        {
            $set: {
                host: targetUser._id,
                status: "approved",
                isAvailable: true
            }
        }
    );
    console.log(`Updated MongoDB Property collection: ${propertyUpdateResult.modifiedCount} documents matched & updated.`);

    // 2. Update all homes in data/homes.json
    const homesFilePath = path.join(paths, 'data', 'homes.json');
    if (fs.existsSync(homesFilePath)) {
        const raw = fs.readFileSync(homesFilePath, 'utf8');
        const homes = JSON.parse(raw || '[]');
        console.log(`Found ${homes.length} homes in data/homes.json.`);

        const updatedHomes = homes.map(home => {
            return {
                ...home,
                hostId: hostId,
                hostName: hostName
            };
        });

        fs.writeFileSync(homesFilePath, JSON.stringify(updatedHomes, null, 4));
        console.log(`Updated all ${updatedHomes.length} homes in data/homes.json with hostId: ${hostId} (${hostName}).`);
    } else {
        console.log("data/homes.json not found.");
    }

    console.log("\n==========================================");
    console.log(`SUCCESS! All stays are now owned by ${targetEmail} (ID: ${hostId}).`);
    console.log("==========================================");

    await mongoose.disconnect();
    process.exit(0);
}

transferOwnership().catch(err => {
    console.error("Error transferring ownership:", err);
    process.exit(1);
});
