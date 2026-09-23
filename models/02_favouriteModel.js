import fs from 'fs' ;
import path from 'path' ;
import paths from '../utils/pathUtil.js';

let registeredHome = [] ;
const favDataPath = path.join(paths , 'data' , 'favourite.json') ;
export class FavouriteHomes {
    static addToFavourite(id , callback){
        FavouriteHomes.getFavourite((fav)=>{
            if(fav.includes(id)){
                callback("home already exists. ") ;
            }else{
                fav.push(id) ;
                fs.writeFile(favDataPath , JSON.stringify(fav), callback) ;
            }
        }) ; 
    }
    static getFavourite(callback){
        fs.readFile(favDataPath , (err , data)=>{
            callback(!err ? JSON.parse(data) : [] ) ;
        }) ;
    }
};