//------------------ MODULES -------------------//
const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const corsEnable = require("cors");
const cookieParser = require("cookie-parser");
const fetch = require("node-fetch");
const dotenv = require("dotenv").config();
const crypto = require("crypto");


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

server.listen(listeningPort);


// const SECRET = crypto.randomBytes(80).toString("hex");
// console.log(SECRET);
const SECRET = process.env.SECRET;

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
    const decodedString = base64.decode(base64String); //PORQUE HAY QUE DECODEARLO
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



