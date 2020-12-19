//------------------ MODULES -------------------//
const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const corsEnable = require("cors");
const cookieParser = require("cookie-parser");
const fetch = require("node-fetch");
const dotenv = require("dotenv").config();

const Facebook = require("./lib/OauthFacebook");
const facebook = new Facebook();
const JWT = require("./lib/JWT.js");
const Google = require("./lib/OauthGoogle");



const validateCredentials = require("./lib/validator.js");
const validateEmail = require("./lib/validator.js");
const { getJWTInfo } = require("./lib/JWT.js");

const server = express();
const listeningPort = 8888;

//------------------ MIDDLEWARES -------------------//
//Setup the public (Frontend) folder
const publicFiles = express.static("public");
server.use(publicFiles);
//Setup body parser for json use
server.use(bodyParser.urlencoded({"extended" : false}));
server.use(bodyParser.json());
server.use(corsEnable());
server.use(cookieParser());
// server.use(VerifySession);

//Setting public directories
server.use(express.static("./../public"));

function connectionDB() {
    return mysql.createConnection({
        "host": "localhost",
        "user": "root",
        "password": "root",
        "database": "crewProj"
    });
}

// Funciones middleware
// function VerifySession(req, res, next){
//     let endpoints = ["/signup", "/login", "facebook-redirect", "/facebook-login", "/google-redirect", "/google-login", "/logout", /info-user-form"];

//     //indexOf nos devuelve la posicion en el array de lo que estamos buscando en este caso
//     // console.log(req.path)
//     if(endpoints.indexOf(req.path.toLowerCase()) > -1 || (req.cookies.JWT && JWT.verifyJWT(req.cookies.JWT))){
//         next()
//     } else {
//         res.clearCookie("JWT")
//         // res.redirect("/")
//         res.status(403).send({"res" : "0" , "msg" : "No active session"});
//     }

// }

function encryptPassword(string, salt = crypto.randomBytes(128).toString("hex")) {
    let saltedPassword = hash(salt + string + salt, SECRET);
    return { password: saltedPassword, salt };
}

function verifyPassword(string, realPassword) {
    return encryptPassword(string, realPassword.salt).password === realPassword.password;

}

//------------ENDPOINTS--------------------//

server.post("/signup", (req,res) =>{

    if(req.body.email !== null && req.body.pass !== null){

        let validated = validateCredentials(req.body.email, req.body.psw);

        if(validated){

            const DBconnection = connectionDB();

            if (DBconnection){
                const prom = new Promise((resolve, reject) => {
                    DBconnection.connect(function(err) {
                        if (err) {
                            reject("DBError");
                        }
                        resolve();
                    });
                });
                prom.then(() => {

                    const sql = "SELECT U.* FROM users U INNER JOIN PersonalUsers PU ON PU.ext_usrid = U.usrid WHERE email = ?";
                    DBconnection.query(sql, [req.body.email], (err, result) => {
                        if (err){
                            res.send({"res" : "0", "msg" : err});

                        } else if (result.length){
                            res.send({"res" : "1", "msg" : "Usuario ya registrado!"});

                        } else {
                            res.send({"res" : "2", "msg" : "User to fill the form"});   
                        }
                        DBconnection.end();
                    });
                })
                .catch((e) => {
                    if (e === "DBError")
                        res.send({"res" : "0", "msg" : "Error connection to database"});
                });
            }
        } else {
            res.send({"res" : "0", "msg" : "Error in credentials"})
        }
    } else {
        res.send({"res" : "0", "msg" : "No data in req.body"})
    }
})

