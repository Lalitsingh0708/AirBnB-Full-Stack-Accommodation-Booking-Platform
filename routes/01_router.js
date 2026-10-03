import express from "express" ;
import path from "path" ;
import paths from "../utils/pathUtil.js" ;
import {postAddToFavourite, postAddHome ,getHomeDetails, getHomesList , getBookings , getFavroutelist , getIndex } from "../controller/01_storeController.js";


const UserRouter = express.Router() ;


UserRouter.use(express.static(path.join(paths , "public"))) ;
// mai / -> index dunga jisme homelist show hongi store se 
// mai /host -> host-dashboard wala page dunga mai ab change krunga isko specialially host k liye or 
// homelist ko store k liye 
UserRouter.get("/",postAddHome) ;  // postAddHome gives me the list of the all homes which are listed on the portal 
UserRouter.get("/bookings" ,getBookings) ;
UserRouter.get("/favourite-list" ,getFavroutelist) ;
UserRouter.get("/index" ,postAddHome) ;
UserRouter.get("/homes/:id" , getHomeDetails) ;
UserRouter.post("/favourite", postAddToFavourite ) ;

export default UserRouter ;