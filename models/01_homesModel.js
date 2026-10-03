import fs from 'fs' ;
import path from 'path' ;
import paths from '../utils/pathUtil.js';
let registeredHome = [] ;
export class Home {
    constructor(houseName, price, url, address, options = {}) {
        this.id = options.id ? String(options.id) : Date.now().toString();
        this.houseName = houseName;
        this.housePrice = price;
        this.housePhoto = url;
        this.houseAddress = address;
        this.city = options.city || "";
        this.state = options.state || "";
        this.hostId = options.hostId ? String(options.hostId) : null;
        this.hostName = options.hostName || "StayNest Host";
        this.propertyType = options.propertyType || "House";
        this.placeType = options.placeType || "An entire place";
        this.description = options.description || "An exquisite architectural retreat offering serene views, bespoke amenities, and unparalleled comfort.";
        this.maxGuests = options.maxGuests || 4;
        this.bedrooms = options.bedrooms || 2;
        this.beds = options.beds || 2;
        this.bathrooms = options.bathrooms || 2;
        this.amenities = options.amenities || ["wifi", "ac", "parking", "pool"];
        this.latitude = options.latitude !== undefined ? Number(options.latitude) : 28.6139;
        this.longitude = options.longitude !== undefined ? Number(options.longitude) : 77.2090;
        this.showPreciseLocation = options.showPreciseLocation !== undefined ? Boolean(options.showPreciseLocation === true || options.showPreciseLocation === 'true' || options.showPreciseLocation === '1') : true;
        this.createdAt = options.createdAt || new Date().toISOString();
    }

    save(callback) {
        const homeDataPath = path.join(paths, 'data', 'homes.json');
        Home.fetchAll((homes) => {
            homes.push(this);
            registeredHome = homes;
            fs.writeFile(homeDataPath, JSON.stringify(homes, null, 4), (error) => {
                if (error) console.log("Error while writing file in path -> ", homeDataPath, error);
                if (typeof callback === 'function') callback(null, this);
            });
        });
    }

    static fetchAll(callback) {
        const homeDataPath = path.join(paths, 'data', 'homes.json');
        fs.readFile(homeDataPath, 'utf8', (err, data) => {
            if (!err && data) {
                try {
                    registeredHome = JSON.parse(data);
                } catch (e) {
                    console.log("JSON parse error in homes.json:", e);
                    registeredHome = [];
                }
            } else {
                registeredHome = [];
            }
            if (typeof callback === 'function') {
                callback(registeredHome);
            }
        });
        return registeredHome;
    }

    static findById(homeId, callback) {
        this.fetchAll(homes => {
            const homeFound = homes.find(home => String(home.id).trim() === String(homeId).trim());
            if (typeof callback === 'function') {
                callback(homeFound || null);
            }
        });
    }

    static updateById(homeId, updatedData, callback) {
        const homeDataPath = path.join(paths, 'data', 'homes.json');
        this.fetchAll(homes => {
            const index = homes.findIndex(h => String(h.id).trim() === String(homeId).trim());
            if (index === -1) {
                if (typeof callback === 'function') callback(new Error("Home not found"));
                return;
            }

            const current = homes[index];
            homes[index] = {
                ...current,
                houseName: updatedData.houseName !== undefined ? updatedData.houseName : current.houseName,
                housePrice: updatedData.housePrice !== undefined ? updatedData.housePrice : current.housePrice,
                housePhoto: updatedData.housePhoto !== undefined ? updatedData.housePhoto : current.housePhoto,
                houseAddress: updatedData.houseAddress !== undefined ? updatedData.houseAddress : current.houseAddress,
                city: updatedData.city !== undefined ? updatedData.city : (current.city || ""),
                state: updatedData.state !== undefined ? updatedData.state : (current.state || ""),
                propertyType: updatedData.propertyType !== undefined ? updatedData.propertyType : (current.propertyType || "House"),
                placeType: updatedData.placeType !== undefined ? updatedData.placeType : (current.placeType || "An entire place"),
                description: updatedData.description !== undefined ? updatedData.description : (current.description || ""),
                maxGuests: updatedData.maxGuests !== undefined ? Number(updatedData.maxGuests) : (current.maxGuests || 4),
                bedrooms: updatedData.bedrooms !== undefined ? Number(updatedData.bedrooms) : (current.bedrooms || 2),
                beds: updatedData.beds !== undefined ? Number(updatedData.beds) : (current.beds || 2),
                bathrooms: updatedData.bathrooms !== undefined ? Number(updatedData.bathrooms) : (current.bathrooms || 2),
                amenities: updatedData.amenities !== undefined ? updatedData.amenities : (current.amenities || ["wifi", "ac"]),
                latitude: updatedData.latitude !== undefined ? Number(updatedData.latitude) : (current.latitude || 28.6139),
                longitude: updatedData.longitude !== undefined ? Number(updatedData.longitude) : (current.longitude || 77.2090),
                showPreciseLocation: updatedData.showPreciseLocation !== undefined ? Boolean(updatedData.showPreciseLocation === true || updatedData.showPreciseLocation === 'true' || updatedData.showPreciseLocation === '1') : (current.showPreciseLocation !== undefined ? current.showPreciseLocation : true),
                updatedAt: new Date().toISOString()
            };

            registeredHome = homes;
            fs.writeFile(homeDataPath, JSON.stringify(homes, null, 4), (error) => {
                if (error) console.log("Error while writing updated file -> ", homeDataPath, error);
                if (typeof callback === 'function') callback(error, homes[index]);
            });
        });
    }

    static deleteById(homeId, callback) {
        const homeDataPath = path.join(paths, 'data', 'homes.json');
        this.fetchAll(homes => {
            const filtered = homes.filter(h => String(h.id).trim() !== String(homeId).trim());
            registeredHome = filtered;
            fs.writeFile(homeDataPath, JSON.stringify(filtered, null, 4), (error) => {
                if (error) console.log("Error while writing after delete -> ", homeDataPath, error);
                if (typeof callback === 'function') callback(error);
            });
        });
    }

    static fetchByHost(hostId, callback) {
        this.fetchAll(homes => {
            if (!hostId) {
                if (typeof callback === 'function') callback(homes);
                return;
            }
            const hostHomes = homes.filter(h => String(h.hostId) === String(hostId));
            if (typeof callback === 'function') callback(hostHomes);
        });
    }
}; 