server.post("/login", (req, res) =>{

    if(req.body.email && req.body.psw ){

        let Validated = validateCredentials(req.body.email, req.body.psw);

        if(Validated || (req.body.email === "admin" && req.body.psw === "admin")){
            const DBconnection = connectionDB();
            if (DBconnection){
                const prom = new Promise((resolve, reject) => {
                    DBconnection.connect(err => {
                        if (err) {
                            reject(err);
                        }
                        resolve();
                    });
                });
                prom.then(() => {
                    //Select siempre devuelve un array, y cuidado con el like, si hay un correo que lo contiene te entran
                    const sql = `SELECT U.* FROM users AS U JOIN PersonalUsers AS PU ON U.usrid = PU.ext_usrid WHERE PU.psw = ? AND U.email = ?`; 
                    DBconnection.query(sql, [req.body.psw, req.body.email], (err, result) => {
                        if (err){
                            throw err;
                        } else if (result.length){

                            //Generate JWT
                            const Payload = {
                                "usrid" : result[0].usrid,
                                "email" : result[0].email,
                                "name" : result[0].name,
                                "profile" : result[0].user_profile,
                                "iat" : new Date()
                            };

                            //COMPLETE Payload

                            const jwt = JWT.generateJWT(Payload);
                            const jwtVerified = JWT.verifyJWT(jwt);

                            if(jwtVerified){

                                //Access as administrator
                            res.cookie("JWT", jwt, {"httpOnly" : true})
                                .send({"res" : "1", "msg" : `${result[0].name} has logged in`});

                            } else {
                                res.send({"res" : "0", "msg" : "JWT not verified"})
                            }
                                
                            
                        } else {
                            res.send({"res" : "0", "msg" : "User not registered"});
                        }
                    });
                    DBconnection.end();
                })
                .catch((e) => {
                    
                    res.send({"res" : "0", "msg" : "Unable to connect to database", e});
                });
            }

        } else {

            res.send({"res" : "0", "msg" : "Error in credentials"})
        }

    }
});

server.get("/logout", (req, res) =>{
    res.clearCookie(JWT);
    res.redirect("http://localhost:3000");
});

server.post("/info-user-form", (req, res) => {

    if(req.body){
        //COMPLETAR datos form
        const {psw, idFacebook, idGoogle, email, name} = req.body;
        //COMPLETAR con resto de datos pedidos

        const DBconnection = connectionDB();
            if (DBconnection){
                const prom = new Promise((resolve, reject) => {
                    DBconnection.connect(err => {
                        if (err) {
                            reject(err);
                        }
                        resolve();
                    });
                });
                prom.then(() => {
                    //Select siempre devuelve un array, y cuidado con el like, si hay un correo que lo contiene te entran
                    //COMPLETAR
                    const sql = "INSERT INTO users (email,name) VALUES (?, ?)";
                    DBconnection.query(sql, [email, name], (err, result) => {
                        if(err)
                            throw err
                        else {

                            const idResultInsert = result.insertId;

                            const Payload = {
                                "usrid" : idResultInsert,
                                "email" : email,
                                "name" : name,
                                "iat" : new Date()
                            };

                            if(psw){

                                const sql = "INSERT INTO PersonalUsers (ext_usrid, psw) VALUES (?, ?)";
                                DBconnection.query(sql, [idResultInsert, psw], err => {
                                    if(err){
                                        res.send({"res" : "0", "msg" : err})
                                    } else {

                                        //Generate JWT
                                        const jwt = JWT.generateJWT(Payload);
                                        const jwtVerified = JWT.verifyJWT(jwt);

                                        if(jwtVerified){

                                            res.cookie("JWT", jwt, {"httpOnly" : true})
                                            res.send({"res" : "1", "msg" : `${name} has been found in users and logged in`});

                                        } else {
                                            res.send({"res" : "0", "msg" : "JWT not verified"})
                                        }

                                    }
                                    DBconnection.end();
                                });

                            } else if(idFacebook){

                                const sql = "INSERT INTO UsersFacebook (ext_usrid, idFacebook) VALUES (?, ?)";
                                DBconnection.query(sql, [idResultInsert, idFacebook], err => {
                                    if(err){
                                        res.send({"res" : "0", "msg" : err})
                                    } else {

                                        //Generate JWT
                                        const jwt = JWT.generateJWT(Payload);
                                        const jwtVerified = JWT.verifyJWT(jwt);

                                        if(jwtVerified){

                                            res.cookie("JWT", jwt, {"httpOnly" : true})
                                            res.send({"res" : "1", "msg" : `${name} has been found in users and logged in with facebook`});

                                        } else {
                                            res.send({"res" : "0", "msg" : "JWT not verified"})
                                        }
                                    }
                                    DBconnection.end();
                                });

                            } else if(idGoogle){

                                const sql = "INSERT INTO UsersGoogle (ext_usrid, idGoogle) VALUES (?, ?)";
                                DBconnection.query(sql, [idResultInsert, idGoogle], err => {
                                    if(err){
                                        res.send({"res" : "0", "msg" : err})
                                    } else {

                                        //Generate JWT
                                        const jwt = JWT.generateJWT(Payload);
                                        const jwtVerified = JWT.verifyJWT(jwt);

                                        if(jwtVerified){

                                            res.cookie("JWT", jwt, {"httpOnly" : true})
                                            res.send({"res" : "1", "msg" : `${name} has been found in users and logged in with google`});

                                        } else {
                                            res.send({"res" : "0", "msg" : "JWT not verified"})
                                        }
                                    }
                                    DBconnection.end();
                                });

                            } else {
                                res.send({"res" : "0", "msg" : "No data"})
                            }
                        }
                    })
                })
            } else {
                res.send({"res" : "0", "msg" : "Error in database connection"});
            }
        
    } else {
        res.send({"res" : "0", "msg" : "No body"});
    }

})

