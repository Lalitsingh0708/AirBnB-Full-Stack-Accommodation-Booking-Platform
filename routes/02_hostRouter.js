import express from "express" ;
import path from "path" ;
const hostRouter = express.Router() ;
import paths from "../utils/pathUtil.js" ;
import {getEditHome,getAddHome , postGetHomeCard , getHostHomesList} from "../controller/02_hostController.js"; 


// this is just home page for everyone to see the registered homes
hostRouter.get("/host/add-home", getAddHome ) ; 

// i put all the registered homes to view home page 


hostRouter.post("/host/add-home",postGetHomeCard);
hostRouter.get("/host/view-home",getHostHomesList); // host-home-list
hostRouter.get("/host/01_editHomes.ejs/:id",getEditHome ) ;
hostRouter.post("/host/edit-home", getEditHome ) ;

export default hostRouter ;



