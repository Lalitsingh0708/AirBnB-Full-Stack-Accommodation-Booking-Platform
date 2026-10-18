import express from "express" ;
import path from "path" ;
import paths from "../utils/pathUtil.js" ;
import {
    postAddToFavourite,
    postAddHome,
    getSearchResults,
    getHomeDetails,
    getHomesList,
    getBookings,
    getFavroutelist,
    getIndex,
    postSendMessageToHost,
    getPropertyMessages,
    getCheckout,
    postCreateBooking,
    postCancelBooking,
    postAddReview,
} from "../controller/01_storeController.js";
import { protect } from "../middleware/auth.js";

const UserRouter = express.Router();

UserRouter.use(express.static(path.join(paths, "public")));
// mai / -> index dunga jisme homelist show hongi store se 
// mai /host -> host-dashboard wala page dunga mai ab change krunga isko specialially host k liye or 
// homelist ko store k liye 
UserRouter.get("/", postAddHome);  // postAddHome gives me the list of the all homes which are listed on the portal 
UserRouter.get("/search", getSearchResults);
UserRouter.get("/bookings", protect, getBookings);
UserRouter.post("/bookings/cancel/:id", protect, postCancelBooking);
UserRouter.get("/book/:id", protect, getCheckout);
UserRouter.post("/book/:id", protect, postCreateBooking);
UserRouter.get("/favourite-list", getFavroutelist);
UserRouter.get("/index", postAddHome);
UserRouter.get("/homes/:id", getHomeDetails);
UserRouter.post("/homes/:id/review", protect, postAddReview);
UserRouter.get("/homes/:id/messages", getPropertyMessages);
UserRouter.post("/homes/:id/message", postSendMessageToHost);
UserRouter.post("/favourite", postAddToFavourite);

export default UserRouter;