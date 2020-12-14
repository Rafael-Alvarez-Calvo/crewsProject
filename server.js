//------------------ MODULES -------------------//
const express = require("express");
const base64 = require("base-64");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const corsEnable = require("cors");
const cookieParser = require("cookie-parser");
const fetch = require("node-fetch");
const dotenv = require("dotenv").config();
const crypto = require("crypto");
const Facebook = require("./lib/OauthFacebook");
const facebook = new Facebook();


const validateCredentials = require("./lib/validator.js");
const validateEmail = require("./lib/validator.js")

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


//Setting public directories
server.use(express.static("./../public"));

// server.use(VerifySession);


// const SECRET = crypto.randomBytes(80).toString("hex");
// console.log(SECRET);
const SECRET = process.env.SECRET;

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
//     let endpoints = ["/signup", "/login", "/redirectfacebook", "/facebooklogin"];

//     //indexOf nos devuelve la posicion en el array de lo que estamos buscando en este caso
//     console.log(req.path)
//     if(endpoints.indexOf(req.path.toLowerCase()) > -1 || (req.cookies.JWT && verifyJWT(req.cookies.JWT))){
//         next()
//     } else {
//         res.clearCookie("JWT")
//         // res.redirect("/")
//         res.status(403).send({"res" : "0" , "msg" : "No active session"});
//     }

// }

//FUNCIONES JWT
function parseBase64(base64String) {

    const parsedString = base64String.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_").toString("base64");
    //Reemplazamos el = + \  que pueda contener nuestro string y los sustituimos por sin espacio - _ respectivamente  
    return parsedString;
}
function encodeBase64(string) {
    const encodedString = base64.encode(string); //encodeamos nuestro string en base64
    const parsedString = parseBase64(encodedString); //parseamos nuestro string en base64
    return parsedString;
}

function decodeBase64(base64String) {
    const decodedString = base64.decode(base64String); //Se decodifica para ver el interior del payload
    return decodedString;
}

function hash(string, key = SECRET) {
    const hashedString = parseBase64(crypto.createHmac("sha256", key).update(string).digest("base64"));
    //debemos hashear nuestro parseado
    //hmac es un algoritmo de hashing combinado con una contraseña
    return hashedString;
}

function generateJWT(Payload) {
    const header = {
        "alg": "HS256", //esto es obligatorio que coincida con el hash?
        "typ": "JWT"
    };

    const base64Header = encodeBase64(JSON.stringify(header));
    const base64Payload = encodeBase64(JSON.stringify(Payload));
    const signature = parseBase64(hash(`${base64Header}.${base64Payload}`));

    const JWT = `${base64Header}.${base64Payload}.${signature}`;
    return JWT;
}

function verifyJWT(jwt) {
    const [header, payload, signature] = jwt.split(".");
    if (header && payload && signature) {
        const expectedSignature = parseBase64(hash(`${header}.${payload}`));
        if (expectedSignature === signature)
            return true;
    }
    console.log("No")
    return false;
}

function getJWTInfo(jwt) {
    const payload = jwt.split(".")[1];
    if (payload) {
        try {
            const data = JSON.parse(decodeBase64(payload));
            return data;
        }
        catch (e) {
            return null;
        }
    }
    return null;
}

function encryptPassword(string, salt = crypto.randomBytes(128).toString("hex")) {
    let saltedPassword = hash(salt + string + salt, SECRET);
    return { password: saltedPassword, salt };
}

function verifyPassword(string, realPassword) {
    return encryptPassword(string, realPassword.salt).password === realPassword.password;

}

//------------ENDPOINTS--------------------//

server.post("/SignUp", (req,res) =>{

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
                    DBconnection.query(sql, [req.body.email], function (err, result) {
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

                                const jwt = generateJWT(Payload);
                                const jwtVerified = verifyJWT(jwt);

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

server.get("/redirectFacebook", (req,res) =>{

    res.redirect(facebook.getRedirectUrl());
    // res.redirect(`https://www.facebook.com/v9.0/dialog/oauth?client_id=${process.env.FACEBOOK_ID}&redirect_uri=http://localhost:8888/facebookLogin&state=${crypto.randomBytes(16)}&scope=email`)
});

server.get("/facebookLogin", async (req, res) => {

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
                    const sql = "SELECT usrid, faceId, name, email, user_profile FROM usersFacebook WHERE faceId = ? AND email = ? AND name = ?"; //Select siempre devuelve un array, y cuidado con el like, si hay un correo que lo contiene te entran
                    DBconnection.query(sql, [id, email, name], (err, result) => {

                        if (err){
                            throw err;
                        } else if (result.length){

                                //Generate JWT
                                const Payload = {
                                    "usrid" : result[0].usrid,
                                    "name" : result[0].name,
                                    "email" : result[0].email,
                                    "profile" : result[0].user_profile,
                                    "iat" : new Date()
                                };

                                const jwt = generateJWT(Payload);
                                const jwtVerified = verifyJWT(jwt);

                                if(jwtVerified){

                                    //Access as administrator
                                res.cookie("JWT", jwt, {"httpOnly" : true})
                                    .send({"res" : "1", "msg" : result[0].user_profile});

                                } else {
                                    res.send({"res" : "0", "msg" : "JWT not verified"})
                                }
                                
                            
                        } else {
                            const sql = "INSERT INTO usersFacebook (faceId,name,email) VALUES (?, ?, ?)";
                            DBconnection.query(sql, [id,name,email], err => {

                                console.log(result);
                                if (err){
                                    throw err;
                                } else {

                                    const sql = "SELECT usrid, faceId, name, email, user_profile FROM usersFacebook WHERE faceId = ? AND email = ? AND name = ?"; //Select siempre devuelve un array, y cuidado con el like, si hay un correo que lo contiene te entran
                                    DBconnection.query(sql, [id, email, name], (err, result) => {

                                        if (err){
                                            throw err;
                                        } else {
                                            
                                            const Payload = {
                                                "userid" : result[0].userid,
                                                "name" : result[0].name,
                                                "email" : result[0].email,
                                                "profile" : result[0].user_profile,
                                                "iat" : new Date()
                                            };
        
                                            const jwt = generateJWT(Payload);
                                            const jwtVerified = verifyJWT(jwt);
        
                                            if(jwtVerified){
        
                                            //Access as administrator
                                            res.cookie("JWT", jwt, {"httpOnly" : true})
                                                .send({"res" : "1", "msg" : "User registered"});
        
                                            } else {
                                                res.send({"res" : "0", "msg" : "JWT not verified"})
                                            }
                                        }
                                    
                                    });

                                }
                                DBconnection.end();
                            });
                        }
                        DBconnection.end();
                    });
                })
                .catch((e) => {
                    
                    res.send({"res" : "0", "msg" : "Unable to connect to database", e});
                });
            }

        } else {

            res.send({"res" : "0", "msg" : "Error in credentials"})
        }
    } else {
        res.send({"res" : "0", "msg" : "Left credentials"})
    }
})

server.get("searchproducts/:search", (req,res) =>{

    if(req.params.search){
        fetch(`https://world.openfoodfacts.org/cgi/search.pl?action=process&tagtype_0=categories&tag_contains_0=contains&tag_0=${req.params.search}`)
        .then(res => res.json())
        .then(data =>{
            console.log(data)
        })
    }
})

server.listen(listeningPort);




