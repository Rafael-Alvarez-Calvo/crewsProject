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
//     let endpoints = ["/signup", "/login", "facebook-redirect", "/facebook-login", "/google-redirect", "/google-login", "/logout"];

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
                    const sql = "SELECT usrid FROM users WHERE email LIKE ?";
                    DBconnection.query(sql, [req.body.email], (err, result) => {
                        if (err){
                            throw err;
                        } else if (result.length){
                            //User found already in db
                            res.send({"res" : "0", "msg" : "Usuario ya registrado!"});
                        } else {
                            //Proceed to store user in db table
                            const sql = "INSERT INTO users (email,psw) VALUES (?, ?)";
                            DBconnection.query(sql, [req.body.email, req.body.psw], err => {
                                if (err){
                                    throw err;
                                } else {
                                    res.send({"res" : "1", "msg" : "Usuario registrado!"});

                                }
                            });
                        }
                    });
                    DBconnection.end();
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
                    const sql = "SELECT usrid, psw, user_profile FROM users WHERE email = ?"; //Select siempre devuelve un array, y cuidado con el like, si hay un correo que lo contiene te entran
                    DBconnection.query(sql, [req.body.email], (err, result) => {
                        if (err){
                            throw err;
                        } else if (result.length){

                            if (result[0].psw === req.body.psw){
                                //Generate JWT
                                const Payload = {
                                    "usrid" : req.body.usrid,
                                    "user" : req.body.email,
                                    "profile" : result[0].user_profile,
                                    "iat" : new Date()
                                };

                                const jwt = JWT.generateJWT(Payload);
                                const jwtVerified = JWT.verifyJWT(jwt);

                                if(jwtVerified){

                                    //Access as administrator
                                res.cookie("JWT", jwt, {"httpOnly" : true})
                                    .send({"res" : "1", "msg" : result[0].user_profile});

                                } else {
                                    res.send({"res" : "0", "msg" : "JWT not verified"})
                                }
                                
                            } else {
                                res.send({"res" : "0", "msg" : "Invalid password"});
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
})

server.get("/facebook-redirect", (req,res) =>{

    res.redirect(facebook.getRedirectUrl());
    // res.redirect(`https://www.facebook.com/v9.0/dialog/oauth?client_id=${process.env.FACEBOOK_ID}&redirect_uri=http://localhost:8888/facebookLogin&state=${crypto.randomBytes(16)}&scope=email`)
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
                    const sql = "SELECT * FROM usersFacebook WHERE email = ?"; //Select siempre devuelve un array, y cuidado con el like, si hay un correo que lo contiene te entran
                    DBconnection.query(sql, [email], (err, result) => {

                        if (err){
                            throw err;
                        } else if (result.length){

                                //Generate JWT
                                const Payload = {
                                    "usrIdF" : result[0].usrid,
                                    "name" : result[0].name,
                                    "email" : result[0].email,
                                    "iat" : new Date()
                                };

                                const jwt = JWT.generateJWT(Payload);
                                const jwtVerified = JWT.verifyJWT(jwt);

                                if(jwtVerified){

                                    //Access as administrator
                                res.cookie("JWT", jwt, {"httpOnly" : true})
                                    .send({"res" : "1", "msg" : `${result[0].name} has been found in usersFacebook logged in with facebook`});

                                } else {
                                    res.send({"res" : "0", "msg" : "JWT not verified"})
                                }
                                
                            
                        } else {
                            const sql = "INSERT INTO usersFacebook (faceId,name,email) VALUES (?, ?, ?)";
                            DBconnection.query(sql, [id,name,email], err => {

                                if (err){
                                    throw err;
                                } else {

                                    const Payload = {
                                        "userIdF" : id,
                                        "name" : name,
                                        "email" : email,
                                        "iat" : new Date()
                                    };

                                    const jwt = JWT.generateJWT(Payload);
                                    const jwtVerified = JWT.verifyJWT(jwt);

                                    if(jwtVerified){

                                    res.cookie("JWT", jwt, {"httpOnly" : true})
                                        .send({"res" : "1", "msg" : `${name} has been added to usersFacebook and logged in with Facebook`});

                                    } else {
                                        res.send({"res" : "0", "msg" : "JWT not verified"})
                                    }
                                       
                                }
                            });
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
})

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
                        const sql = "SELECT * FROM usersGoogle WHERE email = ?";
                        DBconnection.query(sql, [email], (err, result) => {

                            if (err){
                                throw err;
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

                                const sql = "INSERT INTO usersGoogle (googleId,name,email) VALUES (?, ?, ?)";
                                DBconnection.query(sql, [id,name,email], err => {
                                    if (err){
                                        throw err;
                                    } else {

                                        const Payload = {
                                            "userIdG" : id,
                                            "name" : name,
                                            "email" : email,
                                            "iat" : new Date()
                                        };
    
                                        const jwt = JWT.generateJWT(Payload);
                                        const jwtVerified = JWT.verifyJWT(jwt);
    
                                        if(jwtVerified){
    
                                        //Access as administrator
                                        res.cookie("JWT", jwt, {"httpOnly" : true})
                                            .send({"res" : "1", "msg" : `${name} has been added to DB and logged in with Google`});
    
                                        } else {
                                            res.send({"res" : "0", "msg" : "JWT not verified"})
                                        }
                                    }

                                });
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

        const userInfo = JWT.getJWTInfo(req.cookies);
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




