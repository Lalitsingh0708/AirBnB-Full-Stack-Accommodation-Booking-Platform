import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "staynest_uploads",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
        transformation: [{ quality: "auto", fetch_format: "auto" }]
    }
});

export const uploadCloud = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

export { cloudinary };
