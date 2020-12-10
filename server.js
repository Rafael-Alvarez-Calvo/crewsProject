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


const validateCredentials = require("./lib/validator.js");

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

server.use(VerifySession);


// const SECRET = crypto.randomBytes(80).toString("hex");
// console.log(SECRET);
const SECRET = process.env.SECRET;

function connectionDB() {
    return mysql.createConnection({
        "host": "localhost",
        "user": "root",
        "password": "root",
        "database": "crewproj"
    });
}

// Funciones middleware
function VerifySession(req, res, next){
    let endpoints = ["/signup", "/login", "/redirectfacebook", "/facebooklogin"];

    //indexOf nos devuelve la posicion en el array de lo que estamos buscando en este caso
    console.log(req.path)
    if(endpoints.indexOf(req.path.toLowerCase()) > -1 || (req.cookies.JWT && verifyJWT(req.cookies.JWT))){
        next()
    } else {
        res.clearCookie("JWT")
        // res.redirect("/")
        res.status(403).send({"res" : "0" , "msg" : "No active session"});
    }

}

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

    res.redirect(`https://www.facebook.com/v9.0/dialog/oauth?client_id=${process.env.FACEBOOK_ID}&redirect_uri=http://localhost:8888/facebookLogin&state=${crypto.randomBytes(16)}&scope=email`)
    // res.redirect(`https://www.facebook.com/v9.0/dialog/oauth?client_id=${process.env.FACEBOOK_ID}&redirect_uri=http://localhost:8888/facebookLogin&state=${crypto.randomBytes(16)}&scope=email,user_birthday,user_gender,user_location`)
});

server.get("/facebookLogin", (req, res) => {
    
    if(req.query.code){

        fetch(`https://graph.facebook.com/v9.0/oauth/access_token?client_id=${process.env.FACEBOOK_ID}&redirect_uri=http://localhost:8888/facebookLogin&client_secret=${process.env.FACEBOOK_SECRET}&code=${req.query.code}`)
        .then(res => res.json())
        .then((data, error) => {
            // console.log(data);
            if(error)
                throw error;
            else if(data.access_token && data.token_type === "bearer"){

                fetch(`https://graph.facebook.com/debug_token?input_token=${data.access_token}&access_token=${process.env.FACEBOOK_ACCESS_TOKEN}`)
                .then(res => res.json())
                .then(({data}, error) =>{
                    // console.log(data);
                    const {app_id, application, is_valid, user_id} = data;
                    if(error)
                        throw error;
                    else if(app_id === `${process.env.FACEBOOK_ID}` && application === "crewsProject" && is_valid !== false && user_id){
                        fetch(`https://graph.facebook.com/${user_id}?fields=id,email,name&access_token=${process.env.FACEBOOK_ACCESS_TOKEN}`)
                        .then(res => res.json())
                        .then((data,error) =>{
                            console.log(data);
                        })
                    } else {
                        res.send({"res" : "0", "msg" : error})
                    }

                })

            } else {
                res.send({"res" : "0", "msg" : "Invalid Token"})
            }
            
        })

    } else {
        res.send({"res" : "0", "msg" : req.query.error_description})
    }

})


// curl -X GET "https://graph.facebook.com/oauth/access_token?client_id=207085617539877&client_secret=f21d97149d35e9027f2c658d8cf24076&grant_type=client_credentials"

server.listen(listeningPort);




