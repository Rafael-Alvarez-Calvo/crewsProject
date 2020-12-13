CREATE DATABASE IF NOT EXISTS crewProj;
USE crewProj;

SELECT * FROM users;
SELECT * FROM usersFacebook;
DROP DATABASE crewProj;

DROP TABLE usersFacebook;



CREATE TABLE IF NOT EXISTS users (
	usrid smallint NOT NULL AUTO_INCREMENT,
    email varchar(100) NOT NULL,
    psw varchar(100) NOT NULL,
    `user_profile` varchar(5) NOT NULL DEFAULT 'user',
    PRIMARY KEY(USRID)
);

CREATE TABLE IF NOT EXISTS usersFacebook (
	`usrid` smallint NOT NULL AUTO_INCREMENT,
    `faceId` varchar(100) NOT NULL,
    `email` varchar(100) NOT NULL,
    `name` varchar(100) NOT NULL,
    `user_profile` varchar(5) NOT NULL DEFAULT 'user',
    PRIMARY KEY(USRID)
);

