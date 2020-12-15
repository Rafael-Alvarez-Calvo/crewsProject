CREATE DATABASE IF NOT EXISTS crewProj;
USE crewProj;

SELECT * FROM users;
SELECT * FROM usersFacebook;
SELECT * FROM usersGoogle;
DROP DATABASE crewProj;

DROP TABLE usersFacebook;
DROP TABLE usersGoogle;
DELETE FROM usersGoogle WHERE email = 'ezokrafita2@gmail.com'; 

CREATE TABLE IF NOT EXISTS users (
	usrid smallint NOT NULL AUTO_INCREMENT,
    email varchar(100) NOT NULL,
    psw varchar(100) NOT NULL,
    `user_profile` varchar(5) NOT NULL DEFAULT 'user',
    PRIMARY KEY(usrid)
);

CREATE TABLE IF NOT EXISTS usersFacebook (
	`usrid` smallint NOT NULL AUTO_INCREMENT,
    `faceId` varchar(100) NOT NULL,
    `email` varchar(100) NOT NULL,
    `name` varchar(100) NOT NULL,
    `user_profile` varchar(5) NOT NULL DEFAULT 'user',
    PRIMARY KEY(usrid)
);

CREATE TABLE IF NOT EXISTS usersGoogle (
	`usrid` smallint NOT NULL AUTO_INCREMENT,
    `googleId` varchar(100) NOT NULL,
    `email` varchar(100) NOT NULL,
    `name` varchar(100) NOT NULL,
    `user_profile` varchar(5) NOT NULL DEFAULT 'user',
    PRIMARY KEY(usrid)
);

INSERT INTO users VALUES(1,'admin', 'admin','admin');