server.get("/facebook-redirect", (req,res) =>{

    res.redirect(facebook.getRedirectUrl());
});

server.get("/facebook-login", async (req, res) => {

    const Token = await (facebook.getOauthToken(req.query.code, req.query.state));
    const data = await facebook.getUserInfo(Token, ["name", "email"])
    
    const {id, name, email} = data;

    console.log(data);

    if(id && name && email){

        let Validated = validateEmail(email);

        if(Validated){
            const DBconnection = connectionDB();
            if (DBconnection){
                const prom = new Promise((resolve, reject) => {
                    DBconnection.connect(err => {
                        if (err) {
                            reject(err);
                        }
                        resolve();
                    });
                });
                prom.then(() => {
                    const sql = "SELECT * FROM users U INNER JOIN UsersFacebook UF ON UF.ext_usrid = U.usrid WHERE email = ?"; //Select siempre devuelve un array, y cuidado con el like, si hay un correo que lo contiene te entran
                    DBconnection.query(sql, [email], (err, result) => {

                        if (err){
                            res.send({"res" : "0", "msg" : err})
                        } else if (result.length){

                                //Generate JWT
                                const Payload = {
                                    "usrIdF" : result[0].usrid,
                                    "name" : result[0].name,
                                    "email" : result[0].email,
                                    "iat" : new Date()
                                };

                                //COMPLETAR con resto de datos pedidos

                                const jwt = JWT.generateJWT(Payload);
                                const jwtVerified = JWT.verifyJWT(jwt);

                                if(jwtVerified){

                                    //Access as administrator
                                res.cookie("JWT", jwt, {"httpOnly" : true})
                                    .send({"res" : "1", "msg" : `${result[0].name} has been found in usersFacebook and logged in with facebook`});

                                } else {
                                    res.send({"res" : "0", "msg" : "JWT not verified"})
                                }
                                
                            
                        } else {

                            res.send({"res" : "2", "msg" : "User facebook to fill form", data});

                        }
                        DBconnection.end();
                    });
                })
                prom.catch(e => res.send({"res" : "0", "msg" : "Unable to connect to database", e}));
            }

        } else {

            res.send({"res" : "0", "msg" : "Error in credentials"})
        }
    } else {
        res.send({"res" : "0", "msg" : "Left credentials"})
    }
});

server.get("/google-redirect", (req, res) => {
	res.redirect(Google.getGoogleAuthURL());
});

