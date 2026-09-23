import fs from 'fs' ;
import path from 'path' ;
import paths from '../utils/pathUtil.js';
let registeredHome = [] ;
export class Home{
    constructor(houseName , price , url , address){
        this.id = Date.now().toString() ;
        this.houseName = houseName ; 
        this.housePrice = price ; 
        this.housePhoto = url ; 
        this.houseAddress = address ;
    }

    save(callback){
        const homeDataPath = path.join(paths , 'data' , 'homes.json') ;
        Home.fetchAll((homes) => {
            homes.push(this) ;
            registeredHome = homes ;
            fs.writeFile(homeDataPath , JSON.stringify(homes, null, 4) , (error)=>{
                if(error) console.log("Error while writing file in path -> " , homeDataPath , error) ;
                if (typeof callback === 'function') callback();
            }) ;
        });
    }

    static fetchAll(callback){
        const homeDataPath = path.join(paths , 'data' , 'homes.json') ;
        fs.readFile(homeDataPath , 'utf8' , (err , data)=>{
            if(!err && data){
                try {
                    registeredHome = JSON.parse(data) ;
                } catch(e) {
                    console.log("JSON parse error in homes.json:" , e) ;
                    registeredHome = [] ;
                }
            } else {
                registeredHome = [] ;
            }
            if (typeof callback === 'function') {
                callback(registeredHome) ;
            }
        });
        return registeredHome ;
    }

    static findById(homeId , callback){
        this.fetchAll(homes =>{
            const homeFound = homes.find(home => String(home.id).trim() === String(homeId).trim()) ;
            if (typeof callback === 'function') {
                callback(homeFound || null) ;
            }
        }) ;
    }
}; 