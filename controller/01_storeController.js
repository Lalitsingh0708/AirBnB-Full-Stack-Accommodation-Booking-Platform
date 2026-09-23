import { Home } from "../models/01_homesModel.js"; // Home models 
import { FavouriteHomes } from "../models/02_favouriteModel.js";

export const getHomesList =  (req , res)=>{
    Home.fetchAll((registeredHome) => {
        res.render("host/02_hostHome.ejs", { registeredHome: registeredHome });
    }) ;
}

export const postAddHome = (req , res)=>{
    Home.fetchAll((registeredHome) => {
        res.render("store/04_viewHomes" , { registeredHome }) ;
    }) ;
} ;

export const getBookings =  (req , res)=>{
    res.render("store/09_bookings.ejs");
    
}

export const getFavroutelist = (req, res) => {
    FavouriteHomes.getFavourite((fav = []) => {
        Home.fetchAll((registeredHome = []) => {
            // Null check: Handle case if fav is null/undefined
            const safeFavList = fav || [];

            // Convert all IDs to String to avoid Type Mismatch (e.g., Number vs String)
            const favWithDetails = registeredHome.filter(home => 
                safeFavList.map(String).includes(String(home.id))
            );

            console.log("Matched Favourites:", favWithDetails);

            res.render("store/07_favourite-list", {
                favWithDetails: favWithDetails,
                pageTitle: "Your Favourites",
                path: "/favourites"
            });
        });
    });
};

export const getIndex =  (req , res)=>{
    res.render("store/05_index.ejs");
}

export const getHomeDetails = (req , res)=>{
    const homeid = req.params.id ;
    console.log("At home details page" , homeid) ;
    Home.findById(homeid , home =>{
        if(!home){
            console.log("Home not found") ;
            res.redirect("/") ;
            return ;
        }
        console.log("Home details" , home) ;
        res.render("store/06_home-details", { home: home }) ;
    })   ; 
} 

export const postAddToFavourite = (req , res)=>{
    console.log(req.body) ;
    FavouriteHomes.addToFavourite(req.body.id , error => {
        if(error){
            console.log("Error while marking favourite") ;
        }
        res.redirect("/favourite-list") ;
    }) ;
} ;