server.get("/google-login", async (req, res) => {

    const {code} = req.query;
    
	if (code) {
        const userData = await Google.getGoogleUser(code);

        if(userData){
            // res.send(userData);
            const {id, email, name} = userData;
            const Validated = validateEmail(email);

            if(Validated){
                const DBconnection = connectionDB();
                if (DBconnection){
                    const prom = new Promise((resolve, reject) => {
                        DBconnection.connect(err => {
                            if (err) {
                                reject(err);
                            }
                            resolve();
                        });
                    });
                    prom.then(() => {
                        //Select siempre devuelve un array, y cuidado con el like, si hay un correo que lo contiene te entran
                        const sql = "SELECT * FROM users U INNER JOIN UsersGoogle UG ON UG.ext_usrid = U.usrid WHERE email = ?";
                        DBconnection.query(sql, [email], (err, result) => {

                            if (err){
                                res.send({"res" : "0", "msg" : err})
                            } else if (result.length){


                                //Generate JWT
                                const Payload = {
                                    "usrIdG" : result[0].usrIdG,
                                    "name" : result[0].name,
                                    "email" : result[0].email,
                                    "iat" : new Date()
                                };

                                const jwt = JWT.generateJWT(Payload);
                                const jwtVerified = JWT.verifyJWT(jwt);

                                if(jwtVerified){

                                    //Access as administrator
                                    res.cookie("JWT", jwt, {"httpOnly" : true})
                                        .send({"res" : "1", "msg" : `${result[0].name} has been found in DB and logged in with google`});

                                } else {
                                    res.send({"res" : "0", "msg" : "JWT not verified"})
                                }
                                    
                            } else {

                                res.send({"res" : "2", "msg" : "User Google to fill form", userData})
                            }
                            DBconnection.end();
                        });
                    })
                    .catch((e) => {
                        
                        res.send({"res" : "0", "msg" : "Unable to connect to database", e});
                    });
                }
            }

        } else {
            res.send({"res" : "0", "msg" : "No userData"});
        }

	} else {
        res.send({"res" : "0", "msg" : "No code"})
    }
});

server.post("/personal-shopping-list/:listname/:supermarketId", (req,res) =>{

    const {listname, supermarketId} = req.params;

    if(listname && supermarketId){

        const userInfo = JWT.getJWTInfo(req.cookies.JWT);
        //Que devuelve getJWTInfo
    
        if(userInfo.includes("userid")){

            const { usrid } = userInfo;
            // ArrUsrid = Object.values(userid) // Question Tengo que convertirlo a array para pasarlo en la query?

            const DBconnection = connectionDB();
                if (DBconnection){
                    const prom = new Promise((resolve, reject) => {
                        DBconnection.connect(err => {
                            if (err) {
                                reject(err);
                            }
                            resolve();
                        });
                    });
                    prom.then(() => {
                        //Select siempre devuelve un array, y cuidado con el like, si hay un correo que lo contiene te entran
                        const sql = "INSERT INTO PersonalShoppingList (listName,APISMarketId,APISMarketName) VALUES (?, ?, ?)";
                        DBconnection.query(sql, [listname, supermarketId, req.body.supermarketName], err => {
                            if(err)
                             throw err
                            else {
                                const sql = "SELECT usrid FROM users WHERE usrid = ?";
                                DBconnection.query(sql, [ArrUsrid], (err, result) => {
                                    if(err)
                                      throw err
                                    else {
                                        const sql = "INSERT INTO PShopSmarketsUsers (listName,APISMarketId,APISMarketName) VALUES (?, ?, ?)";
                                        DBconnection.query(sql, [ArrUsrid], (err, result) => {

                                        })

                                    }
                                    

                                })
                            }

                        })
                    })
                }

        } else if(userInfo.includes("userIdF")){

        } else if(userInfo.includes("userIdG")){

        } else {

        }

    } else {
        res.send({"res" : "0", "msg" : "No params"})
    }
});

server.listen(listeningPort);




