import { Home } from "../models/01_homesModel.js"; // Home models 

export const getHostHomesList =  (req , res)=>{
    Home.fetchAll((registeredHome) => {
        res.render("host/02_hostHome.ejs", { registeredHome: registeredHome });
    }) ;
}

export const getAddHome = (req, res) => {
    res.render("host/03_addHome");
};

export const postGetHomeCard = (req , res)=>{
    res.send(`
        <h1>Thank you for adding your home</h1>
        <h1> <a href="/">Go To Home</a></h1>
    `) ;

    const home = new Home(req.body.homeName , req.body.homePrice , req.body.homePhoto ,req.body.homeAddress ) ; 
    home.save() ;

    // registeredHome.push(
    //     {
    //         houseName: req.body.homeName , 
    //         housePrice : req.body.homePrice , 
    //         houseAddress : req.body.homeAddress , 
    //         housePhoto : req.body.homePhoto
    //     } 
    // ) ;

    const homeData = req.body ;
    console.log(homeData) ; 

}
export const getEditHome = (req , res)=>{
    const homeid = req.params.id ;
    Home.findById(homeid , home=>{
        if(!home){
            console.log("home not foubd for editing..") ;
            res.redirect("/host/view-home") ;
        }
        else {
            console.log(homeid , home) ;
            res.render("host/01_editHome", {home:home}) ;
        }
    } ) ;
}