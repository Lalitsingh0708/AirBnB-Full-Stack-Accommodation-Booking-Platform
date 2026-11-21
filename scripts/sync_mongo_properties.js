import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Booking from '../models/Booking.js';
import Property from '../models/Property.js';
import fs from 'fs';
import path from 'path';
import paths from '../utils/pathUtil.js';

dotenv.config();

async function syncAndPopulateProperties() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    const hostId = "6ad470e41f3e9769a82487d6"; // Lalit Baghel

    // Also sync the 17 homes from data/homes.json into Property collection in Mongo if empty or update them
    const homesFilePath = path.join(paths, 'data', 'homes.json');
    const raw = fs.readFileSync(homesFilePath, 'utf8');
    const homes = JSON.parse(raw || '[]');

    console.log(`Checking MongoDB Property collection... Total homes in JSON: ${homes.length}`);
    for (const home of homes) {
        // Try finding by title or create
        const safeTitle = (home.houseName && home.houseName.trim().length >= 5) 
            ? home.houseName.trim() 
            : `${home.houseName || 'StayNest'} Luxury Stay`;

        const safeDesc = (home.description && home.description.trim().length >= 20)
            ? home.description.trim()
            : "An exquisite architectural retreat offering serene views, bespoke amenities, and unparalleled comfort for guests.";

        let prop = await Property.findOne({ title: safeTitle });
        if (!prop) {
            prop = new Property({
                title: safeTitle,
                description: safeDesc,
                propertyType: "House",
                address: home.houseAddress || "India",
                city: home.city || (home.houseAddress ? home.houseAddress.split(',').pop().trim() : "New Delhi"),
                state: home.state || "Delhi",
                pricePerNight: Number(home.housePrice) || 3500,
                maxGuests: Number(home.maxGuests) || 4,
                bedrooms: Number(home.bedrooms) || 2,
                bathrooms: Number(home.bathrooms) || 2,
                photos: home.photos && home.photos.length > 0 ? home.photos : [home.housePhoto],
                host: new mongoose.Types.ObjectId(hostId),
                status: "approved",
                isAvailable: true
            });
            await prop.save();
            console.log(`Synced property to MongoDB: ${safeTitle}`);
        } else {
            prop.host = new mongoose.Types.ObjectId(hostId);
            prop.status = "approved";
            prop.isAvailable = true;
            await prop.save();
        }
    }

    // Check bookings
    const allBookings = await Booking.find({});
    console.log(`Total bookings in MongoDB: ${allBookings.length}`);
    if (allBookings.length > 0) {
        console.log("Sample booking properties:", allBookings.map(b => b.property));
    }

    await mongoose.disconnect();
    console.log("Sync complete!");
}

syncAndPopulateProperties().catch(console.error);
