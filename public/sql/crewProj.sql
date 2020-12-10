CREATE DATABASE IF NOT EXISTS crewProj;
USE crewProj;

CREATE TABLE IF NOT EXISTS users (
	usrid smallint NOT NULL AUTO_INCREMENT,
    email varchar(100) NOT NULL,
    pass varchar(100) NOT NULL,
    PRIMARY KEY(USRID)
);